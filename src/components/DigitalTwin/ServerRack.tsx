/**
 * ServerRack Component
 *
 * Enhanced 3D server rack with:
 * - Multi-U device support (devices spanning multiple slots)
 * - Rack color coding (Row A = cyan, Row B = orange)
 * - Rack selection state with expanded labels
 * - Device selection with visual highlighting
 * - LED status indicators based on health
 * - Hostname labels on selected rack/devices
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { Device3D, Rack3D } from './types';
import { DellGrill } from './DellGrill';
import { mergedRackStaticGeo } from './rackMergedStatic';
import { rackGeo } from './rackSharedGeometries';

// Re-export types for convenience
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

    const shouldShowAgentActivity = useMemo(() => {
        if (!agentActivityInfo) return false;
        const isFirstRack = rack.rack_id.includes('R1') || rack.rack_id.includes('A1');
        return isFirstRack;
    }, [agentActivityInfo, rack.rack_id]);

    const materials = useMemo(
        () => ({
            rackFrame: new THREE.MeshStandardMaterial({ 
                color: '#1a1a1a',
                metalness: 0.8,
                roughness: 0.3,
            }),
            rackBack: new THREE.MeshStandardMaterial({ 
                color: '#0a0a0a',
                metalness: 0.5,
                roughness: 0.4,
            }),
            rail: new THREE.MeshStandardMaterial({ 
                color: '#2a2a2a',
                metalness: 0.7,
                roughness: 0.3,
            }),
            glassDoor: new THREE.MeshStandardMaterial({
                color: '#1a2030',
                metalness: 0.1,
                roughness: 0.05,
                transparent: true,
                opacity: 0.3,
                envMapIntensity: 2,
            }),
            doorFrame: new THREE.MeshStandardMaterial({
                color: '#252525',
                metalness: 0.9,
                roughness: 0.2,
            }),
            serverChassis: new THREE.MeshStandardMaterial({
                color: '#404048',
                metalness: 0.7,
                roughness: 0.25,
                emissive: '#151518',
                emissiveIntensity: 0.15,
            }),
            serverChassisSelected: new THREE.MeshStandardMaterial({
                color: '#00ff88',
                emissive: '#00ff88',
                emissiveIntensity: 0.3,
            }),
            serverChassisCritical: new THREE.MeshStandardMaterial({
                color: '#3a2a2a',
                emissive: '#cc3333',
                emissiveIntensity: 0.4,
                roughness: 0.45,
                metalness: 0.5,
            }),
            serverBezel: new THREE.MeshStandardMaterial({
                color: '#353540',
                metalness: 0.6,
                roughness: 0.3,
                emissive: '#0a0a0f',
                emissiveIntensity: 0.1,
            }),
            handle: new THREE.MeshStandardMaterial({
                color: '#5a5a5a',
                metalness: 0.85,
                roughness: 0.2,
            }),
            greenLED: new THREE.MeshStandardMaterial({
                color: '#00ff44',
                emissive: '#00ff44',
                emissiveIntensity: 2.0,
            }),
            blueLED: new THREE.MeshStandardMaterial({
                color: '#00aaff',
                emissive: '#00aaff',
                emissiveIntensity: 2.0,
            }),
            yellowLED: new THREE.MeshStandardMaterial({
                color: '#ffaa00',
                emissive: '#ffaa00',
                emissiveIntensity: 1.8,
            }),
            redLED: new THREE.MeshStandardMaterial({
                color: '#ff2200',
                emissive: '#ff2200',
                emissiveIntensity: 2.0,
            }),
            offlineLED: new THREE.MeshStandardMaterial({
                color: '#222',
                emissive: '#111',
                emissiveIntensity: 0.05,
            }),
            serverEdgeAccent: new THREE.MeshStandardMaterial({
                color: '#505058',
                metalness: 0.9,
                roughness: 0.1,
                emissive: '#252528',
                emissiveIntensity: 0.15,
            }),
            verticalLEDStrip: new THREE.MeshStandardMaterial({
                color: '#00d4ff',
                emissive: '#00d4ff',
                emissiveIntensity: 2.5,
            }),
            topIndicator: new THREE.MeshStandardMaterial({
                color: '#ff8800',
                emissive: '#ff6600',
                emissiveIntensity: 1.5,
            }),
        }),
        []
    );

    const rackHighlightMaterial = useMemo(() => {
        const color = rack.rack_color || '#00aaff';
        return new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: isRackSelected ? 0.18 : 0.0,
            depthWrite: false,
        });
    }, [rack.rack_color, isRackSelected]);

    const getLEDMaterial = (device: Device3D | null, isSelected: boolean) => {
        if (isSelected) return materials.greenLED;
        if (!device) return materials.offlineLED;
        const health = device.health_status || 'unknown';
        if (health === 'critical') return materials.redLED;
        if (health === 'warning') return materials.yellowLED;
        if (device.status === 'online') return materials.greenLED;
        return materials.offlineLED;
    };

    // Build slot map for 20U rack. Multi-U devices span multiple slots.
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
            {/* Rack highlight box - Add click handler */}
            <mesh
                position={[0.29, 0, 0.15]}
                geometry={rackGeo.rackHighlight}
                material={rackHighlightMaterial}
                onClick={handleRackClick}
                onPointerOver={() => (document.body.style.cursor = 'pointer')}
                onPointerOut={() => (document.body.style.cursor = 'default')}
            />

            {/* Static rack body — merged by material (7 draws vs 18) */}
            <mesh
                castShadow
                geometry={mergedRackStaticGeo.rackFrame}
                material={materials.rackFrame}
            />
            <mesh geometry={mergedRackStaticGeo.rackBack} material={materials.rackBack} />
            <mesh geometry={mergedRackStaticGeo.doorFrame} material={materials.doorFrame} />
            <mesh geometry={mergedRackStaticGeo.glassDoor} material={materials.glassDoor} />
            <mesh
                geometry={mergedRackStaticGeo.verticalLedStrip}
                material={materials.verticalLEDStrip}
            />
            <mesh
                geometry={mergedRackStaticGeo.topIndicator}
                material={materials.topIndicator}
            />
            <mesh geometry={mergedRackStaticGeo.rail} material={materials.rail} />

            {/* Rack name label - shown when rack is selected */}
            {isRackSelected && (
                <Html
                    position={[0.29, 1.02, 0.05]}
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
                                    0%, 100% {
                                        box-shadow: 0 0 6px rgba(34, 211, 238, 0.4),
                                                    0 0 12px rgba(34, 211, 238, 0.2);
                                        border-color: rgba(34, 211, 238, 0.6);
                                    }
                                    50% {
                                        box-shadow: 0 0 14px rgba(34, 211, 238, 0.8),
                                                    0 0 28px rgba(34, 211, 238, 0.4);
                                        border-color: rgba(34, 211, 238, 1);
                                    }
                                }
                                @keyframes amberPulse {
                                    0%, 100% {
                                        box-shadow: 0 0 4px rgba(234, 179, 8, 0.4);
                                        border-color: rgba(234, 179, 8, 0.6);
                                    }
                                    50% {
                                        box-shadow: 0 0 12px rgba(234, 179, 8, 0.8),
                                                    0 0 24px rgba(234, 179, 8, 0.4);
                                        border-color: rgba(234, 179, 8, 1);
                                    }
                                }
                                @keyframes dotPulse {
                                    0%, 100% { opacity: 0.4; }
                                    50% { opacity: 1; }
                                }
                            `}
                        </style>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: 'linear-gradient(135deg, rgba(12, 12, 16, 0.95) 0%, rgba(18, 18, 24, 0.92) 100%)',
                                backdropFilter: 'blur(16px)',
                                borderRadius: '8px',
                                padding: '8px 14px',
                                minWidth: '155px',
                                maxWidth: '220px',
                                border: isProcessing
                                    ? '1.5px solid rgba(34, 211, 238, 0.5)'
                                    : isWaiting
                                        ? '1.5px solid rgba(234, 179, 8, 0.5)'
                                        : '1px solid rgba(63, 63, 70, 0.4)',
                                animation: isProcessing
                                    ? 'cyanPulse 1.5s ease-in-out infinite'
                                    : isWaiting
                                        ? 'amberPulse 1.5s ease-in-out infinite'
                                        : 'none',
                                boxShadow: '0 3px 12px rgba(0, 0, 0, 0.5)',
                                pointerEvents: 'none',
                            }}
                        >
                            {/* Left: agent icon + status */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                gap: '2px',
                            }}>
                                <svg
                                    viewBox="0 0 24 24"
                                    width="22"
                                    height="22"
                                    fill="none"
                                    stroke={
                                        isProcessing ? '#22d3ee'
                                            : isWaiting ? '#eab308'
                                            : '#6b7280'
                                    }
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <rect x="3" y="11" width="18" height="10" rx="2" />
                                    <circle cx="12" cy="5" r="4" />
                                    <path d="M8 16h.01M16 16h.01" />
                                    <path d="M10 19h4" />
                                </svg>
                                <span
                                    style={{
                                        fontFamily: 'Inter',
                                        fontSize: '7px',
                                        fontWeight: 700,
                                        color: isProcessing ? '#22d3ee'
                                            : isWaiting ? '#fbbf24'
                                            : '#6b7280',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    {isActive ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <span
                                                style={{
                                                    width: '5px',
                                                    height: '5px',
                                                    borderRadius: '50%',
                                                    background: isProcessing ? '#22d3ee' : '#eab308',
                                                    animation: 'dotPulse 1s ease-in-out infinite',
                                                }}
                                            />
                                            {isWaiting ? 'AWAIT' : 'ACTIVE'}
                                        </span>
                                    ) : 'IDLE'}
                                </span>
                            </div>
                            {/* Right: agent details */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                overflow: 'hidden',
                            }}>
                                <span
                                    style={{
                                        fontFamily: 'Inter',
                                        fontSize: isActive ? '10px' : '11px',
                                        fontWeight: 600,
                                        color: isActive ? '#e5e7eb' : '#6b7280',
                                        letterSpacing: '0.02em',
                                        lineHeight: 1.2,
                                        textTransform: 'capitalize',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {displayName || 'No active agent'}
                                </span>
                                <span
                                    style={{
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: '7px',
                                        fontWeight: 500,
                                        color: '#9ca3af',
                                        letterSpacing: '0.02em',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {agentActivityInfo.deviceName} / {agentActivityInfo.bmcIp}
                                </span>
                                {truncatedQuery && (
                                    <span
                                        style={{
                                            fontFamily: 'Inter',
                                            fontSize: '7px',
                                            fontWeight: 400,
                                            color: '#6b7280',
                                            lineHeight: 1.3,
                                            overflow: 'hidden',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                        }}
                                    >
                                        {truncatedQuery}
                                    </span>
                                )}
                            </div>
                        </div>
                    </Html>
                );
            })()}

            {/*
             * Dell EMC grill panel — sits at the very top of the rack front face.
             *
             * scale = 0.58 / 12.0 ≈ 0.048
             * At that scale, DEPTH=1.5 means the frame strips span
             *   ±(1.52/2)×0.048 = ±0.036 world units around the group origin.
             *
             * z = 0.44  — pushed 0.10 in front of the bezel plane (0.34) so
             *             the entire assembly (frame back = 0.404, hex front = 0.512)
             *             sits clearly in front of the rack face, fully visible.
             */}
            <group
                position={[0.29, 0.808, 0.44]}
                scale={0.048}
            >
                <DellGrill />
            </group>

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
                const chassisMaterial = isSelected
                    ? materials.serverChassisSelected
                    : device.health_status === 'critical'
                        ? materials.serverChassisCritical
                        : materials.serverChassis;

                return (
                    <group
                        key={device.device_id}
                        position={[0.29, yPos, 0.15]}
                        onClick={(e) => handleDeviceClick(e, device)}
                        onPointerOver={() =>
                            (document.body.style.cursor = 'pointer')
                        }
                        onPointerOut={() =>
                            (document.body.style.cursor = 'default')
                        }
                    >
                        <mesh
                            castShadow
                            geometry={rackGeo.deviceChassis}
                            material={chassisMaterial}
                            scale={[1, meshHeight * 1.1, 1]}
                        />

                        <mesh
                            position={[0, 0, 0.34]}
                            geometry={rackGeo.deviceBezel}
                            material={materials.serverBezel}
                            scale={[1, meshHeight * 1.15, 1]}
                        />

                        {/* Top edge accent line for visual definition */}
                        <mesh
                            position={[0, meshHeight * 0.56, 0.346]}
                            geometry={rackGeo.deviceEdgeAccent}
                            material={materials.serverEdgeAccent}
                        />

                        {/* Bottom edge accent line */}
                        <mesh
                            position={[0, -meshHeight * 0.56, 0.346]}
                            geometry={rackGeo.deviceEdgeAccent}
                            material={materials.serverEdgeAccent}
                        />

                        {/* Status LEDs */}
                        <mesh
                            position={[-0.19, 0, 0.345]}
                            geometry={rackGeo.ledSquare}
                            material={getLEDMaterial(device, isSelected)}
                        />
                        <mesh
                            position={[-0.155, 0, 0.345]}
                            geometry={rackGeo.ledSquare}
                            material={
                                device.status === 'online'
                                    ? materials.yellowLED
                                    : materials.offlineLED
                            }
                        />

                        {/* Blue activity LED strip on server face */}
                        <mesh
                            position={[0.15, 0, 0.348]}
                            geometry={rackGeo.ledStrip}
                            material={materials.blueLED}
                        />

                        {/* Handles */}
                        <mesh
                            position={[-0.24, 0, 0.34]}
                            geometry={rackGeo.handle}
                            material={materials.handle}
                            scale={[1, Math.max(0.035, meshHeight * 0.65), 1]}
                        />
                        <mesh
                            position={[0.24, 0, 0.34]}
                            geometry={rackGeo.handle}
                            material={materials.handle}
                            scale={[1, Math.max(0.035, meshHeight * 0.65), 1]}
                        />

                        {/* Device hostname label - clickable when rack is selected */}
                        {isRackSelected && showDeviceLabels && (
                            <Html
                                position={[0, 0, 0.38]}
                                center
                                distanceFactor={8}
                                zIndexRange={[100, 0]}
                            >
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onDeviceClick) {
                                            onDeviceClick(device);
                                        }
                                    }}
                                    style={{
                                        background: isSelected
                                            ? '#2563eb'
                                            : device.health_status === 'critical'
                                                ? '#1c1617'
                                                : '#252528',
                                        color: device.health_status === 'critical' ? '#f87171' : '#fff',
                                        padding: '2px 7px',
                                        borderRadius: '2px',
                                        fontSize: '8px',
                                        fontWeight: 600,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        letterSpacing: '0.02em',
                                        lineHeight: 1.3,
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer',
                                        border: isSelected
                                            ? '1px solid #3b82f6'
                                            : device.health_status === 'critical'
                                                ? '1px solid #dc2626'
                                                : '1px solid #3f3f46',
                                        transition: 'all 0.15s ease',
                                        boxShadow: device.health_status === 'critical'
                                            ? '0 0 12px rgba(220, 38, 38, 0.4)'
                                            : '0 1px 4px rgba(0,0,0,0.4)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: device.service_tag ? '1px' : '0',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = isSelected
                                            ? '#1d4ed8'
                                            : device.health_status === 'critical'
                                                ? '#271a1b'
                                                : '#333338';
                                        e.currentTarget.style.transform = 'scale(1.03)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = isSelected
                                            ? '#2563eb'
                                            : device.health_status === 'critical'
                                                ? '#1c1617'
                                                : '#252528';
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    <span>{device.hostname}</span>
                                    {device.service_tag && (
                                        <span style={{
                                            fontSize: '6.5px',
                                            fontWeight: 400,
                                            opacity: 0.65,
                                            letterSpacing: '0.03em',
                                        }}>
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
