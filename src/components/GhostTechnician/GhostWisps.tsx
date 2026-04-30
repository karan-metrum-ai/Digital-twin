/**
 * GhostWisps
 *
 * Small upward-drifting particle field that emits during the ghost's
 * spawn and despawn windows. Cheap: a single THREE.Points with a fixed
 * pool of vertices and a custom additive material. No allocations per
 * frame.
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GHOST_COLORS } from './ghostMaterial';

export interface GhostWispsProps {
    /**
     * 'spawn'   = emit particles drifting upward, ramping down over `duration`
     * 'despawn' = emit a denser burst that fades with the body
     * 'idle'    = no emission, existing particles continue to age out
     */
    mode: 'spawn' | 'despawn' | 'idle';
    /** Master opacity multiplier so wisps follow the body's fade. */
    opacity?: number;
    /** Seconds the spawn/despawn emission window stays open. */
    duration?: number;
    /** Approximate vertical extent of the body (used for emit volume). */
    bodyHeight?: number;
}

const POOL = 24;

interface Slot {
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    age: number;
    life: number;
    alive: boolean;
}

export function GhostWisps({
    mode,
    opacity = 1,
    duration = 1.2,
    bodyHeight = 1.7,
}: GhostWispsProps) {
    const pointsRef = useRef<THREE.Points>(null);
    const geomRef = useRef<THREE.BufferGeometry>(null);

    const positions = useMemo(() => new Float32Array(POOL * 3), []);
    const alphas = useMemo(() => new Float32Array(POOL), []);
    const slots = useMemo<Slot[]>(
        () =>
            Array.from({ length: POOL }, () => ({
                pos: new THREE.Vector3(),
                vel: new THREE.Vector3(),
                age: 0,
                life: 1,
                alive: false,
            })),
        []
    );

    const cursor = useRef(0);
    const emitTimerRef = useRef(0);
    const modeStartRef = useRef<number | null>(null);
    const lastModeRef = useRef<typeof mode | null>(null);

    const material = useMemo(() => {
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: GHOST_COLORS.rim.clone() },
                uMaster: { value: opacity },
                uSize: { value: 32 },
            },
            vertexShader: /* glsl */ `
                attribute float aAlpha;
                varying float vAlpha;
                uniform float uSize;
                void main() {
                    vAlpha = aAlpha;
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = uSize * (1.0 / max(0.01, -mv.z));
                    gl_Position = projectionMatrix * mv;
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec3 uColor;
                uniform float uMaster;
                varying float vAlpha;
                void main() {
                    vec2 c = gl_PointCoord - vec2(0.5);
                    float d = length(c);
                    float disc = smoothstep(0.5, 0.0, d);
                    float a = disc * vAlpha * uMaster;
                    if (a < 0.01) discard;
                    gl_FragColor = vec4(uColor, a);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
        });
        return mat;
    }, [opacity]);

    useEffect(() => () => {
        material.dispose();
    }, [material]);

    // Keep master opacity uniform in sync without recreating the material.
    useEffect(() => {
        material.uniforms.uMaster.value = opacity;
    }, [material, opacity]);

    useFrame((_, dt) => {
        if (lastModeRef.current !== mode) {
            modeStartRef.current = 0;
            lastModeRef.current = mode;
        }
        if (modeStartRef.current !== null) {
            modeStartRef.current += dt;
        }

        const elapsed = modeStartRef.current ?? 0;
        const emitting = (mode === 'spawn' || mode === 'despawn') && elapsed < duration;

        // Emission rate: fairly dense for despawn, gentler for spawn.
        const emitPerSec = mode === 'despawn' ? 28 : 18;
        if (emitting) {
            emitTimerRef.current += dt;
            const interval = 1 / emitPerSec;
            while (emitTimerRef.current >= interval) {
                emitTimerRef.current -= interval;
                const slot = slots[cursor.current];
                cursor.current = (cursor.current + 1) % POOL;
                // Spawn around a vertical cylinder centered on the body.
                const angle = Math.random() * Math.PI * 2;
                const radius = 0.18 + Math.random() * 0.14;
                slot.pos.set(
                    Math.cos(angle) * radius,
                    Math.random() * bodyHeight,
                    Math.sin(angle) * radius
                );
                slot.vel.set(
                    (Math.random() - 0.5) * 0.12,
                    0.35 + Math.random() * 0.45,
                    (Math.random() - 0.5) * 0.12
                );
                slot.age = 0;
                slot.life = 0.7 + Math.random() * 0.6;
                slot.alive = true;
            }
        }

        // Update pool.
        for (let i = 0; i < POOL; i++) {
            const s = slots[i];
            const i3 = i * 3;
            if (!s.alive) {
                alphas[i] = 0;
                positions[i3] = 0;
                positions[i3 + 1] = -9999;
                positions[i3 + 2] = 0;
                continue;
            }
            s.age += dt;
            const k = s.age / s.life;
            if (k >= 1) {
                s.alive = false;
                alphas[i] = 0;
                positions[i3 + 1] = -9999;
                continue;
            }
            // Integrate, with a little drag.
            s.pos.addScaledVector(s.vel, dt);
            s.vel.multiplyScalar(Math.max(0, 1 - dt * 0.6));
            // Fade in fast, out slow.
            const fadeIn = Math.min(1, k * 6);
            const fadeOut = 1 - k;
            alphas[i] = fadeIn * fadeOut * 0.85;
            positions[i3] = s.pos.x;
            positions[i3 + 1] = s.pos.y;
            positions[i3 + 2] = s.pos.z;
        }

        const geom = geomRef.current;
        if (geom) {
            (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
            (geom.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
        }
    });

    return (
        <points ref={pointsRef} renderOrder={11} frustumCulled={false}>
            <bufferGeometry ref={geomRef}>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                    count={POOL}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-aAlpha"
                    args={[alphas, 1]}
                    count={POOL}
                    itemSize={1}
                />
            </bufferGeometry>
            <primitive object={material} attach="material" />
        </points>
    );
}
