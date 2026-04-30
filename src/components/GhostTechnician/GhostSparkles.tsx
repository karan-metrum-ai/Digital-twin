/**
 * GhostSparkles
 *
 * Tiny particle bursts emitted at the working hand during the press
 * moments of the fix loop. Rendered as a points cloud in the parent
 * group's LOCAL space — works correctly because the group is stationary
 * while fixing.
 *
 * Polls the GhostBody imperative handle for the working hand world
 * position and current press intensity. Bursts are gated by an
 * intensity threshold + a small refractory window so the same press
 * doesn't fire dozens of overlapping bursts.
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GHOST_COLORS } from './ghostMaterial';
import type { GhostBodyRef } from './GhostBody';

const POOL = 18;

interface Slot {
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    age: number;
    life: number;
    alive: boolean;
}

export interface GhostSparklesProps {
    bodyRef: React.RefObject<GhostBodyRef | null>;
    /** Parent group whose local space the sparkles live in. */
    parentRef: React.RefObject<THREE.Object3D | null>;
    /** Master opacity (matches body fade). */
    opacity?: number;
}

export function GhostSparkles({ bodyRef, parentRef, opacity = 1 }: GhostSparklesProps) {
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
    const refractoryRef = useRef(0);
    const tmpWorld = useMemo(() => new THREE.Vector3(), []);
    const tmpLocal = useMemo(() => new THREE.Vector3(), []);
    const invMatrix = useMemo(() => new THREE.Matrix4(), []);

    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                uniforms: {
                    uColor: { value: GHOST_COLORS.core.clone() },
                    uMaster: { value: opacity },
                    uSize: { value: 22 },
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
            }),
        [opacity]
    );

    useEffect(() => () => {
        material.dispose();
    }, [material]);

    useEffect(() => {
        material.uniforms.uMaster.value = opacity;
    }, [material, opacity]);

    useFrame((_, dt) => {
        const body = bodyRef.current;
        const parent = parentRef.current;
        refractoryRef.current = Math.max(0, refractoryRef.current - dt);

        if (body && parent && refractoryRef.current === 0) {
            const intensity = body.getFixPressIntensity();
            if (intensity > 0.55) {
                const handWorld = body.getWorkingHandWorld(tmpWorld);
                if (handWorld) {
                    parent.updateMatrixWorld();
                    invMatrix.copy(parent.matrixWorld).invert();
                    tmpLocal.copy(handWorld).applyMatrix4(invMatrix);
                    // Burst 4-6 small sparkles around the hand point.
                    const n = 4 + Math.floor(Math.random() * 3);
                    for (let i = 0; i < n; i++) {
                        const slot = slots[cursor.current];
                        cursor.current = (cursor.current + 1) % POOL;
                        slot.pos.copy(tmpLocal).add(
                            new THREE.Vector3(
                                (Math.random() - 0.5) * 0.06,
                                (Math.random() - 0.5) * 0.06,
                                (Math.random() - 0.5) * 0.06
                            )
                        );
                        slot.vel.set(
                            (Math.random() - 0.5) * 0.6,
                            (Math.random() - 0.2) * 0.5,
                            (Math.random() - 0.5) * 0.6
                        );
                        slot.age = 0;
                        slot.life = 0.35 + Math.random() * 0.25;
                        slot.alive = true;
                    }
                    // Refractory: at most one burst every ~0.18s while
                    // intensity is high. Avoids visual overload.
                    refractoryRef.current = 0.18;
                }
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
            s.pos.addScaledVector(s.vel, dt);
            s.vel.multiplyScalar(Math.max(0, 1 - dt * 1.4));
            // Fast in, eased out.
            const fadeIn = Math.min(1, k * 8);
            const fadeOut = 1 - k * k;
            alphas[i] = fadeIn * fadeOut;
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
        <points renderOrder={12} frustumCulled={false}>
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
