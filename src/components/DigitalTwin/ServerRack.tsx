/**
 * ServerRack Component
 *
 * Dell-style server rack with:
 * - Black frame with silver edge trim
 * - Perforated mesh front door (texture-based)
 * - Interactive door that opens when rack is selected
 * - Dell logo badge at top
 * - Door handle
 * - Side panels
 * - Optimized geometry (minimal triangles)
 */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Device3D, Rack3D } from './types';
import { DellServer } from './DellServer';
import { mergedRackStaticGeo } from './rackMergedStatic';
import { rackGeo, getPerforatedDoorTexture, getDellLogoBadgeTexture } from './rackSharedGeometries';

export type { Device3D, Rack3D };

export interface AgentActivityInfo {
    deviceName: string;
    bmcIp: string;
    agentName: string | null;
    query: string | null;
    status: string | null;
}

interface ServerRackProps {
    rack: Rack3D;
    selectedDeviceIds: Set<string>;
    selectedRackId: string | null;
    showDeviceLabels?: boolean;
    onDeviceClick?: (device: Device3D) => void;
    onToggleSelection?: (deviceId: string, isSelected: boolean) => void;
    onRackClick?: (rackId: string) => void;
    onToggleRackDeviceLabels?: (rackId: string) => void;
    agentActivityInfo?: AgentActivityInfo | null;
}

// Shared materials - created once for all rack instances
const sharedRackMaterials = {
    frame: new THREE.MeshStandardMaterial({
        color: '#1a1a1a',
        metalness: 0.85,
        roughness: 0.3,
    }),
    back: new THREE.MeshStandardMaterial({
        color: '#0a0a0a',
        metalness: 0.5,
        roughness: 0.5,
    }),
    doorFrame: new THREE.MeshStandardMaterial({
        color: '#1a1a1a',
        metalness: 0.9,
        roughness: 0.25,
    }),
    sidePanel: new THREE.MeshStandardMaterial({
        color: '#151518',
        metalness: 0.7,
        roughness: 0.4,
    }),
    edgeTrim: new THREE.MeshStandardMaterial({
        color: '#808088',
        metalness: 0.95,
        roughness: 0.15,
    }),
    handle: new THREE.MeshStandardMaterial({
        color: '#2a2a2e',
        metalness: 0.9,
        roughness: 0.2,
    }),
    handleGrip: new THREE.MeshStandardMaterial({
        color: '#404048',
        metalness: 0.8,
        roughness: 0.3,
    }),
    feet: new THREE.MeshStandardMaterial({
        color: '#1a1a1a',
        metalness: 0.6,
        roughness: 0.5,
    }),
    logoBadge: new THREE.MeshStandardMaterial({
        color: '#1a1a1e',
        metalness: 0.8,
        roughness: 0.3,
    }),
};

export function ServerRack({
    rack,
    selectedDeviceIds,
    selectedRackId,
    showDeviceLabels = true,
    onDeviceClick,
    onToggleSelection,
    onRackClick,
    onToggleRackDeviceLabels,
    agentActivityInfo,
}: ServerRackProps) {
    const isRackSelected = selectedRackId === rack.rack_id;
    
    // Door animation - opens when rack is selected
    const doorRef = useRef<THREE.Group>(null);
    const doorRotation = useRef(0);
    const targetRotation = isRackSelected ? -Math.PI * 0.45 : 0; // Open 80 degrees when selected
    
    useFrame((_state, delta: number) => {
        if (doorRef.current) {
            // Smooth interpolation towards target rotation
            const speed = 3;
            doorRotation.current += (targetRotation - doorRotation.current) * speed * delta;
            doorRef.current.rotation.y = doorRotation.current;
        }
    });

    const shouldShowAgentActivity = useMemo(() => {
        if (!agentActivityInfo) return false;
        const isFirstRack = rack.rack_id.includes('R1') || rack.rack_id.includes('A1');
        return isFirstRack;
    }, [agentActivityInfo, rack.rack_id]);

    // Calculate rack health status based on devices
    const rackHealthStatus = useMemo(() => {
        const hasCritical = rack.devices.some(d => d.health_status === 'critical');
        const hasWarning = rack.devices.some(d => d.health_status === 'warning');
        if (hasCritical) return 'critical';
        if (hasWarning) return 'warning';
        return 'ok';
    }, [rack.devices]);

    // Pulsing animation for status indicator
    const statusIndicatorRef = useRef<THREE.Mesh>(null);
    const pulseTime = useRef(0);
    
    useFrame((_s, delta: number) => {
        if (statusIndicatorRef.current && rackHealthStatus !== 'ok') {
            pulseTime.current += delta;
            // Subtle pulse effect
            const pulse = Math.sin(pulseTime.current * (rackHealthStatus === 'critical' ? 4 : 2)) * 0.5 + 0.5;
            const material = statusIndicatorRef.current.material as THREE.MeshStandardMaterial;
            material.emissiveIntensity = 1.5 + pulse * 1.5;
        }
    });

    // Status indicator material
    const statusIndicatorMaterial = useMemo(() => {
        if (rackHealthStatus === 'critical') {
            return new THREE.MeshStandardMaterial({
                color: '#ff2200',
                emissive: '#ff2200',
                emissiveIntensity: 2.0,
            });
        } else if (rackHealthStatus === 'warning') {
            return new THREE.MeshStandardMaterial({
                color: '#ffaa00',
                emissive: '#ffaa00',
                emissiveIntensity: 1.5,
            });
        }
        return new THREE.MeshStandardMaterial({
            color: '#00cc44',
            emissive: '#00cc44',
            emissiveIntensity: 0.8,
        });
    }, [rackHealthStatus]);

    const rackHighlightMaterial = useMemo(() => {
        const color = rack.rack_color || '#00aaff';
        return new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: isRackSelected ? 0.18 : 0.0,
            depthWrite: false,
        });
    }, [rack.rack_color, isRackSelected]);

    // Perforated door material with texture
    const meshDoorMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            map: getPerforatedDoorTexture(),
            metalness: 0.6,
            roughness: 0.4,
            transparent: true,
            opacity: 0.95,
        });
    }, []);

    // Dell logo material
    const logoMaterial = useMemo(() => {
        return new THREE.MeshBasicMaterial({
            map: getDellLogoBadgeTexture(),
            transparent: true,
        });
    }, []);

    // Build slot map for 20U rack
    const U_SLOTS = 20;
    const slots: (Device3D | null)[] = Array(U_SLOTS).fill(null);
    const sortedDevices = [...rack.devices].sort(
        (a, b) => a.u_position - b.u_position
    );

    for (const device of sortedDevices) {
        const topIndex = Math.max(0, device.u_position - 1);
        const height = Math.max(1, Math.floor(device.height_u || 1));
        for (let k = 0; k < height && topIndex + k < U_SLOTS; k++) {
            slots[topIndex + k] = device;
        }
    }

    const renderedDevices = new Set<string>();

    const handleDeviceClick = (
        e: React.MouseEvent<HTMLElement> | THREE.Event,
        device: Device3D
    ) => {
        if ('stopPropagation' in e) {
            e.stopPropagation();
        }
        const isSelected = selectedDeviceIds.has(device.device_id);
        if (onToggleSelection) {
            onToggleSelection(device.device_id, !isSelected);
        }
        if (onDeviceClick) {
            onDeviceClick(device);
        }
    };

    const handleRackClick = (e: React.MouseEvent<HTMLElement> | THREE.Event) => {
        if ('stopPropagation' in e) {
            e.stopPropagation();
        }
        if (onRackClick) {
            onRackClick(rack.rack_id);
        }
    };

    return (
        <group position={rack.position} rotation={rack.rotation || [0, 0, 0]}>
            {/* Rack highlight box for selection */}
            <mesh
                position={[0.3, 0, 0]}
                geometry={rackGeo.rackHighlight}
                material={rackHighlightMaterial}
                onClick={handleRackClick}
                onPointerOver={() => (document.body.style.cursor = 'pointer')}
                onPointerOut={() => (document.body.style.cursor = 'default')}
            />

            {/* Main frame (corner posts) */}
            <mesh
                castShadow
                geometry={mergedRackStaticGeo.rackFrame}
                material={sharedRackMaterials.frame}
            />

            {/* Back panel - fully encloses back */}
            <mesh
                geometry={mergedRackStaticGeo.rackBack}
                material={sharedRackMaterials.back}
            />

            {/* Top panel - fully encloses top */}
            <mesh
                castShadow
                geometry={mergedRackStaticGeo.topPanel}
                material={sharedRackMaterials.sidePanel}
            />

            {/* === STATUS INDICATOR - Subtle LED on top-front edge === */}
            {/* Shows rack health: green=ok, amber=warning, red=critical (pulsing) */}
            <mesh
                ref={statusIndicatorRef}
                position={[0.3, 0.97, 0.48]}
                material={statusIndicatorMaterial}
            >
                <boxGeometry args={[0.04, 0.012, 0.012]} />
            </mesh>
            
            {/* Secondary indicator strip - subtle glow bar */}
            {rackHealthStatus !== 'ok' && (
                <mesh position={[0.3, 0.965, 0.52]}>
                    <boxGeometry args={[0.15, 0.006, 0.006]} />
                    <primitive object={statusIndicatorMaterial} attach="material" />
                </mesh>
            )}

            {/* Bottom panel - fully encloses bottom */}
            <mesh
                geometry={mergedRackStaticGeo.bottomPanel}
                material={sharedRackMaterials.sidePanel}
            />

            {/* Side panels - fully enclose left and right */}
            <mesh
                geometry={mergedRackStaticGeo.sidePanels}
                material={sharedRackMaterials.sidePanel}
            />

            {/* Bottom feet */}
            <mesh
                geometry={mergedRackStaticGeo.feet}
                material={sharedRackMaterials.feet}
            />

            {/* === ANIMATED DOOR GROUP === */}
            {/* Pivot point is at left edge of door (x = -0.01) */}
            <group position={[-0.01, 0, 0.5]} ref={doorRef}>
                {/* Door frame - positioned relative to pivot */}
                <group position={[0.31, 0, 0]}>
                    {/* Left door frame */}
                    <mesh position={[-0.295, 0, 0]} material={sharedRackMaterials.doorFrame}>
                        <boxGeometry args={[0.03, 1.85, 0.025]} />
                    </mesh>
                    {/* Right door frame */}
                    <mesh position={[0.315, 0, 0]} material={sharedRackMaterials.doorFrame}>
                        <boxGeometry args={[0.03, 1.85, 0.025]} />
                    </mesh>
                    {/* Top door frame */}
                    <mesh position={[0.01, 0.92, 0]} material={sharedRackMaterials.doorFrame}>
                        <boxGeometry args={[0.62, 0.03, 0.025]} />
                    </mesh>
                    {/* Bottom door frame */}
                    <mesh position={[0.01, -0.92, 0]} material={sharedRackMaterials.doorFrame}>
                        <boxGeometry args={[0.62, 0.03, 0.025]} />
                    </mesh>

                    {/* Perforated mesh door panel */}
                    <mesh position={[0.01, 0, 0]} material={meshDoorMaterial}>
                        <boxGeometry args={[0.56, 1.82, 0.015]} />
                    </mesh>

                    {/* Silver edge trim - vertical */}
                    <mesh position={[-0.31, 0, 0.02]} material={sharedRackMaterials.edgeTrim}>
                        <boxGeometry args={[0.02, 1.92, 0.02]} />
                    </mesh>
                    <mesh position={[0.33, 0, 0.02]} material={sharedRackMaterials.edgeTrim}>
                        <boxGeometry args={[0.02, 1.92, 0.02]} />
                    </mesh>
                    {/* Silver edge trim - horizontal */}
                    <mesh position={[0.01, 0.96, 0.02]} material={sharedRackMaterials.edgeTrim}>
                        <boxGeometry args={[0.64, 0.02, 0.02]} />
                    </mesh>
                    <mesh position={[0.01, -0.96, 0.02]} material={sharedRackMaterials.edgeTrim}>
                        <boxGeometry args={[0.64, 0.02, 0.02]} />
                    </mesh>

                    {/* Door handle */}
                    <mesh position={[0.29, 0, 0.02]} material={sharedRackMaterials.handle}>
                        <boxGeometry args={[0.02, 0.15, 0.025]} />
                    </mesh>
                    {/* Handle grip */}
                    <mesh
                        position={[0.305, 0, 0.035]}
                        rotation={[Math.PI / 2, 0, 0]}
                        geometry={rackGeo.doorHandleGrip}
                        material={sharedRackMaterials.handleGrip}
                    />

                    {/* Dell logo badge at top */}
                    <group position={[0.01, 0.85, 0.02]}>
                        <mesh
                            rotation={[Math.PI / 2, 0, 0]}
                            geometry={rackGeo.logoBadge}
                            material={sharedRackMaterials.logoBadge}
                        />
                        <mesh position={[0, 0, 0.005]} material={logoMaterial}>
                            <planeGeometry args={[0.07, 0.07]} />
                        </mesh>
                    </group>
                </group>
            </group>

            {/* Rack name label - shown when selected */}
            {isRackSelected && (
                <Html
                    position={[0.3, 1.02, 0.05]}
                    center
                    distanceFactor={8}
                    zIndexRange={[100, 0]}
                >
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleRackDeviceLabels?.(rack.rack_id);
                        }}
                        style={{
                            background: '#252528',
                            color: '#fff',
                            padding: '5px 12px',
                            borderRadius: '3px',
                            fontSize: '11px',
                            fontWeight: 600,
                            fontFamily: "'JetBrains Mono', monospace",
                            letterSpacing: '0.03em',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            border: '1px solid #3f3f46',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                        }}
                        title={showDeviceLabels ? 'Hide server tags' : 'Show server tags'}
                    >
                        {rack.rack_name}
                    </div>
                </Html>
            )}

            {/* Agent Activity Card */}
            {shouldShowAgentActivity && agentActivityInfo && (() => {
                const isActive = !!agentActivityInfo.agentName;
                const isProcessing = agentActivityInfo.status === 'processing';
                const isWaiting = agentActivityInfo.status === 'waiting_approval';
                const displayName = agentActivityInfo.agentName
                    ? agentActivityInfo.agentName.replace(/_/g, ' ')
                    : null;
                const truncatedQuery = agentActivityInfo.query
                    ? agentActivityInfo.query.length > 80
                        ? agentActivityInfo.query.substring(0, 80) + '...'
                        : agentActivityInfo.query
                    : null;

                return (
                    <Html
                        position={[-0.65, -0.15, 0.55]}
                        center
                        distanceFactor={6}
                        zIndexRange={[100, 0]}
                        style={{ pointerEvents: 'none' }}
                    >
                        <style>
                            {`
                                @keyframes cyanPulse {
                                    0%, 100% { box-shadow: 0 0 6px rgba(34, 211, 238, 0.4); border-color: rgba(34, 211, 238, 0.6); }
                                    50% { box-shadow: 0 0 14px rgba(34, 211, 238, 0.8); border-color: rgba(34, 211, 238, 1); }
                                }
                                @keyframes amberPulse {
                                    0%, 100% { box-shadow: 0 0 4px rgba(234, 179, 8, 0.4); border-color: rgba(234, 179, 8, 0.6); }
                                    50% { box-shadow: 0 0 12px rgba(234, 179, 8, 0.8); border-color: rgba(234, 179, 8, 1); }
                                }
                                @keyframes dotPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
                            `}
                        </style>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'linear-gradient(135deg, rgba(12, 12, 16, 0.95), rgba(18, 18, 24, 0.92))',
                            backdropFilter: 'blur(16px)',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            minWidth: '155px',
                            maxWidth: '220px',
                            border: isProcessing ? '1.5px solid rgba(34, 211, 238, 0.5)'
                                : isWaiting ? '1.5px solid rgba(234, 179, 8, 0.5)'
                                : '1px solid rgba(63, 63, 70, 0.4)',
                            animation: isProcessing ? 'cyanPulse 1.5s ease-in-out infinite'
                                : isWaiting ? 'amberPulse 1.5s ease-in-out infinite' : 'none',
                            boxShadow: '0 3px 12px rgba(0, 0, 0, 0.5)',
                            pointerEvents: 'none',
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                                    stroke={isProcessing ? '#22d3ee' : isWaiting ? '#eab308' : '#6b7280'}
                                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="10" rx="2" />
                                    <circle cx="12" cy="5" r="4" />
                                    <path d="M8 16h.01M16 16h.01M10 19h4" />
                                </svg>
                                <span style={{
                                    fontFamily: 'Inter', fontSize: '7px', fontWeight: 700,
                                    color: isProcessing ? '#22d3ee' : isWaiting ? '#fbbf24' : '#6b7280',
                                    textTransform: 'uppercase',
                                }}>
                                    {isActive ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <span style={{
                                                width: '5px', height: '5px', borderRadius: '50%',
                                                background: isProcessing ? '#22d3ee' : '#eab308',
                                                animation: 'dotPulse 1s ease-in-out infinite',
                                            }} />
                                            {isWaiting ? 'AWAIT' : 'ACTIVE'}
                                        </span>
                                    ) : 'IDLE'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                <span style={{
                                    fontFamily: 'Inter', fontSize: isActive ? '10px' : '11px', fontWeight: 600,
                                    color: isActive ? '#e5e7eb' : '#6b7280', textTransform: 'capitalize',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {displayName || 'No active agent'}
                                </span>
                                <span style={{
                                    fontFamily: "'JetBrains Mono', monospace", fontSize: '7px',
                                    color: '#9ca3af', whiteSpace: 'nowrap',
                                }}>
                                    {agentActivityInfo.deviceName} / {agentActivityInfo.bmcIp}
                                </span>
                                {truncatedQuery && (
                                    <span style={{
                                        fontFamily: 'Inter', fontSize: '7px', color: '#6b7280',
                                        overflow: 'hidden', display: '-webkit-box',
                                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                    }}>
                                        {truncatedQuery}
                                    </span>
                                )}
                            </div>
                        </div>
                    </Html>
                );
            })()}

            {/* Server slots */}
            {slots.map((device, _slotIndex) => {
                if (!device) return null;
                if (renderedDevices.has(device.device_id)) return null;
                renderedDevices.add(device.device_id);

                const topSlotIndex = Math.max(0, device.u_position - 1);
                const heightU = Math.max(1, Math.floor(device.height_u || 1));
                let firstIndex = topSlotIndex;
                for (let scan = 0; scan < slots.length; scan++) {
                    if (slots[scan]?.device_id === device.device_id) {
                        firstIndex = scan;
                        break;
                    }
                }

                const slotSpacing = 0.074;
                const baseY = -0.76 + firstIndex * slotSpacing;
                const centerOffset = ((heightU - 1) * slotSpacing) / 2;
                const yPos = baseY + centerOffset;
                const meshHeight = 0.052 * heightU;

                const isSelected = selectedDeviceIds.has(device.device_id);

                return (
                    <group
                        key={device.device_id}
                        position={[0.3, yPos, 0.12]}
                        onClick={(e) => handleDeviceClick(e, device)}
                        onPointerOver={() => (document.body.style.cursor = 'pointer')}
                        onPointerOut={() => (document.body.style.cursor = 'default')}
                    >
                        <DellServer
                            height={meshHeight}
                            isSelected={isSelected}
                            healthStatus={device.health_status}
                            status={device.status}
                        />

                        {isRackSelected && showDeviceLabels && (
                            <Html
                                position={[0, 0, 0.4]}
                                center
                                distanceFactor={8}
                                zIndexRange={[100, 0]}
                            >
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeviceClick?.(device);
                                    }}
                                    style={{
                                        background: isSelected ? '#2563eb'
                                            : device.health_status === 'critical' ? '#1c1617' : '#252528',
                                        color: device.health_status === 'critical' ? '#f87171' : '#fff',
                                        padding: '2px 7px',
                                        borderRadius: '2px',
                                        fontSize: '8px',
                                        fontWeight: 600,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer',
                                        border: isSelected ? '1px solid #3b82f6'
                                            : device.health_status === 'critical' ? '1px solid #dc2626' : '1px solid #3f3f46',
                                        boxShadow: device.health_status === 'critical'
                                            ? '0 0 12px rgba(220, 38, 38, 0.4)' : '0 1px 4px rgba(0,0,0,0.4)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span>{device.hostname}</span>
                                    {device.service_tag && (
                                        <span style={{ fontSize: '6.5px', opacity: 0.65 }}>
                                            {device.service_tag}
                                        </span>
                                    )}
                                </div>
                            </Html>
                        )}
                    </group>
                );
            })}
        </group>
    );
}

export default ServerRack;
