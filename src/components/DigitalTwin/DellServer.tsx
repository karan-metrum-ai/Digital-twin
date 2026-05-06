/**
 * DellServer.tsx - Dell EMC PowerEdge rack server with full-front honeycomb grill
 * 
 * OPTIMIZED: Uses texture-based honeycomb pattern instead of instanced geometry
 * to dramatically reduce triangle count while maintaining visual quality.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

interface DellServerProps {
  height?: number;
  isSelected?: boolean;
  healthStatus?: 'ok' | 'warning' | 'critical' | 'unknown';
  status?: 'online' | 'offline' | 'degraded';
}

// Shared across all DellServer instances - created once
let sharedGrillTexture: THREE.CanvasTexture | null = null;
let sharedLogoTexture: THREE.CanvasTexture | null = null;

function getSharedGrillTexture(): THREE.CanvasTexture {
  if (sharedGrillTexture) return sharedGrillTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Dark background
  ctx.fillStyle = '#1a1a1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw honeycomb pattern
  const hexRadius = 8;
  const hexHeight = hexRadius * Math.sqrt(3);
  const colStep = hexRadius * 1.5;
  const rowStep = hexHeight;

  ctx.strokeStyle = '#2a2a30';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#0a0a0c';

  for (let col = -1; col < canvas.width / colStep + 2; col++) {
    for (let row = -1; row < canvas.height / rowStep + 2; row++) {
      const x = col * colStep;
      const y = row * rowStep + (col % 2 === 1 ? rowStep / 2 : 0);
      
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const px = x + hexRadius * Math.cos(angle);
        const py = y + hexRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  sharedGrillTexture = new THREE.CanvasTexture(canvas);
  sharedGrillTexture.wrapS = THREE.RepeatWrapping;
  sharedGrillTexture.wrapT = THREE.RepeatWrapping;
  sharedGrillTexture.repeat.set(4, 1);
  sharedGrillTexture.colorSpace = THREE.SRGBColorSpace;
  sharedGrillTexture.needsUpdate = true;
  return sharedGrillTexture;
}

function getSharedLogoTexture(): THREE.CanvasTexture {
  if (sharedLogoTexture) return sharedLogoTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const FONT_SIZE = 75;
  ctx.font = `900 ${FONT_SIZE}px "Arial Narrow", Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 8;

  const cy = canvas.height / 2;
  const measure = (s: string) => ctx.measureText(s).width;
  const dW = measure('D');
  const eW = measure('E');
  const llW = measure('LL');
  const gap = FONT_SIZE * 0.20;
  const emcW = measure('EMC');
  const totalW = dW + eW + llW + gap + emcW;
  let cx = (canvas.width - totalW) / 2;

  // Draw "D"
  ctx.textAlign = 'left';
  ctx.fillText('D', cx, cy);
  cx += dW;

  // Draw "E" rotated -45 degrees (Dell logo style)
  ctx.save();
  ctx.translate(cx + eW / 2, cy);
  ctx.rotate(-45 * Math.PI / 180);
  ctx.textAlign = 'center';
  ctx.fillText('E', 0, 0);
  ctx.restore();
  cx += eW;

  // Draw "LL"
  ctx.textAlign = 'left';
  ctx.fillText('LL', cx, cy);
  cx += llW + gap;

  // Draw "EMC" in slightly darker color
  ctx.fillStyle = '#a0a0a8';
  ctx.fillText('EMC', cx, cy);

  sharedLogoTexture = new THREE.CanvasTexture(canvas);
  sharedLogoTexture.anisotropy = 16;
  sharedLogoTexture.colorSpace = THREE.SRGBColorSpace;
  sharedLogoTexture.premultiplyAlpha = true;
  sharedLogoTexture.needsUpdate = true;
  return sharedLogoTexture;
}

// Shared materials - created once, reused by all instances
const sharedMaterials = {
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
  frameBorder: new THREE.MeshStandardMaterial({
    color: '#161618',
    metalness: 0.9,
    roughness: 0.44,
  }),
  mountingFlange: new THREE.MeshStandardMaterial({
    color: '#161618',
    metalness: 0.95,
    roughness: 0.44,
  }),
  lockCylinder: new THREE.MeshStandardMaterial({
    color: '#3a3a42',
    metalness: 0.94,
    roughness: 0.38,
  }),
  blueLED: new THREE.MeshStandardMaterial({
    color: '#00aaff',
    emissive: '#00aaff',
    emissiveIntensity: 3.0,
  }),
  greenLED: new THREE.MeshStandardMaterial({
    color: '#00ff44',
    emissive: '#00ff44',
    emissiveIntensity: 2.5,
  }),
  yellowLED: new THREE.MeshStandardMaterial({
    color: '#ffcc00',
    emissive: '#ffcc00',
    emissiveIntensity: 2.5,
  }),
  redLED: new THREE.MeshStandardMaterial({
    color: '#ff3300',
    emissive: '#ff3300',
    emissiveIntensity: 3.0,
  }),
  offLED: new THREE.MeshStandardMaterial({
    color: '#333',
    emissive: '#111',
    emissiveIntensity: 0.1,
  }),
  edgeAccent: new THREE.MeshStandardMaterial({
    color: '#606068',
    metalness: 0.9,
    roughness: 0.1,
  }),
};

// Shared geometries - created once
const sharedGeometries = {
  ledBox: new THREE.BoxGeometry(0.012, 0.008, 0.004),
  lockCylinder: new THREE.CylinderGeometry(0.006, 0.006, 0.008, 8),
  lockSlot: new THREE.BoxGeometry(0.006, 0.002, 0.002),
  topStrip: new THREE.BoxGeometry(0.06, 0.003, 0.003),
};

export function DellServer({
  height = 0.052,
  isSelected = false,
  healthStatus = 'ok',
  status = 'online',
}: DellServerProps) {
  const chassisMaterial = isSelected 
    ? sharedMaterials.chassisSelected 
    : healthStatus === 'critical' 
      ? sharedMaterials.chassisCritical 
      : sharedMaterials.chassis;

  const statusLED = isSelected 
    ? sharedMaterials.greenLED
    : healthStatus === 'critical' 
      ? sharedMaterials.redLED 
      : healthStatus === 'warning'
        ? sharedMaterials.yellowLED
        : status === 'online'
          ? sharedMaterials.greenLED
          : sharedMaterials.offLED;

  const powerLED = status === 'online' ? sharedMaterials.blueLED : sharedMaterials.offLED;
  const activityLED = status === 'online' ? sharedMaterials.yellowLED : sharedMaterials.offLED;

  const serverWidth = 0.52;
  const serverDepth = 0.68;
  const bezelZ = 0.34;
  const frontZ = bezelZ + 0.015;

  const grillWidth = serverWidth - 0.02;
  const grillHeight = height * 0.9;
  const borderWidth = 0.006;

  // Texture-based grill material (shared texture, unique material for proper disposal)
  const grillMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: getSharedGrillTexture(),
      metalness: 0.7,
      roughness: 0.5,
    });
  }, []);

  const logoMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: getSharedLogoTexture(),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
  }, []);

  // Memoized geometries that depend on height
  const chassisGeo = useMemo(() => 
    new THREE.BoxGeometry(serverWidth, height * 1.1, serverDepth), 
    [height]
  );
  
  const grillGeo = useMemo(() => 
    new THREE.BoxGeometry(grillWidth, grillHeight, 0.006), 
    [grillWidth, grillHeight]
  );

  const borderVerticalGeo = useMemo(() => 
    new THREE.BoxGeometry(borderWidth, grillHeight, 0.01), 
    [grillHeight]
  );

  const borderHorizontalGeo = useMemo(() => 
    new THREE.BoxGeometry(grillWidth, borderWidth, 0.01), 
    [grillWidth]
  );

  const flangeGeo = useMemo(() => 
    new THREE.BoxGeometry(0.024, grillHeight + 0.006, 0.01), 
    [grillHeight]
  );

  return (
    <group>
      {/* Main chassis body */}
      <mesh castShadow geometry={chassisGeo} material={chassisMaterial} />

      {/* === FULL-FRONT HONEYCOMB GRILL PANEL (texture-based) === */}
      <group position={[0, 0, bezelZ]}>
        {/* Grill panel with honeycomb texture */}
        <mesh position={[0, 0, 0.003]} geometry={grillGeo} material={grillMaterial} />

        {/* Frame borders */}
        <mesh position={[-(grillWidth / 2 - borderWidth / 2), 0, 0.005]} geometry={borderVerticalGeo} material={sharedMaterials.frameBorder} />
        <mesh position={[(grillWidth / 2 - borderWidth / 2), 0, 0.005]} geometry={borderVerticalGeo} material={sharedMaterials.frameBorder} />
        <mesh position={[0, (grillHeight / 2 - borderWidth / 2), 0.005]} geometry={borderHorizontalGeo} material={sharedMaterials.frameBorder} />
        <mesh position={[0, -(grillHeight / 2 - borderWidth / 2), 0.005]} geometry={borderHorizontalGeo} material={sharedMaterials.frameBorder} />

        {/* DELL EMC Logo - same style as DellGrill with rotated E */}
        <mesh position={[0.005, 0, 0.015]} material={logoMaterial} renderOrder={20}>
          <planeGeometry args={[0.12, 0.03]} />
        </mesh>
      </group>

      {/* === SIDE MOUNTING FLANGES === */}
      <mesh position={[-(serverWidth / 2 + 0.012), 0, bezelZ + 0.002]} geometry={flangeGeo} material={sharedMaterials.mountingFlange} />
      <mesh position={[(serverWidth / 2 + 0.012), 0, bezelZ + 0.002]} geometry={flangeGeo} material={sharedMaterials.mountingFlange} />

      {/* === LEFT SIDE LEDs === */}
      <mesh position={[-(serverWidth / 2 + 0.012), height * 0.18, frontZ]} geometry={sharedGeometries.ledBox} material={powerLED} />
      <mesh position={[-(serverWidth / 2 + 0.012), -height * 0.18, frontZ]} geometry={sharedGeometries.ledBox} material={sharedMaterials.blueLED} />

      {/* === RIGHT SIDE LEDs === */}
      <mesh position={[(serverWidth / 2 + 0.012), height * 0.18, frontZ]} geometry={sharedGeometries.ledBox} material={statusLED} />
      <mesh position={[(serverWidth / 2 + 0.012), -height * 0.18, frontZ]} geometry={sharedGeometries.ledBox} material={activityLED} />

      {/* === LOCK CYLINDER === */}
      <group position={[(grillWidth / 2 - 0.025), -(grillHeight / 2 - 0.012), frontZ]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} geometry={sharedGeometries.lockCylinder} material={sharedMaterials.lockCylinder} />
        <mesh position={[0, 0, 0.005]} geometry={sharedGeometries.lockSlot} material={sharedMaterials.frameBorder} />
      </group>

      {/* === TOP STATUS STRIP === */}
      <mesh position={[0, height * 0.56, frontZ - 0.003]} geometry={sharedGeometries.topStrip} material={statusLED} />

      {/* === FRONT EDGE ACCENTS === */}
      <mesh position={[0, height * 0.555, bezelZ + 0.008]}>
        <boxGeometry args={[serverWidth + 0.05, 0.003, 0.003]} />
        <primitive object={sharedMaterials.edgeAccent} attach="material" />
      </mesh>
      <mesh position={[0, -height * 0.555, bezelZ + 0.008]}>
        <boxGeometry args={[serverWidth + 0.05, 0.003, 0.003]} />
        <primitive object={sharedMaterials.edgeAccent} attach="material" />
      </mesh>
    </group>
  );
}

export default DellServer;
