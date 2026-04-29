/**
 * DataCenterEnvironment Component
 *
 * Renders a realistic data center room based on real hyperscale facility
 * references (Switch SuperNAP, Equinix, Google DC photo galleries):
 *
 *   - Sealed concrete / polished tile floor with subtle grid
 *   - Acoustic-tile ceiling with recessed linear LED troffer panels
 *     (replaces the previous decorative honeycomb hex lights, which
 *      do not exist in real data centers)
 *   - Overhead cable ladder/tray system running above each rack row
 *   - Overhead power bus bar / conduit down the center aisle
 *   - Subtle vertical wall accents (much less neon than before)
 *   - Dell branding on the back wall, region name on the opposite wall
 *
 * Visual aim: photo-real "operational data hall" — moody but clean,
 * not a sci-fi nightclub.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

interface DataCenterEnvironmentProps {
    regionName?: string;
}

/* =====================================================================
 * Recessed troffer LED panel — the single most common modern data
 * center ceiling fixture. A flat rectangular emissive panel set into
 * the ceiling tile grid, with a thin metal frame and a soft cone of
 * light below it. NO bevels, no curves, no logos.
 * ===================================================================== */
function TrofferPanel({
    position,
    width = 1.2,
    length = 2.4,
}: {
    position: [number, number, number];
    width?: number;
    length?: number;
}) {
    return (
        <group position={position}>
            {/* Thin metal frame (slightly bigger than the diffuser) */}
            <mesh position={[0, 0.005, 0]}>
                <boxGeometry args={[length + 0.06, 0.01, width + 0.06]} />
                <meshStandardMaterial
                    color="#cfd3da"
                    metalness={0.85}
                    roughness={0.35}
                />
            </mesh>
            {/* Bright diffuser */}
            <mesh position={[0, -0.005, 0]}>
                <boxGeometry args={[length, 0.02, width]} />
                <meshStandardMaterial
                    color="#ffffff"
                    emissive="#ffffff"
                    emissiveIntensity={4.2}
                    toneMapped={false}
                />
            </mesh>
            {/* Soft directional light cast downward from each panel */}
            <pointLight
                position={[0, -0.4, 0]}
                intensity={3.2}
                distance={9}
                color="#f5faff"
                decay={1.6}
            />
        </group>
    );
}

/* =====================================================================
 * Overhead cable ladder/tray — open ladder-style cable management,
 * exactly what you see suspended above every rack row in real data
 * centers. Two long side rails with regular cross-rungs, painted
 * matte black or grey. Optionally we draw a few bundled cables
 * resting in the tray.
 * ===================================================================== */
function CableTray({
    position,
    length,
    width = 0.45,
}: {
    position: [number, number, number];
    length: number;
    width?: number;
}) {
    const RUNG_SPACING = 0.25;
    const rungCount = Math.floor(length / RUNG_SPACING);

    const railMat = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: '#3a3d44',
                metalness: 0.7,
                roughness: 0.45,
            }),
        []
    );

    const rungs = useMemo(() => {
        const arr: number[] = [];
        const span = (rungCount - 1) * RUNG_SPACING;
        const start = -span / 2;
        for (let i = 0; i < rungCount; i++) arr.push(start + i * RUNG_SPACING);
        return arr;
    }, [rungCount]);

    return (
        <group position={position}>
            {/* Two side rails */}
            <mesh position={[0, 0, -width / 2]} material={railMat}>
                <boxGeometry args={[length, 0.06, 0.04]} />
            </mesh>
            <mesh position={[0, 0, width / 2]} material={railMat}>
                <boxGeometry args={[length, 0.06, 0.04]} />
            </mesh>
            {/* Rungs */}
            {rungs.map((x, i) => (
                <mesh key={i} position={[x, 0, 0]} material={railMat}>
                    <boxGeometry args={[0.025, 0.025, width]} />
                </mesh>
            ))}
            {/* Bundled cables resting in the tray (parallel runs along its length) */}
            <mesh
                position={[0, 0.04, -width * 0.3]}
                rotation={[0, 0, Math.PI / 2]}
            >
                <cylinderGeometry args={[0.025, 0.025, length, 8]} />
                <meshStandardMaterial color="#1f2530" roughness={0.7} metalness={0.1} />
            </mesh>
            <mesh
                position={[0, 0.04, -width * 0.05]}
                rotation={[0, 0, Math.PI / 2]}
            >
                <cylinderGeometry args={[0.022, 0.022, length, 8]} />
                <meshStandardMaterial color="#0d1218" roughness={0.7} metalness={0.1} />
            </mesh>
            <mesh
                position={[0, 0.04, width * 0.2]}
                rotation={[0, 0, Math.PI / 2]}
            >
                <cylinderGeometry args={[0.02, 0.02, length, 8]} />
                <meshStandardMaterial color="#2a4666" roughness={0.6} metalness={0.15} />
            </mesh>
            <mesh
                position={[0, 0.04, width * 0.38]}
                rotation={[0, 0, Math.PI / 2]}
            >
                <cylinderGeometry args={[0.018, 0.018, length, 8]} />
                <meshStandardMaterial color="#3a4a2a" roughness={0.65} metalness={0.1} />
            </mesh>
            {/* Hanger straps every ~2.5m connecting the tray up to the ceiling */}
            {(() => {
                const hangerCount = Math.max(2, Math.floor(length / 2.5));
                const span = length - 1.0;
                const stepX = hangerCount > 1 ? span / (hangerCount - 1) : 0;
                return Array.from({ length: hangerCount }, (_, i) => {
                    const x = -span / 2 + i * stepX;
                return (
                    <group key={`hanger-${i}`} position={[x, 0.4, 0]}>
                        <mesh position={[0, 0, -width / 2]}>
                            <boxGeometry args={[0.02, 0.8, 0.02]} />
                            <meshStandardMaterial
                                color="#5a5e66"
                                metalness={0.7}
                                roughness={0.4}
                            />
                        </mesh>
                        <mesh position={[0, 0, width / 2]}>
                            <boxGeometry args={[0.02, 0.8, 0.02]} />
                            <meshStandardMaterial
                                color="#5a5e66"
                                metalness={0.7}
                                roughness={0.4}
                            />
                        </mesh>
                    </group>
                );
                });
            })()}
        </group>
    );
}

/* =====================================================================
 * Overhead bus bar (busway) — the silver/grey rectangular power
 * channel that runs down the center aisle of nearly every modern
 * data hall, with periodic tap-off boxes feeding power to racks.
 * ===================================================================== */
function PowerBusway({
    position,
    length,
}: {
    position: [number, number, number];
    length: number;
}) {
    const TAP_SPACING = 3;
    const tapCount = Math.max(2, Math.floor(length / TAP_SPACING));

    return (
        <group position={position}>
            {/* Main rectangular busway housing */}
            <mesh>
                <boxGeometry args={[length, 0.18, 0.18]} />
                <meshStandardMaterial
                    color="#9da4ad"
                    metalness={0.85}
                    roughness={0.32}
                />
            </mesh>
            {/* Lower flange — busbar end caps and underside ribs */}
            <mesh position={[0, -0.12, 0]}>
                <boxGeometry args={[length, 0.04, 0.22]} />
                <meshStandardMaterial
                    color="#6e757e"
                    metalness={0.8}
                    roughness={0.4}
                />
            </mesh>
            {/* Tap-off boxes spaced along the run */}
            {Array.from({ length: tapCount }, (_, i) => {
                const span = length - 1.0;
                const stepX = tapCount > 1 ? span / (tapCount - 1) : 0;
                const x = -span / 2 + i * stepX;
                return (
                    <group key={i} position={[x, -0.18, 0]}>
                        {/* Tap-off body */}
                        <mesh>
                            <boxGeometry args={[0.32, 0.16, 0.28]} />
                            <meshStandardMaterial
                                color="#22272f"
                                metalness={0.5}
                                roughness={0.5}
                            />
                        </mesh>
                        {/* Status LED on the tap-off */}
                        <mesh position={[0.16 + 0.001, 0.04, 0]}>
                            <boxGeometry args={[0.005, 0.025, 0.025]} />
                            <meshStandardMaterial
                                color="#3df09a"
                                emissive="#3df09a"
                                emissiveIntensity={2.5}
                                toneMapped={false}
                            />
                        </mesh>
                    </group>
                );
            })}
            {/* Suspension rods up to the ceiling every ~3m */}
            {(() => {
                const rodCount = Math.max(2, Math.floor(length / 3.5));
                const span = length - 1.0;
                const stepX = rodCount > 1 ? span / (rodCount - 1) : 0;
                return Array.from({ length: rodCount }, (_, i) => {
                    const x = -span / 2 + i * stepX;
                    return (
                        <mesh key={`rod-${i}`} position={[x, 0.5, 0]}>
                            <boxGeometry args={[0.025, 1.0, 0.025]} />
                            <meshStandardMaterial
                                color="#6c727b"
                                metalness={0.8}
                                roughness={0.35}
                            />
                        </mesh>
                    );
                });
            })()}
        </group>
    );
}

/**
 * 3D Dell Logo built from real Three.js geometry that physically
 * protrudes from the wall. Uses a torus for the ring and ExtrudeGeometry
 * for the letters, with the "E" rotated like the real Dell mark.
 */
function DellLogo3D({
    position,
    rotation,
    scale = 1,
}: {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
}) {
    const BLUE = '#1f9bff';
    const PROTRUDE = 0.18 * scale;
    const RING_RADIUS = 1.45 * scale;
    const RING_TUBE = 0.085 * scale;

    const material = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: BLUE,
                emissive: BLUE,
                emissiveIntensity: 1.4,
                metalness: 0.6,
                roughness: 0.3,
                toneMapped: false,
            }),
        []
    );

    const dGeometry = useMemo(() => buildLetterD(0.55 * scale, 0.85 * scale, PROTRUDE), [scale, PROTRUDE]);
    const eGeometry = useMemo(() => buildLetterE(0.55 * scale, 0.85 * scale, PROTRUDE), [scale, PROTRUDE]);
    const lGeometry = useMemo(() => buildLetterL(0.55 * scale, 0.85 * scale, PROTRUDE), [scale, PROTRUDE]);

    const letterW = 0.55 * scale;
    const gap = 0.08 * scale;
    const totalW = letterW * 4 + gap * 3;
    const startX = -totalW / 2;
    const xD = startX + letterW / 2;
    const xE = startX + letterW * 1.5 + gap;
    const xL1 = startX + letterW * 2.5 + gap * 2;
    const xL2 = startX + letterW * 3.5 + gap * 3;

    return (
        <group position={position} rotation={rotation}>
            <mesh material={material} castShadow>
                <torusGeometry args={[RING_RADIUS, RING_TUBE, 24, 96]} />
            </mesh>
            <mesh geometry={dGeometry} material={material} position={[xD, 0, 0]} castShadow />
            <mesh
                geometry={eGeometry}
                material={material}
                position={[xE, 0, 0]}
                rotation={[0, 0, (40 * Math.PI) / 180]}
                castShadow
            />
            <mesh geometry={lGeometry} material={material} position={[xL1, 0, 0]} castShadow />
            <mesh geometry={lGeometry} material={material} position={[xL2, 0, 0]} castShadow />
        </group>
    );
}

function buildLetterD(width: number, height: number, depth: number): THREE.ExtrudeGeometry {
    const stroke = width * 0.22;
    const halfW = width / 2;
    const halfH = height / 2;
    const arcRadius = halfH;
    const arcCx = halfW - arcRadius;

    const shape = new THREE.Shape();
    shape.moveTo(-halfW, -halfH);
    shape.lineTo(arcCx, -halfH);
    shape.absarc(arcCx, 0, arcRadius, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(-halfW, halfH);
    shape.lineTo(-halfW, -halfH);

    const innerHalfH = halfH - stroke;
    const innerArcRadius = innerHalfH;
    const innerArcCx = halfW - stroke - innerArcRadius;
    const innerLeft = -halfW + stroke;

    const hole = new THREE.Path();
    hole.moveTo(innerLeft, -innerHalfH);
    hole.lineTo(innerLeft, innerHalfH);
    hole.lineTo(innerArcCx, innerHalfH);
    hole.absarc(innerArcCx, 0, innerArcRadius, Math.PI / 2, -Math.PI / 2, true);
    hole.lineTo(innerLeft, -innerHalfH);
    shape.holes.push(hole);

    return new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: depth * 0.15,
        bevelSize: depth * 0.1,
        bevelSegments: 2,
    });
}

function buildLetterE(width: number, height: number, depth: number): THREE.ExtrudeGeometry {
    const stroke = width * 0.22;
    const halfW = width / 2;
    const halfH = height / 2;

    const shape = new THREE.Shape();
    shape.moveTo(-halfW, -halfH);
    shape.lineTo(halfW, -halfH);
    shape.lineTo(halfW, -halfH + stroke);
    shape.lineTo(-halfW + stroke, -halfH + stroke);
    shape.lineTo(-halfW + stroke, -stroke / 2);
    shape.lineTo(halfW * 0.6, -stroke / 2);
    shape.lineTo(halfW * 0.6, stroke / 2);
    shape.lineTo(-halfW + stroke, stroke / 2);
    shape.lineTo(-halfW + stroke, halfH - stroke);
    shape.lineTo(halfW, halfH - stroke);
    shape.lineTo(halfW, halfH);
    shape.lineTo(-halfW, halfH);
    shape.lineTo(-halfW, -halfH);

    return new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: depth * 0.15,
        bevelSize: depth * 0.1,
        bevelSegments: 2,
    });
}

function buildLetterL(width: number, height: number, depth: number): THREE.ExtrudeGeometry {
    const stroke = width * 0.28;
    const halfW = width / 2;
    const halfH = height / 2;

    const shape = new THREE.Shape();
    shape.moveTo(-halfW, -halfH);
    shape.lineTo(halfW, -halfH);
    shape.lineTo(halfW, -halfH + stroke);
    shape.lineTo(-halfW + stroke, -halfH + stroke);
    shape.lineTo(-halfW + stroke, halfH);
    shape.lineTo(-halfW, halfH);
    shape.lineTo(-halfW, -halfH);

    return new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: depth * 0.15,
        bevelSize: depth * 0.1,
        bevelSegments: 2,
    });
}

/* =====================================================================
 * Polished concrete / sealed tile floor texture
 * ===================================================================== */
function useFloorTexture(): THREE.Texture {
    return useMemo(() => {
        const SIZE = 512;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;

        // Base tile color — neutral grey concrete, not blueish
        ctx.fillStyle = '#3a3d45';
        ctx.fillRect(0, 0, SIZE, SIZE);

        // Subtle noise
        const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 14;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);

        // Tile grout
        ctx.strokeStyle = '#1c1e24';
        ctx.lineWidth = 5;
        ctx.strokeRect(0, 0, SIZE, SIZE);

        // Highlight inset
        ctx.strokeStyle = '#494c54';
        ctx.lineWidth = 1;
        ctx.strokeRect(4, 4, SIZE - 8, SIZE - 8);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 16;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }, []);
}

/* =====================================================================
 * Acoustic ceiling tile texture — the dropped-ceiling "fissured tile"
 * pattern you see in 99% of real data hall ceilings outside the
 * lighting fixtures.
 * ===================================================================== */
function useCeilingTexture(): THREE.Texture {
    return useMemo(() => {
        const SIZE = 256;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = '#cfd2d8';
        ctx.fillRect(0, 0, SIZE, SIZE);

        // Subtle speckle
        const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 24;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);

        // Tile separator lines
        ctx.strokeStyle = '#4a4d54';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, SIZE, SIZE);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 8;
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }, []);
}

/* =====================================================================
 * Subtle accent vertical strip (less neon than before — used sparingly
 * only at the corridor ends as wayfinding).
 * ===================================================================== */
function VerticalLEDStrip({
    position,
    height = 3,
    color = '#1f9bff',
}: {
    position: [number, number, number];
    height?: number;
    color?: string;
}) {
    return (
        <mesh position={position}>
            <boxGeometry args={[0.025, height, 0.015]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={1.6}
                toneMapped={false}
            />
        </mesh>
    );
}

export function DataCenterEnvironment({
    regionName = 'US-EAST-1',
}: DataCenterEnvironmentProps) {
    const ROOM_LENGTH = 28;
    const ROOM_WIDTH = 12;
    const ROOM_HEIGHT = 4;
    const FLOOR_Y = -1.2;
    const CEILING_Y = FLOOR_Y + ROOM_HEIGHT;

    const materials = useMemo(
        () => ({
            wall: new THREE.MeshStandardMaterial({
                color: '#1c1f26',
                metalness: 0.25,
                roughness: 0.6,
            }),
            wallPanel: new THREE.MeshStandardMaterial({
                color: '#22262e',
                metalness: 0.35,
                roughness: 0.55,
            }),
            tGrid: new THREE.MeshStandardMaterial({
                color: '#a8acb4',
                metalness: 0.6,
                roughness: 0.45,
            }),
        }),
        []
    );

    const floorTexture = useFloorTexture();
    floorTexture.repeat.set(ROOM_LENGTH, ROOM_WIDTH);

    const ceilingTexture = useCeilingTexture();
    // 0.6m ceiling tiles — one repeat per 0.6 unit
    ceilingTexture.repeat.set(ROOM_LENGTH / 0.6, ROOM_WIDTH / 0.6);

    /* =================================================================
     * Lighting layout — recessed troffer panels in TWO straight rows,
     * one above each rack row. This is exactly how real DC ceilings
     * look: lights between the racks, NOT scattered hex clusters.
     * ================================================================= */
    const trofferZRows = useMemo(() => [-2.5, 2.5] as const, []);
    const trofferXPositions = useMemo<number[]>(() => {
        const arr: number[] = [];
        const spacing = 3.2;
        for (let x = -ROOM_LENGTH / 2 + 2; x < ROOM_LENGTH / 2 - 1; x += spacing) {
            arr.push(x);
        }
        return arr;
    }, []);
    // Plus a single line of slim panels down the central corridor
    const corridorTrofferXPositions = useMemo<number[]>(() => {
        const arr: number[] = [];
        const spacing = 4;
        for (let x = -ROOM_LENGTH / 2 + 4; x < ROOM_LENGTH / 2 - 3; x += spacing) {
            arr.push(x);
        }
        return arr;
    }, []);

    return (
        <group>
            {/* Floor */}
            <mesh
                position={[0, FLOOR_Y, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
            >
                <planeGeometry args={[ROOM_LENGTH, ROOM_WIDTH]} />
                <meshStandardMaterial
                    map={floorTexture}
                    metalness={0.05}
                    roughness={0.85}
                    envMapIntensity={0.1}
                />
            </mesh>

            {/* Ceiling — acoustic tile with white painted T-grid look */}
            <mesh
                position={[0, CEILING_Y, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                receiveShadow
            >
                <planeGeometry args={[ROOM_LENGTH, ROOM_WIDTH]} />
                <meshStandardMaterial
                    map={ceilingTexture}
                    metalness={0.15}
                    roughness={0.85}
                    envMapIntensity={0.2}
                />
            </mesh>

            {/* Recessed troffer panels — two rows above the rack rows */}
            {trofferZRows.map((z) =>
                trofferXPositions.map((x) => (
                    <TrofferPanel
                        key={`troffer-${z}-${x}`}
                        position={[x, CEILING_Y - 0.005, z]}
                        width={0.6}
                        length={1.5}
                    />
                ))
            )}
            {/* Slim corridor center panels (smaller, less intense) */}
            {corridorTrofferXPositions.map((x) => (
                <TrofferPanel
                    key={`troffer-c-${x}`}
                    position={[x, CEILING_Y - 0.005, 0]}
                    width={0.35}
                    length={1.0}
                />
            ))}

            {/* Overhead cable trays — one above each rack row, just below ceiling */}
            <CableTray
                position={[0, CEILING_Y - 0.45, -3.6]}
                length={ROOM_LENGTH - 2}
                width={0.45}
            />
            <CableTray
                position={[0, CEILING_Y - 0.45, 3.6]}
                length={ROOM_LENGTH - 2}
                width={0.45}
            />

            {/* Overhead power busway down the center aisle */}
            <PowerBusway
                position={[0, CEILING_Y - 0.55, 0]}
                length={ROOM_LENGTH - 2.5}
            />

            {/* Side Walls */}
            <mesh
                position={[0, FLOOR_Y + ROOM_HEIGHT / 2, -ROOM_WIDTH / 2]}
                material={materials.wall}
            >
                <boxGeometry args={[ROOM_LENGTH, ROOM_HEIGHT, 0.15]} />
            </mesh>
            <mesh
                position={[0, FLOOR_Y + ROOM_HEIGHT / 2, ROOM_WIDTH / 2]}
                material={materials.wall}
            >
                <boxGeometry args={[ROOM_LENGTH, ROOM_HEIGHT, 0.15]} />
            </mesh>

            {/* End Walls */}
            <mesh
                position={[-ROOM_LENGTH / 2, FLOOR_Y + ROOM_HEIGHT / 2, 0]}
                material={materials.wall}
            >
                <boxGeometry args={[0.15, ROOM_HEIGHT, ROOM_WIDTH]} />
            </mesh>
            <mesh
                position={[ROOM_LENGTH / 2, FLOOR_Y + ROOM_HEIGHT / 2, 0]}
                material={materials.wall}
            >
                <boxGeometry args={[0.15, ROOM_HEIGHT, ROOM_WIDTH]} />
            </mesh>

            {/* Wall panels — back wall (Row A side) */}
            {Array.from({ length: 10 }, (_, i) => (
                <mesh
                    key={`panel-back-${i}`}
                    position={[
                        -ROOM_LENGTH / 2 + 2.5 + i * 2.5,
                        FLOOR_Y + ROOM_HEIGHT / 2,
                        -ROOM_WIDTH / 2 + 0.1,
                    ]}
                >
                    <boxGeometry args={[2.2, ROOM_HEIGHT - 0.4, 0.05]} />
                    <primitive object={materials.wallPanel} attach="material" />
                </mesh>
            ))}

            {/* Wall panels — front wall (Row B side) */}
            {Array.from({ length: 10 }, (_, i) => (
                <mesh
                    key={`panel-front-${i}`}
                    position={[
                        -ROOM_LENGTH / 2 + 2.5 + i * 2.5,
                        FLOOR_Y + ROOM_HEIGHT / 2,
                        ROOM_WIDTH / 2 - 0.1,
                    ]}
                >
                    <boxGeometry args={[2.2, ROOM_HEIGHT - 0.4, 0.05]} />
                    <primitive object={materials.wallPanel} attach="material" />
                </mesh>
            ))}

            {/* Subtle corner LED accents (only at the corridor ends — wayfinding) */}
            <VerticalLEDStrip
                position={[
                    -ROOM_LENGTH / 2 + 0.18,
                    FLOOR_Y + ROOM_HEIGHT / 2,
                    -ROOM_WIDTH / 2 + 0.6,
                ]}
                height={ROOM_HEIGHT - 0.6}
            />
            <VerticalLEDStrip
                position={[
                    -ROOM_LENGTH / 2 + 0.18,
                    FLOOR_Y + ROOM_HEIGHT / 2,
                    ROOM_WIDTH / 2 - 0.6,
                ]}
                height={ROOM_HEIGHT - 0.6}
            />
            <VerticalLEDStrip
                position={[
                    ROOM_LENGTH / 2 - 0.18,
                    FLOOR_Y + ROOM_HEIGHT / 2,
                    -ROOM_WIDTH / 2 + 0.6,
                ]}
                height={ROOM_HEIGHT - 0.6}
            />
            <VerticalLEDStrip
                position={[
                    ROOM_LENGTH / 2 - 0.18,
                    FLOOR_Y + ROOM_HEIGHT / 2,
                    ROOM_WIDTH / 2 - 0.6,
                ]}
                height={ROOM_HEIGHT - 0.6}
            />

            {/* Region/Floor name on end wall */}
            <Text
                position={[ROOM_LENGTH / 2 - 0.2, FLOOR_Y + ROOM_HEIGHT / 2 + 0.5, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                fontSize={0.5}
                color="#dde6f0"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.015}
                outlineColor="#0a1320"
            >
                {regionName}
            </Text>
            {/* Subtle accent under the text */}
            <mesh
                position={[
                    ROOM_LENGTH / 2 - 0.18,
                    FLOOR_Y + ROOM_HEIGHT / 2 - 0.1,
                    0,
                ]}
            >
                <boxGeometry args={[0.02, 0.02, 4]} />
                <meshStandardMaterial
                    color="#1f9bff"
                    emissive="#1f9bff"
                    emissiveIntensity={1.2}
                    toneMapped={false}
                />
            </mesh>

            {/* Dell logo on opposite end wall */}
            <DellLogo3D
                position={[-ROOM_LENGTH / 2 + 0.1, FLOOR_Y + ROOM_HEIGHT / 2, 0]}
                rotation={[0, Math.PI / 2, 0]}
                scale={1.3}
            />
            <pointLight
                position={[-ROOM_LENGTH / 2 + 2.5, FLOOR_Y + ROOM_HEIGHT / 2, 0]}
                intensity={2.2}
                distance={6}
                color="#1f9bff"
            />

            {/* Single subtle floor wayfinding stripe down the center
                (mimics painted floor lane markings real DCs use) */}
            <mesh position={[0, FLOOR_Y + 0.005, 0]}>
                <boxGeometry args={[ROOM_LENGTH - 2, 0.005, 0.06]} />
                <meshStandardMaterial
                    color="#5a6270"
                    roughness={0.7}
                    metalness={0.1}
                />
            </mesh>
        </group>
    );
}

export default DataCenterEnvironment;
