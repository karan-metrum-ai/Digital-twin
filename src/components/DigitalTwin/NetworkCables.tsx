/**
 * NetworkCables Component
 *
 * Renders network cable infrastructure in the 3D data center:
 * - Overhead cable trays running along rack rows
 * - Cross-row cable trays connecting rows
 * - Individual cables with realistic sag (catenary curves)
 * - Vertical cable drops from trays to racks
 * - Server-to-server connections between adjacent racks
 * - Color-coded cable types (fiber, ethernet, power, etc.)
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { Rack3D } from './types';

interface NetworkCablesProps {
    racks: Rack3D[];
}

interface CableProps {
    start: THREE.Vector3;
    end: THREE.Vector3;
    color?: string;
    thickness?: number;
    sag?: number;
}

function Cable({
    start,
    end,
    color = '#ff6600',
    thickness = 0.015,
    sag = 0.2,
}: CableProps) {
    const tubeGeometry = useMemo(() => {
        const points: THREE.Vector3[] = [];
        const segments = 20;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = start.x + (end.x - start.x) * t;
            const z = start.z + (end.z - start.z) * t;
            // Parabolic sag - cables hang down
            const sagAmount = sag * Math.sin(Math.PI * t);
            const y = start.y + (end.y - start.y) * t - sagAmount;

            points.push(new THREE.Vector3(x, y, z));
        }

        const curve = new THREE.CatmullRomCurve3(points);
        return new THREE.TubeGeometry(curve, 20, thickness, 6, false);
    }, [start, end, sag, thickness]);

    return (
        <mesh geometry={tubeGeometry}>
            <meshStandardMaterial
                color={color}
                roughness={0.5}
                metalness={0.2}
            />
        </mesh>
    );
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
            {/* Tray bottom */}
            <mesh>
                <boxGeometry args={[length, 0.02, width]} />
                <meshStandardMaterial
                    color="#3a3a3a"
                    metalness={0.7}
                    roughness={0.3}
                />
            </mesh>
            {/* Tray sides */}
            <mesh position={[0, 0.04, width / 2 - 0.01]}>
                <boxGeometry args={[length, 0.06, 0.02]} />
                <meshStandardMaterial
                    color="#444"
                    metalness={0.6}
                    roughness={0.3}
                />
            </mesh>
            <mesh position={[0, 0.04, -width / 2 + 0.01]}>
                <boxGeometry args={[length, 0.06, 0.02]} />
                <meshStandardMaterial
                    color="#444"
                    metalness={0.6}
                    roughness={0.3}
                />
            </mesh>
        </group>
    );
}

export function NetworkCables({ racks }: NetworkCablesProps) {
    const trayHeight = 2.0;
    const CORRIDOR_LENGTH = 18;

    const cableColors = {
        fiber: '#00aaff',
        ethernet: '#ff6600',
        power: '#ffcc00',
        management: '#00ff88',
        storage: '#ff00ff',
    };

    const rowARacks = racks.filter((r) => r.row_name === 'Row A');
    const rowBRacks = racks.filter((r) => r.row_name === 'Row B');

    return (
        <group>
            {/* Main cable trays along each row */}
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

            {/* Cross cable trays connecting the two rows */}
            {[-6, -3, 0, 3, 6].map((xPos, i) => (
                <CableTray
                    key={`cross-tray-${i}`}
                    position={[xPos, trayHeight, 0]}
                    length={7}
                    width={0.4}
                    rotation={[0, Math.PI / 2, 0]}
                />
            ))}

            {/* Horizontal cables running through Row A tray */}
            {[-0.12, -0.06, 0, 0.06, 0.12].map((offset, i) => (
                <Cable
                    key={`row-a-cable-${i}`}
                    start={new THREE.Vector3(-CORRIDOR_LENGTH / 2, trayHeight + 0.06, -3.2 + offset)}
                    end={new THREE.Vector3(CORRIDOR_LENGTH / 2, trayHeight + 0.06, -3.2 + offset)}
                    color={Object.values(cableColors)[i % 5]}
                    thickness={0.015}
                    sag={0.15}
                />
            ))}

            {/* Horizontal cables running through Row B tray */}
            {[-0.12, -0.06, 0, 0.06, 0.12].map((offset, i) => (
                <Cable
                    key={`row-b-cable-${i}`}
                    start={new THREE.Vector3(-CORRIDOR_LENGTH / 2, trayHeight + 0.06, 3.2 + offset)}
                    end={new THREE.Vector3(CORRIDOR_LENGTH / 2, trayHeight + 0.06, 3.2 + offset)}
                    color={Object.values(cableColors)[i % 5]}
                    thickness={0.015}
                    sag={0.15}
                />
            ))}

            {/* Cross-row cables */}
            {[-6, -3, 0, 3, 6].map((xPos, i) => (
                <group key={`cross-${i}`}>
                    {[-0.08, 0, 0.08].map((offset, j) => (
                        <Cable
                            key={`cross-cable-${i}-${j}`}
                            start={new THREE.Vector3(xPos + offset, trayHeight + 0.06, -3.2)}
                            end={new THREE.Vector3(xPos + offset, trayHeight + 0.06, 3.2)}
                            color={Object.values(cableColors)[(i + j) % 5]}
                            thickness={0.012}
                            sag={0.18}
                        />
                    ))}
                </group>
            ))}

            {/* Vertical cable drops to Row A racks (every 2nd rack to reduce clutter) */}
            {rowARacks.filter((_, idx) => idx % 2 === 0).map((rack, idx) => {
                const rackX = rack.position[0];
                const rackTopY = rack.position[1] + 0.9;

                return (
                    <group key={`drop-a-${idx}`}>
                        {[-0.06, 0.06].map((offset, i) => (
                            <Cable
                                key={`drop-cable-a-${idx}-${i}`}
                                start={new THREE.Vector3(rackX + offset, trayHeight, -3.2)}
                                end={new THREE.Vector3(rackX + offset, rackTopY, rack.position[2] - 0.3)}
                                color={Object.values(cableColors)[i % 5]}
                                thickness={0.012}
                                sag={0.08}
                            />
                        ))}
                    </group>
                );
            })}

            {/* Vertical cable drops to Row B racks */}
            {rowBRacks.filter((_, idx) => idx % 2 === 0).map((rack, idx) => {
                const rackX = rack.position[0];
                const rackTopY = rack.position[1] + 0.9;

                return (
                    <group key={`drop-b-${idx}`}>
                        {[-0.06, 0.06].map((offset, i) => (
                            <Cable
                                key={`drop-cable-b-${idx}-${i}`}
                                start={new THREE.Vector3(rackX + offset, trayHeight, 3.2)}
                                end={new THREE.Vector3(rackX + offset, rackTopY, rack.position[2] + 0.3)}
                                color={Object.values(cableColors)[(i + 2) % 5]}
                                thickness={0.012}
                                sag={0.08}
                            />
                        ))}
                    </group>
                );
            })}

            {/* Server-to-server connections in Row A (every 3rd pair) */}
            {rowARacks.slice(0, -1).filter((_, idx) => idx % 3 === 0).map((rack, idx) => {
                const nextRack = rowARacks[rowARacks.indexOf(rack) + 1];
                if (!nextRack) return null;

                return [8, 14].map((uPos, connIdx) => {
                    const y = rack.position[1] - 0.6 + uPos * 0.076;
                    const z = rack.position[2] - 0.48;

                    return (
                        <Cable
                            key={`server-a-${idx}-${connIdx}`}
                            start={new THREE.Vector3(rack.position[0] + 0.35, y, z)}
                            end={new THREE.Vector3(nextRack.position[0] - 0.35, y, z)}
                            color={Object.values(cableColors)[connIdx % 5]}
                            thickness={0.008}
                            sag={0.06}
                        />
                    );
                });
            })}

            {/* Server-to-server connections in Row B */}
            {rowBRacks.slice(0, -1).filter((_, idx) => idx % 3 === 0).map((rack, idx) => {
                const nextRack = rowBRacks[rowBRacks.indexOf(rack) + 1];
                if (!nextRack) return null;

                return [8, 14].map((uPos, connIdx) => {
                    const y = rack.position[1] - 0.6 + uPos * 0.076;
                    const z = rack.position[2] + 0.48;

                    return (
                        <Cable
                            key={`server-b-${idx}-${connIdx}`}
                            start={new THREE.Vector3(rack.position[0] + 0.35, y, z)}
                            end={new THREE.Vector3(nextRack.position[0] - 0.35, y, z)}
                            color={Object.values(cableColors)[(connIdx + 2) % 5]}
                            thickness={0.008}
                            sag={0.06}
                        />
                    );
                });
            })}
        </group>
    );
}

export default NetworkCables;

