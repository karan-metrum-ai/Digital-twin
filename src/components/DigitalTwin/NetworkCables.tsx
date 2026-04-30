/**
 * NetworkCables Component
 *
 * Renders network cable infrastructure in the 3D data center:
 * - Overhead cable trays running along rack rows
 * - Cross-row cable trays connecting rows
 * - Individual cables with realistic sag (catenary curves) — merged into one mesh
 * - Vertical cable drops from trays to racks
 * - Server-to-server connections between adjacent racks
 * - Uniform light grey wire material (one shared material for lower GPU load)
 */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Rack3D } from './types';

const TRAY_BOTTOM_MAT = new THREE.MeshStandardMaterial({
    color: '#3a3a3a',
    metalness: 0.7,
    roughness: 0.3,
});
const TRAY_SIDE_MAT = new THREE.MeshStandardMaterial({
    color: '#444',
    metalness: 0.6,
    roughness: 0.3,
});

/** Reused tray parts (scaled per instance). */
const TRAY_UNIT_BOTTOM = new THREE.BoxGeometry(1, 0.02, 1);
const TRAY_UNIT_SIDE = new THREE.BoxGeometry(1, 0.06, 0.02);

/** Single material for all cable tubes — light grey so wires read clearly in the UI. */
const CABLE_WIRE_MAT = new THREE.MeshStandardMaterial({
    color: '#9ca3af',
    roughness: 0.55,
    metalness: 0.08,
    envMapIntensity: 0.55,
});

interface NetworkCablesProps {
    racks: Rack3D[];
}

/** Numeric endpoints for building merged cable geometry. */
interface CableSpec {
    ax: number;
    ay: number;
    az: number;
    bx: number;
    by: number;
    bz: number;
    thickness?: number;
    sag?: number;
}

const TUBE_TUBULAR = 6;
const TUBE_RADIAL = 3;
const PATH_SEGMENTS = 8;

function createCableTubeGeometry({
    ax,
    ay,
    az,
    bx,
    by,
    bz,
    thickness = 0.015,
    sag = 0.2,
}: CableSpec): THREE.BufferGeometry {
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= PATH_SEGMENTS; i++) {
        const t = i / PATH_SEGMENTS;
        const x = ax + (bx - ax) * t;
        const z = az + (bz - az) * t;
        const sagAmount = sag * Math.sin(Math.PI * t);
        const y = ay + (by - ay) * t - sagAmount;
        points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, TUBE_TUBULAR, thickness, TUBE_RADIAL, false);
}

function buildCableSpecs(
    racks: Rack3D[],
    trayHeight: number,
    corridorLength: number
): CableSpec[] {
    const specs: CableSpec[] = [];
    const rowARacks = racks.filter((r) => r.row_name === 'Row A');
    const rowBRacks = racks.filter((r) => r.row_name === 'Row B');

    for (const offset of [-0.12, -0.06, 0, 0.06, 0.12]) {
        specs.push({
            ax: -corridorLength / 2,
            ay: trayHeight + 0.06,
            az: -3.2 + offset,
            bx: corridorLength / 2,
            by: trayHeight + 0.06,
            bz: -3.2 + offset,
            thickness: 0.015,
            sag: 0.15,
        });
    }

    for (const offset of [-0.12, -0.06, 0, 0.06, 0.12]) {
        specs.push({
            ax: -corridorLength / 2,
            ay: trayHeight + 0.06,
            az: 3.2 + offset,
            bx: corridorLength / 2,
            by: trayHeight + 0.06,
            bz: 3.2 + offset,
            thickness: 0.015,
            sag: 0.15,
        });
    }

    for (const xPos of [-6, -3, 0, 3, 6]) {
        for (const offset of [-0.08, 0, 0.08]) {
            specs.push({
                ax: xPos + offset,
                ay: trayHeight + 0.06,
                az: -3.2,
                bx: xPos + offset,
                by: trayHeight + 0.06,
                bz: 3.2,
                thickness: 0.012,
                sag: 0.18,
            });
        }
    }

    for (const rack of rowARacks.filter((_, idx) => idx % 2 === 0)) {
        const rackX = rack.position[0];
        const rackTopY = rack.position[1] + 0.9;
        for (const offset of [-0.06, 0.06]) {
            specs.push({
                ax: rackX + offset,
                ay: trayHeight,
                az: -3.2,
                bx: rackX + offset,
                by: rackTopY,
                bz: rack.position[2] - 0.3,
                thickness: 0.012,
                sag: 0.08,
            });
        }
    }

    for (const rack of rowBRacks.filter((_, idx) => idx % 2 === 0)) {
        const rackX = rack.position[0];
        const rackTopY = rack.position[1] + 0.9;
        for (const offset of [-0.06, 0.06]) {
            specs.push({
                ax: rackX + offset,
                ay: trayHeight,
                az: 3.2,
                bx: rackX + offset,
                by: rackTopY,
                bz: rack.position[2] + 0.3,
                thickness: 0.012,
                sag: 0.08,
            });
        }
    }

    const rowAConn = rowARacks
        .slice(0, -1)
        .filter((_, idx) => idx % 3 === 0)
        .flatMap((rack) => {
            const nextRack = rowARacks[rowARacks.indexOf(rack) + 1];
            if (!nextRack) return [];

            return [8, 14].map((uPos) => {
                const y = rack.position[1] - 0.6 + uPos * 0.076;
                const z = rack.position[2] - 0.48;
                return {
                    ax: rack.position[0] + 0.35,
                    ay: y,
                    az: z,
                    bx: nextRack.position[0] - 0.35,
                    by: y,
                    bz: z,
                    thickness: 0.008,
                    sag: 0.06,
                } satisfies CableSpec;
            });
        });
    specs.push(...rowAConn);

    const rowBConn = rowBRacks
        .slice(0, -1)
        .filter((_, idx) => idx % 3 === 0)
        .flatMap((rack) => {
            const nextRack = rowBRacks[rowBRacks.indexOf(rack) + 1];
            if (!nextRack) return [];

            return [8, 14].map((uPos) => {
                const y = rack.position[1] - 0.6 + uPos * 0.076;
                const z = rack.position[2] + 0.48;
                return {
                    ax: rack.position[0] + 0.35,
                    ay: y,
                    az: z,
                    bx: nextRack.position[0] - 0.35,
                    by: y,
                    bz: z,
                    thickness: 0.008,
                    sag: 0.06,
                } satisfies CableSpec;
            });
        });
    specs.push(...rowBConn);

    return specs;
}

interface CableTrayProps {
    position: [number, number, number];
    length: number;
    width?: number;
    rotation?: [number, number, number];
}

function CableTray({
    position,
    length,
    width = 0.3,
    rotation = [0, 0, 0],
}: CableTrayProps) {
    return (
        <group position={position} rotation={rotation}>
            <mesh scale={[length, 1, width]} geometry={TRAY_UNIT_BOTTOM}>
                <primitive object={TRAY_BOTTOM_MAT} attach="material" />
            </mesh>
            <mesh
                position={[0, 0.04, width / 2 - 0.01]}
                scale={[length, 1, 1]}
                geometry={TRAY_UNIT_SIDE}
            >
                <primitive object={TRAY_SIDE_MAT} attach="material" />
            </mesh>
            <mesh
                position={[0, 0.04, -width / 2 + 0.01]}
                scale={[length, 1, 1]}
                geometry={TRAY_UNIT_SIDE}
            >
                <primitive object={TRAY_SIDE_MAT} attach="material" />
            </mesh>
        </group>
    );
}

export function NetworkCables({ racks }: NetworkCablesProps) {
    const trayHeight = 2.0;
    const CORRIDOR_LENGTH = 18;

    const mergedCableGeometry = useMemo(() => {
        const specs = buildCableSpecs(racks, trayHeight, CORRIDOR_LENGTH);
        const parts = specs.map((s) => createCableTubeGeometry(s));
        if (parts.length === 0) return null;
        const merged = mergeGeometries(parts);
        for (const p of parts) p.dispose();
        return merged;
    }, [racks]);

    useEffect(() => {
        return () => {
            mergedCableGeometry?.dispose();
        };
    }, [mergedCableGeometry]);

    return (
        <group>
            <CableTray
                position={[0, trayHeight, -3.2]}
                length={CORRIDOR_LENGTH}
                width={0.5}
            />
            <CableTray
                position={[0, trayHeight, 3.2]}
                length={CORRIDOR_LENGTH}
                width={0.5}
            />

            {[-6, -3, 0, 3, 6].map((xPos, i) => (
                <CableTray
                    key={`cross-tray-${i}`}
                    position={[xPos, trayHeight, 0]}
                    length={7}
                    width={0.4}
                    rotation={[0, Math.PI / 2, 0]}
                />
            ))}

            {mergedCableGeometry && (
                <mesh geometry={mergedCableGeometry} material={CABLE_WIRE_MAT} />
            )}
        </group>
    );
}

export default NetworkCables;
