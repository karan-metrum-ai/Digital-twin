/**
 * DellServer.tsx - Realistic Dell PowerEdge 1U rack server
 * 
 * Based on Dell PowerEdge R650/R660 series servers with:
 * - Metallic silver/gray chassis
 * - Drive bays on left side with latches
 * - Honeycomb ventilation grills on right
 * - Dell logo in center (gold/bronze)
 * - Blue power indicator
 * - Metal handles
 */

import { useMemo } from 'react';
import * as THREE from 'three';

interface DellServerProps {
  height?: number;
  isSelected?: boolean;
  healthStatus?: 'ok' | 'warning' | 'critical' | 'unknown';
  status?: 'online' | 'offline' | 'degraded';
}

export function DellServer({
  height = 0.052,
  isSelected = false,
  healthStatus = 'ok',
  status = 'online',
}: DellServerProps) {
  const materials = useMemo(() => ({
    chassis: new THREE.MeshStandardMaterial({
      color: '#8a8a90',
      metalness: 0.85,
      roughness: 0.25,
    }),
    chassisSelected: new THREE.MeshStandardMaterial({
      color: '#00ff88',
      emissive: '#00ff88',
      emissiveIntensity: 0.3,
      metalness: 0.7,
      roughness: 0.3,
    }),
    chassisCritical: new THREE.MeshStandardMaterial({
      color: '#5a4a4a',
      emissive: '#cc3333',
      emissiveIntensity: 0.2,
      metalness: 0.7,
      roughness: 0.35,
    }),
    bezel: new THREE.MeshStandardMaterial({
      color: '#2a2a2e',
      metalness: 0.6,
      roughness: 0.35,
    }),
    driveBay: new THREE.MeshStandardMaterial({
      color: '#1a1a1e',
      metalness: 0.5,
      roughness: 0.4,
    }),
    driveLatch: new THREE.MeshStandardMaterial({
      color: '#3a3a40',
      metalness: 0.8,
      roughness: 0.2,
    }),
    driveLatchButton: new THREE.MeshStandardMaterial({
      color: '#555560',
      metalness: 0.9,
      roughness: 0.15,
    }),
    grillFrame: new THREE.MeshStandardMaterial({
      color: '#252528',
      metalness: 0.7,
      roughness: 0.3,
    }),
    grillMesh: new THREE.MeshStandardMaterial({
      color: '#1a1a1e',
      metalness: 0.6,
      roughness: 0.4,
    }),
    handle: new THREE.MeshStandardMaterial({
      color: '#4a4a50',
      metalness: 0.85,
      roughness: 0.2,
    }),
    handleGrip: new THREE.MeshStandardMaterial({
      color: '#303035',
      metalness: 0.4,
      roughness: 0.6,
    }),
    dellLogo: new THREE.MeshStandardMaterial({
      color: '#b8860b',
      metalness: 0.95,
      roughness: 0.1,
      emissive: '#8b6508',
      emissiveIntensity: 0.15,
    }),
    blueLED: new THREE.MeshStandardMaterial({
      color: '#0088ff',
      emissive: '#0088ff',
      emissiveIntensity: 2.5,
    }),
    greenLED: new THREE.MeshStandardMaterial({
      color: '#00ff44',
      emissive: '#00ff44',
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
    offLED: new THREE.MeshStandardMaterial({
      color: '#222',
      emissive: '#111',
      emissiveIntensity: 0.05,
    }),
    edgeAccent: new THREE.MeshStandardMaterial({
      color: '#606068',
      metalness: 0.9,
      roughness: 0.1,
    }),
    ventSlot: new THREE.MeshStandardMaterial({
      color: '#0a0a0c',
      metalness: 0.3,
      roughness: 0.7,
    }),
  }), []);

  const chassisMaterial = isSelected 
    ? materials.chassisSelected 
    : healthStatus === 'critical' 
      ? materials.chassisCritical 
      : materials.chassis;

  const statusLED = isSelected 
    ? materials.greenLED
    : healthStatus === 'critical' 
      ? materials.redLED 
      : healthStatus === 'warning'
        ? materials.yellowLED
        : status === 'online'
          ? materials.greenLED
          : materials.offLED;

  const powerLED = status === 'online' ? materials.blueLED : materials.offLED;

  const serverWidth = 0.52;
  const serverDepth = 0.68;
  const bezelDepth = 0.012;
  const bezelZ = 0.34;

  return (
    <group>
      {/* Main chassis body */}
      <mesh
        castShadow
        material={chassisMaterial}
      >
        <boxGeometry args={[serverWidth, height * 1.1, serverDepth]} />
      </mesh>

      {/* Front bezel - dark panel */}
      <mesh position={[0, 0, bezelZ]} material={materials.bezel}>
        <boxGeometry args={[serverWidth + 0.02, height * 1.15, bezelDepth]} />
      </mesh>

      {/* Top edge accent */}
      <mesh position={[0, height * 0.56, bezelZ + 0.003]} material={materials.edgeAccent}>
        <boxGeometry args={[serverWidth + 0.03, 0.004, 0.008]} />
      </mesh>

      {/* Bottom edge accent */}
      <mesh position={[0, -height * 0.56, bezelZ + 0.003]} material={materials.edgeAccent}>
        <boxGeometry args={[serverWidth + 0.03, 0.004, 0.008]} />
      </mesh>

      {/* === LEFT SECTION: Drive Bays === */}
      <group position={[-0.14, 0, bezelZ]}>
        {/* Drive bay background */}
        <mesh position={[0, 0, 0.002]} material={materials.driveBay}>
          <boxGeometry args={[0.22, height * 0.95, 0.008]} />
        </mesh>

        {/* Individual drive slots (4 bays for 1U) */}
        {[-0.075, -0.025, 0.025, 0.075].map((xOffset, i) => (
          <group key={i} position={[xOffset, 0, 0.008]}>
            {/* Drive carrier frame */}
            <mesh material={materials.driveLatch}>
              <boxGeometry args={[0.042, height * 0.8, 0.006]} />
            </mesh>
            
            {/* Drive slot opening (dark) */}
            <mesh position={[0, 0, 0.002]} material={materials.ventSlot}>
              <boxGeometry args={[0.036, height * 0.6, 0.003]} />
            </mesh>
            
            {/* Latch button */}
            <mesh position={[0, height * 0.3, 0.004]} material={materials.driveLatchButton}>
              <boxGeometry args={[0.018, 0.008, 0.004]} />
            </mesh>
            
            {/* Drive activity LED */}
            <mesh position={[0, -height * 0.32, 0.004]} material={i === 0 ? statusLED : materials.greenLED}>
              <boxGeometry args={[0.006, 0.006, 0.003]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* === CENTER: Dell Logo === */}
      <group position={[0.02, 0, bezelZ + 0.008]}>
        {/* Logo background plate */}
        <mesh material={materials.bezel}>
          <boxGeometry args={[0.08, height * 0.5, 0.003]} />
        </mesh>
        
        {/* DELL text - simplified geometric representation */}
        <group position={[0, 0, 0.003]}>
          {/* D */}
          <mesh position={[-0.024, 0, 0]} material={materials.dellLogo}>
            <boxGeometry args={[0.012, height * 0.32, 0.002]} />
          </mesh>
          {/* E */}
          <mesh position={[-0.008, 0, 0]} material={materials.dellLogo}>
            <boxGeometry args={[0.01, height * 0.32, 0.002]} />
          </mesh>
          {/* L */}
          <mesh position={[0.006, 0, 0]} material={materials.dellLogo}>
            <boxGeometry args={[0.008, height * 0.32, 0.002]} />
          </mesh>
          {/* L */}
          <mesh position={[0.018, 0, 0]} material={materials.dellLogo}>
            <boxGeometry args={[0.008, height * 0.32, 0.002]} />
          </mesh>
        </group>
      </group>

      {/* === RIGHT SECTION: Ventilation Grills === */}
      <group position={[0.16, 0, bezelZ]}>
        {/* Grill frame */}
        <mesh position={[0, 0, 0.002]} material={materials.grillFrame}>
          <boxGeometry args={[0.16, height * 0.95, 0.008]} />
        </mesh>

        {/* Honeycomb pattern - simplified hexagonal grid */}
        {[[-0.055, 0.012], [-0.025, -0.006], [0.005, 0.012], [0.035, -0.006], [0.065, 0.012],
          [-0.04, 0.006], [-0.01, 0.018], [0.02, 0.006], [0.05, 0.018],
          [-0.055, -0.012], [-0.025, 0.006], [0.005, -0.012], [0.035, 0.006], [0.065, -0.012],
        ].map(([x, y], i) => (
          <mesh key={i} position={[x, y * height * 3, 0.007]} material={materials.ventSlot}>
            <cylinderGeometry args={[0.012, 0.012, 0.004, 6]} />
          </mesh>
        ))}

        {/* Additional vent slots */}
        <mesh position={[0, 0, 0.008]} material={materials.grillMesh}>
          <boxGeometry args={[0.14, height * 0.75, 0.003]} />
        </mesh>
      </group>

      {/* === FAR LEFT: Power/ID Button === */}
      <group position={[-0.245, 0, bezelZ + 0.005]}>
        {/* Button housing */}
        <mesh material={materials.handleGrip}>
          <boxGeometry args={[0.02, height * 0.4, 0.008]} />
        </mesh>
        
        {/* Power LED indicator */}
        <mesh position={[0, 0, 0.005]} material={powerLED}>
          <cylinderGeometry args={[0.004, 0.004, 0.003, 8]} />
        </mesh>
      </group>

      {/* === HANDLES === */}
      {/* Left handle */}
      <group position={[-0.268, 0, bezelZ]}>
        {/* Handle bracket */}
        <mesh material={materials.handle}>
          <boxGeometry args={[0.018, height * 0.9, 0.015]} />
        </mesh>
        {/* Grip texture */}
        <mesh position={[-0.002, 0, 0.008]} material={materials.handleGrip}>
          <boxGeometry args={[0.012, height * 0.6, 0.008]} />
        </mesh>
      </group>

      {/* Right handle */}
      <group position={[0.268, 0, bezelZ]}>
        {/* Handle bracket */}
        <mesh material={materials.handle}>
          <boxGeometry args={[0.018, height * 0.9, 0.015]} />
        </mesh>
        {/* Grip texture */}
        <mesh position={[0.002, 0, 0.008]} material={materials.handleGrip}>
          <boxGeometry args={[0.012, height * 0.6, 0.008]} />
        </mesh>
      </group>

      {/* === STATUS INDICATORS === */}
      {/* Status LED row - right side */}
      <group position={[0.22, height * 0.35, bezelZ + 0.007]}>
        <mesh material={statusLED}>
          <boxGeometry args={[0.02, 0.008, 0.003]} />
        </mesh>
      </group>

      {/* Activity LED */}
      <group position={[0.22, -height * 0.35, bezelZ + 0.007]}>
        <mesh material={status === 'online' ? materials.greenLED : materials.offLED}>
          <boxGeometry args={[0.02, 0.008, 0.003]} />
        </mesh>
      </group>

      {/* === SIDE RAILS === */}
      {/* Left rail */}
      <mesh position={[-0.27, 0, 0]} material={materials.edgeAccent}>
        <boxGeometry args={[0.008, height * 1.05, serverDepth * 0.95]} />
      </mesh>

      {/* Right rail */}
      <mesh position={[0.27, 0, 0]} material={materials.edgeAccent}>
        <boxGeometry args={[0.008, height * 1.05, serverDepth * 0.95]} />
      </mesh>
    </group>
  );
}

export default DellServer;
