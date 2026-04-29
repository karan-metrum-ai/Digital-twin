/**
 * DigitalTwinView - Top-level 3D data center scene.
 *
 * Wraps the entire visualization in a React Three Fiber Canvas with:
 * - Cinematic camera & orbit controls
 * - Multi-tier lighting (ambient + key light + accent blues, matching reference images)
 * - Environment, network cables, and all server racks
 * - Click handling for device selection + info card overlay
 */

import { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';

const HOME_CAMERA_POSITION = new THREE.Vector3(-10.8, 1.15, 0);
const HOME_CAMERA_TARGET = new THREE.Vector3(-3.8, 1.05, 0);
const HOME_CAMERA_FOV = 55;

function getRackFocusView(rack: Rack3D | null) {
  if (!rack) {
    return {
      position: HOME_CAMERA_POSITION,
      target: HOME_CAMERA_TARGET,
      fov: HOME_CAMERA_FOV,
    };
  }

  const yaw = rack.rotation?.[1] ?? 0;
  const rackCenter = new THREE.Vector3(
    rack.position[0],
    rack.position[1] + 0.08,
    rack.position[2]
  );
  const rackLocalCenter = new THREE.Vector3(0.29, 0, 0.18).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    yaw
  );
  const frontDirection = new THREE.Vector3(0, 0, 1)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
    .normalize();
  const target = rackCenter.clone().add(rackLocalCenter);
  const position = target
    .clone()
    .add(frontDirection.multiplyScalar(3.35))
    .add(new THREE.Vector3(0, 0.78, 0));

  return { position, target, fov: 48 };
}

function RackCameraFocus({ rack }: { rack: Rack3D | null }) {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update?: () => void } | null;
  };
  const isAnimating = useRef(true);

  const focusView = useMemo(() => getRackFocusView(rack), [rack]);

  useEffect(() => {
    isAnimating.current = true;
  }, [focusView]);

  useFrame((_, delta) => {
    if (!isAnimating.current) return;

    const ease = 1 - Math.exp(-delta * 4);

    camera.position.lerp(focusView.position, ease);
    camera.fov = THREE.MathUtils.lerp(camera.fov, focusView.fov, ease);
    camera.updateProjectionMatrix();

    if (controls?.target) {
      controls.target.lerp(focusView.target, ease);
      controls.update?.();
    }

    const targetDistance = controls?.target
      ? controls.target.distanceTo(focusView.target)
      : 0;
    const isSettled =
      camera.position.distanceTo(focusView.position) < 0.025 &&
      targetDistance < 0.025 &&
      Math.abs(camera.fov - focusView.fov) < 0.15;

    if (isSettled) {
      isAnimating.current = false;
    }
  });

  return null;
}

/**
 * Clamps the orbit camera + target so the user can never leave the room.
 * Room bounds match DataCenterEnvironment (28 long x 12 wide x 4 tall).
 */
function CameraBoundsLimiter() {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3 } | null;
  };

  // Inset the bounds slightly from the actual walls (keep cam off the surface)
  const BOUNDS = useMemo(
    () => ({
      minX: -13.5,
      maxX: 13.5,
      minY: -1.0,
      maxY: 2.6,
      minZ: -5.5,
      maxZ: 5.5,
    }),
    []
  );

  useFrame(() => {
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, BOUNDS.minX, BOUNDS.maxX);
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, BOUNDS.minY, BOUNDS.maxY);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, BOUNDS.minZ, BOUNDS.maxZ);

    if (controls && controls.target) {
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, BOUNDS.minX, BOUNDS.maxX);
      controls.target.y = THREE.MathUtils.clamp(controls.target.y, BOUNDS.minY, BOUNDS.maxY);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, BOUNDS.minZ, BOUNDS.maxZ);
    }
  });

  return null;
}

import { DataCenterEnvironment } from './DataCenterEnvironment';
import { NetworkCables } from './NetworkCables';
import { ServerRack } from './ServerRack';
import RackInfoCard from './RackInfoCard';
import { GhostTechnicians } from './GhostTechnicians';
import type { Device3D, Rack3D, DeviceData } from './types';
import { generateRacks } from './mockData';

import styles from '../../styles/DigitalTwin/DigitalTwinStates.module.css';

export default function DigitalTwinView() {
  const racks = useMemo(() => generateRacks(), []);

  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [visibleRackTagIds, setVisibleRackTagIds] = useState<Set<string>>(
    () => new Set(racks.map((rack) => rack.rack_id))
  );
  const [activeDevice, setActiveDevice] = useState<DeviceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const focusedRack = useMemo(
    () => racks.find((rack) => rack.rack_id === selectedRackId) ?? null,
    [racks, selectedRackId]
  );
  const focusedRackTagsVisible = focusedRack
    ? visibleRackTagIds.has(focusedRack.rack_id)
    : false;

  // Toggle a device's selection state
  const handleToggleSelection = (deviceId: string, isSelected: boolean) => {
    setSelectedDeviceIds((prev) => {
      const next = new Set(prev);
      if (isSelected) next.add(deviceId);
      else next.delete(deviceId);
      return next;
    });
  };

  // Click handler: open info card for the clicked device
  const handleDeviceClick = (device: Device3D) => {
    const rack = racks.find((r) =>
      r.devices.some((d) => d.device_id === device.device_id)
    );
    if (rack) {
      setSelectedRackId(rack.rack_id);
    }
    setActiveDevice({
      device_id: device.device_id,
      hostname: device.hostname,
      ip_address: device.ip_address,
      device_type: device.device_type,
      status: device.status,
      manufacturer: device.manufacturer || 'Unknown',
      model: device.model || 'Unknown',
      firmware_version: device.firmware_version,
      location: rack ? rack.row_name : undefined,
      rack_position: device.rack_position,
      power_consumption: device.power_consumption,
      temperature: device.temperature,
      health_status: device.health_status,
      management_interface: device.management_interface,
      protocols_found: device.protocols_found,
      ports_count: device.ports_count,
      bmc_ip: device.bmc_ip,
      bmc_type: device.bmc_type,
      bmc_username: device.bmc_username,
      accelerators: device.accelerators,
      gpu_count: device.gpu_count,
      cluster_id: device.cluster_id,
      tenant: device.tenant,
      tags: device.tags,
      serial: device.serial,
      asset_tag: device.asset_tag,
      service_tag: device.service_tag,
    });
  };

  const handleRackClick = (rackId: string) => {
    setActiveDevice(null);
    setSelectedRackId((prev) => (prev === rackId ? null : rackId));
  };

  const handleToggleRackDeviceLabels = (rackId: string) => {
    setVisibleRackTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(rackId)) next.delete(rackId);
      else next.add(rackId);
      return next;
    });
  };

  // Aggregate stats for the HUD overlay
  const stats = useMemo(() => {
    let online = 0,
      warning = 0,
      critical = 0,
      total = 0;
    let totalPower = 0;
    racks.forEach((r) =>
      r.devices.forEach((d) => {
        total += 1;
        if (d.health_status === 'critical') critical += 1;
        else if (d.health_status === 'warning') warning += 1;
        else if (d.status === 'online') online += 1;
        totalPower += d.power_consumption || 0;
      })
    );
    return { online, warning, critical, total, totalPower };
  }, [racks]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {isLoading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <div className={styles.loadingTitle}>Loading 3D Scene</div>
          <div className={styles.loadingSubtitle}>
            Building data center environment…
          </div>
        </div>
      )}

      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={() => setIsLoading(false)}
        style={{ background: '#0f1116' }}
      >
        <PerspectiveCamera
          makeDefault
          position={HOME_CAMERA_POSITION.toArray()}
          fov={55}
          near={0.1}
          far={200}
        />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          minDistance={1.5}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minPolarAngle={Math.PI / 6}
          target={HOME_CAMERA_TARGET.toArray()}
        />

        {/* Keeps the camera and target inside the room walls */}
        <CameraBoundsLimiter />
        <RackCameraFocus rack={focusedRack} />

        {/*
         * Realistic data hall lighting:
         * Most of the visible illumination comes from the recessed
         * troffer panels in DataCenterEnvironment (each panel carries
         * its own pointLight). Here we just provide a clean fill so
         * shadow areas don't go pitch black. Avoid the previous
         * over-bright ambient + 9 corridor point lights stack — that
         * produced flat, "AI rendered" look with no contrast.
         */}

        {/* Modest ambient so deep crevices remain readable */}
        <ambientLight intensity={0.55} color="#cdd5e0" />

        {/* Cool/warm hemisphere fill to give the room a believable
            sky-and-floor tint without flattening it */}
        <hemisphereLight args={['#9eb6cc', '#171a22', 0.6]} />

        {/* Single main top-down directional light for shadow direction */}
        <directionalLight
          position={[0, 14, 2]}
          intensity={0.7}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={1}
          shadow-camera-far={25}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-bias={-0.0001}
          shadow-normalBias={0.05}
        />

        <Suspense fallback={null}>
          <DataCenterEnvironment regionName="US-EAST-1 / FLOOR 1" />

          <NetworkCables racks={racks} />

          {racks.map((rack) => (
            <ServerRack
              key={rack.rack_id}
              rack={rack}
              selectedDeviceIds={selectedDeviceIds}
              selectedRackId={selectedRackId}
              showDeviceLabels={visibleRackTagIds.has(rack.rack_id)}
              onRackClick={handleRackClick}
              onDeviceClick={handleDeviceClick}
              onToggleSelection={handleToggleSelection}
              onToggleRackDeviceLabels={handleToggleRackDeviceLabels}
            />
          ))}

          {/* Holographic technicians patrolling racks */}
          <GhostTechnicians racks={racks} count={3} />

          <Environment preset="night" background={false} />
        </Suspense>

        {/* Very light fog far in the distance */}
        <fog attach="fog" args={['#0f1116', 35, 80]} />
      </Canvas>

      {/* HUD — top-left stats panel */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          padding: '14px 18px',
          background: 'rgba(15, 15, 20, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 12,
          color: '#fff',
          fontFamily: "'Inter', -apple-system, sans-serif",
          minWidth: 240,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Data Center Digital Twin
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            fontSize: 13,
          }}
        >
          <Stat label="Total Devices" value={String(stats.total)} />
          <Stat
            label="Online"
            value={String(stats.online)}
            color="#10b981"
          />
          <Stat
            label="Warning"
            value={String(stats.warning)}
            color="#f59e0b"
          />
          <Stat
            label="Critical"
            value={String(stats.critical)}
            color="#ef4444"
          />
          <Stat
            label="Power"
            value={`${(stats.totalPower / 1000).toFixed(1)} kW`}
            color="#3b82f6"
          />
          <Stat
            label="Selected"
            value={String(selectedDeviceIds.size)}
            color="#00aaff"
          />
        </div>
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: 11,
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.55,
          }}
        >
          Drag to orbit · Scroll to zoom
          <br />
          Click a server to focus its rack
        </div>
      </div>

      {focusedRack && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            background: 'rgba(15, 15, 20, 0.86)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            color: '#fff',
            fontFamily: "'Inter', -apple-system, sans-serif",
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.28)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.48)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 2,
              }}
            >
              Focused Rack
            </div>
            <div style={{ fontSize: 14, fontWeight: 650 }}>
              {focusedRack.rack_name}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggleRackDeviceLabels(focusedRack.rack_id)}
            style={{
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {focusedRackTagsVisible ? 'Hide Tags' : 'Show Tags'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedRackId(null)}
            style={{
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset View
          </button>
        </div>
      )}

      {/* Device info panel */}
      {activeDevice && (
        <RackInfoCard
          deviceData={activeDevice}
          isSelected={selectedDeviceIds.has(activeDevice.device_id)}
          onClose={() => setActiveDevice(null)}
          onToggleSelection={handleToggleSelection}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color = '#fff',
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.45)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color,
          fontFamily: "'JetBrains Mono', 'Menlo', monospace",
        }}
      >
        {value}
      </div>
    </div>
  );
}
