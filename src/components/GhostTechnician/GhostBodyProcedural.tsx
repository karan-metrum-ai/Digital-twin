/**
 * Pure-geometry humanoid body — used as a fallback when the GLB model
 * fails to load. Stands perfectly upright at the origin in a neutral
 * pose, no idle motion. The real GhostBody drives the rigged model;
 * this is just a "the world is on fire" safety net.
 */

import { forwardRef } from 'react';
import * as THREE from 'three';
import type { GhostMaterial } from './ghostMaterial';

interface Props {
    material: GhostMaterial;
}

export const GhostBodyProcedural = forwardRef<THREE.Group, Props>(
    function GhostBodyProcedural({ material }, ref) {
        return (
            <group ref={ref}>
                <mesh position={[0, 1.65, 0]} material={material}>
                    <sphereGeometry args={[0.16, 24, 18]} />
                </mesh>
                <mesh position={[0, 1.15, 0]} material={material}>
                    <capsuleGeometry args={[0.18, 0.45, 8, 16]} />
                </mesh>
                <mesh position={[0, 0.7, 0]} material={material}>
                    <capsuleGeometry args={[0.16, 0.18, 8, 16]} />
                </mesh>
                <mesh position={[-0.09, 0.32, 0]} material={material}>
                    <capsuleGeometry args={[0.07, 0.5, 6, 12]} />
                </mesh>
                <mesh position={[0.09, 0.32, 0]} material={material}>
                    <capsuleGeometry args={[0.07, 0.5, 6, 12]} />
                </mesh>
                <mesh position={[-0.28, 1.2, 0]} material={material}>
                    <capsuleGeometry args={[0.06, 0.5, 6, 12]} />
                </mesh>
                <mesh position={[0.28, 1.2, 0]} material={material}>
                    <capsuleGeometry args={[0.06, 0.5, 6, 12]} />
                </mesh>
            </group>
        );
    }
);
