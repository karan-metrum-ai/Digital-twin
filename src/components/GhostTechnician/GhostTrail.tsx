/**
 * GhostTrail
 *
 * A motion trail that drops fading instanced "echo" sprites behind the ghost
 * as it moves. Cheap: a single InstancedMesh capped at MAX_TRAIL instances.
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const MAX_TRAIL = 24;

export interface GhostTrailProps {
    /** World-space ref the trail will sample from each frame. */
    sourceRef: React.RefObject<THREE.Object3D | null>;
    /** Color of the trail particles. */
    color?: string;
    /** Vertical offset above the source origin for the trail center. */
    yOffset?: number;
    /** Min distance the source must travel before a new echo is dropped. */
    spawnDistance?: number;
    /** How fast each echo fades, in 1/seconds. */
    fadeRate?: number;
}

export function GhostTrail({
    sourceRef,
    color = '#7df9ff',
    yOffset = 0.9,
    spawnDistance = 0.15,
    fadeRate = 1.4,
}: GhostTrailProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const tmp = useMemo(() => new THREE.Object3D(), []);
    const lastPos = useRef(new THREE.Vector3());
    const echoes = useRef<{ pos: THREE.Vector3; age: number; alive: boolean }[]>(
        Array.from({ length: MAX_TRAIL }, () => ({
            pos: new THREE.Vector3(),
            age: 0,
            alive: false,
        }))
    );
    const cursor = useRef(0);

    const material = useMemo(
        () =>
            new THREE.MeshBasicMaterial({
                color: new THREE.Color(color),
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                toneMapped: false,
            }),
        [color]
    );

    const geometry = useMemo(() => new THREE.SphereGeometry(0.08, 10, 8), []);

    useEffect(() => () => {
        material.dispose();
        geometry.dispose();
    }, [material, geometry]);

    useFrame((_, dt) => {
        const src = sourceRef.current;
        const mesh = meshRef.current;
        if (!src || !mesh) return;

        const cur = src.getWorldPosition(new THREE.Vector3());
        cur.y += yOffset;

        if (cur.distanceTo(lastPos.current) >= spawnDistance) {
            const slot = echoes.current[cursor.current];
            slot.pos.copy(cur);
            slot.age = 0;
            slot.alive = true;
            cursor.current = (cursor.current + 1) % MAX_TRAIL;
            lastPos.current.copy(cur);
        }

        for (let i = 0; i < MAX_TRAIL; i++) {
            const e = echoes.current[i];
            if (!e.alive) {
                tmp.position.set(0, -9999, 0);
                tmp.scale.setScalar(0.0001);
            } else {
                e.age += dt * fadeRate;
                const life = Math.max(0, 1 - e.age);
                if (life <= 0) {
                    e.alive = false;
                    tmp.position.set(0, -9999, 0);
                    tmp.scale.setScalar(0.0001);
                } else {
                    tmp.position.copy(e.pos);
                    tmp.scale.setScalar(0.4 + (1 - life) * 0.8);
                }
            }
            tmp.updateMatrix();
            mesh.setMatrixAt(i, tmp.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometry, material, MAX_TRAIL]}
            frustumCulled={false}
            renderOrder={9}
        />
    );
}
