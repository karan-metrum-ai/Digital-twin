/**
 * DellGrill.tsx - Dell EMC server bezel with honeycomb grill.
 * Uses flat-top hexagons in a column-based layout.
 * Cells may bleed into the bezel border region but never past the outer panel edge.
 * Frame strips are extruded slightly deeper than the hex cells so they mask overflow.
 */

import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import {
  buildGrillGridPositions,
  GRILL_HEX_DEPTH,
  sharedGrillHexGeometry,
} from './dellGrillShared';

interface DellGrillProps {
  position?: [number, number, number];
}

export function DellGrill({ position = [0, 0, 0] }: DellGrillProps) {
  // Panel dimensions
  const PW   = 12.0;
  const PH   = 3.0;
  const PD   = 0.44;
  const EDGE = 0.12;
  const DEPTH = GRILL_HEX_DEPTH;

  // ── Grid positions (coarser than v1; shared hex ring geometry) ───────────
  const gridPositions = useMemo(() => buildGrillGridPositions(), []);

  // ── Shared materials ──────────────────────────────────────────────────────
  const grillMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1d1d21,
    roughness: 0.54,
    metalness: 0.88,
  }), []);

  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1a1a1e,
    roughness: 0.50,
    metalness: 0.90,
  }), []);

  // ── InstancedMesh ─────────────────────────────────────────────────────────
  const hexInst = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      sharedGrillHexGeometry,
      grillMat,
      gridPositions.length
    );
    const dummy = new THREE.Object3D();
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    gridPositions.forEach(([x, y], i) => {
      dummy.position.set(x, y, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }, [grillMat, gridPositions]);

  const logoTex = useMemo(() => {
    const cvs = document.createElement('canvas');
    cvs.width  = 1024;
    cvs.height = 256;
    const ctx  = cvs.getContext('2d')!;
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    const FONT_SIZE = 150;
    ctx.font         = `900 ${FONT_SIZE}px "Arial Narrow", Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ffffff';
    ctx.shadowColor  = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur   = 8;

    const cy = cvs.height / 2;
    const measure = (s: string) => ctx.measureText(s).width;
    const dW   = measure('D');
    const eW   = measure('E');
    const llW  = measure('LL');
    const gap  = FONT_SIZE * 0.20;
    const emcW = measure('EMC');
    const totalW = dW + eW + llW + gap + emcW;
    let cx = (cvs.width - totalW) / 2;

    ctx.textAlign = 'left';
    ctx.fillText('D', cx, cy);
    cx += dW;

    ctx.save();
    ctx.translate(cx + eW / 2, cy);
    ctx.rotate(-45 * Math.PI / 180);
    ctx.textAlign = 'center';
    ctx.fillText('E', 0, 0);
    ctx.restore();
    cx += eW;

    ctx.textAlign = 'left';
    ctx.fillText('LL', cx, cy);
    cx += llW + gap;
    ctx.fillText('EMC', cx, cy);

    const tex = new THREE.CanvasTexture(cvs);
    tex.anisotropy = 16;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.premultiplyAlpha = true;
    tex.needsUpdate = true;
    return tex;
  }, []);

  // ── Cleanup GPU resources on unmount (shared hex geometry is module-owned) ─
  useEffect(() => {
    return () => {
      grillMat.dispose();
      frameMat.dispose();
      logoTex.dispose();
      hexInst.dispose();
    };
  }, [grillMat, frameMat, logoTex, hexInst]);

  return (
    <group position={position}>

      {/* Honeycomb (flat-top, instanced)
          Shifted forward by DEPTH/2 so the front face is at z=DEPTH —
          cells protrude clearly past the frame border strips.            */}
      <group position={[0, 0, DEPTH / 2]}>
        <primitive object={hexInst} />
      </group>

      {/* ── Frame border strips ──────────────────────────────────────────────
           Depth = DEPTH + 0.02 so the front face sits 0.01 units in front of
           the hex cells, cleanly masking any geometry that bleeds into the border. */}
      <mesh position={[-(PW / 2 - EDGE / 2), 0, 0]} castShadow>
        <boxGeometry args={[EDGE, PH, DEPTH + 0.02]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      <mesh position={[PW / 2 - EDGE / 2, 0, 0]} castShadow>
        <boxGeometry args={[EDGE, PH, DEPTH + 0.02]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      <mesh position={[0, PH / 2 - EDGE / 2, 0]} castShadow>
        <boxGeometry args={[PW, EDGE, DEPTH + 0.02]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      <mesh position={[0, -(PH / 2 - EDGE / 2), 0]} castShadow>
        <boxGeometry args={[PW, EDGE, DEPTH + 0.02]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      {/* ── Side mounting flanges ────────────────────────────────────────── */}
      <mesh position={[-(PW / 2 + 0.29), 0, -PD / 2 + 0.05]}>
        <boxGeometry args={[0.58, PH + 0.10, 0.10]} />
        <meshStandardMaterial color={0x161618} roughness={0.44} metalness={0.95} />
      </mesh>

      <mesh position={[PW / 2 + 0.29, 0, -PD / 2 + 0.05]}>
        <boxGeometry args={[0.58, PH + 0.10, 0.10]} />
        <meshStandardMaterial color={0x161618} roughness={0.44} metalness={0.95} />
      </mesh>

      {/* ── Dell EMC logo ────────────────────────────────────────────────── */}
      <mesh position={[0.12, 0, DEPTH + 0.32]} renderOrder={20}>
        <planeGeometry args={[3.0, 0.75]} />
        <meshBasicMaterial
          map={logoTex}
          transparent
          opacity={1.0}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
          premultipliedAlpha
        />
      </mesh>

      {/* ── Lock cylinder - lower right ───────────────────────────────────── */}
      <group position={[PW / 2 - 0.46, -(PH / 2 - 0.40), DEPTH + 1]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.155, 0.155, 0.13, 12]} />
          <meshStandardMaterial color={0x2c2c32} roughness={0.38} metalness={0.94} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.065, 0.19, 0.14]} />
          <meshStandardMaterial color={0x0d0d0f} roughness={0.85} metalness={0.3} />
        </mesh>
      </group>

    </group>
  );
}
