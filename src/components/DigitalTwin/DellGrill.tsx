/**
 * DellGrill.tsx - Dell EMC server bezel with honeycomb grill.
 * Uses flat-top hexagons in a column-based layout.
 * Cells may bleed into the bezel border region but never past the outer panel edge.
 * Frame strips are extruded slightly deeper than the hex cells so they mask overflow.
 */

import * as THREE from 'three';
import { useEffect, useMemo } from 'react';

interface DellGrillProps {
  position?: [number, number, number];
}

export function DellGrill({ position = [0, 0, 0] }: DellGrillProps) {
  // Panel dimensions
  const PW   = 12.0;
  const PH   = 3.0;
  const PD   = 0.44;
  const EDGE = 0.12;

  // ── Hex parameters - FLAT-TOP orientation ────────────────────────────────
  const R_OUT = 0.85;
  const R_IN  = 0.75;
  const DEPTH = PD + 0.06;

  const COL_STEP  = 1.5 * R_OUT;
  const ROW_STEP  = Math.sqrt(3) * R_OUT;
  const V_OFF     = ROW_STEP / 2;

  const CLIP_HW   = PW / 2;
  const CLIP_HH   = PH / 2;

  const HEX_HALF_W = R_OUT;
  const HEX_HALF_H = R_OUT * Math.sqrt(3) / 2;

  // ── Hex ring geometry (flat-top) ─────────────────────────────────────────
  const hexGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const hole  = new THREE.Path();

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      if (i === 0) {
        shape.moveTo(R_OUT * Math.cos(a), R_OUT * Math.sin(a));
        hole.moveTo(R_IN  * Math.cos(a), R_IN  * Math.sin(a));
      } else {
        shape.lineTo(R_OUT * Math.cos(a), R_OUT * Math.sin(a));
        hole.lineTo(R_IN  * Math.cos(a), R_IN  * Math.sin(a));
      }
    }
    shape.closePath();
    hole.closePath();
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    // Centre the geometry on z=0 first, then the wrapper group below
    // shifts it forward by DEPTH/2 so the front face lands at z=DEPTH
    // (fully forward) and the back face sits at z=0 (flush with the frame).
    geo.translate(0, 0, -DEPTH / 2);
    return geo;
  }, []);

  // ── Grid positions ────────────────────────────────────────────────────────
  const gridPositions = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];

    for (let col = -12; col <= 12; col++) {
      for (let row = -6; row <= 6; row++) {
        const x = col * COL_STEP;
        const y = row * ROW_STEP + (Math.abs(col) % 2 === 1 ? V_OFF : 0);

        if (Math.abs(x) + HEX_HALF_W > CLIP_HW) continue;
        if (Math.abs(y) + HEX_HALF_H > CLIP_HH) continue;

        pts.push([x, y]);
      }
    }
    return pts;
  }, []);

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
    const mesh  = new THREE.InstancedMesh(hexGeo, grillMat, gridPositions.length);
    const dummy = new THREE.Object3D();
    mesh.castShadow    = true;
    mesh.receiveShadow = true;

    gridPositions.forEach(([x, y], i) => {
      dummy.position.set(x, y, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }, [hexGeo, grillMat, gridPositions]);

  // ── Logo texture ──────────────────────────────────────────────────────────
  const logoTex = useMemo(() => {
    const cvs = document.createElement('canvas');
    cvs.width  = 1024;
    cvs.height = 256;
    const ctx  = cvs.getContext('2d')!;
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    // Subtle glow background so text pops against the dark grill
    const grad = ctx.createRadialGradient(
      cvs.width / 2, cvs.height / 2, 0,
      cvs.width / 2, cvs.height / 2, cvs.width / 2,
    );
    grad.addColorStop(0,   'rgba(200,200,220,0.10)');
    grad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    const FONT = 'bold 128px "Arial Narrow", Arial, sans-serif';
    ctx.font         = FONT;
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#dddddd';
    ctx.textAlign    = 'left';

    const DW   = ctx.measureText('D').width;
    const EW   = ctx.measureText('E').width;
    const LLW  = ctx.measureText('LL').width;
    const spW  = ctx.measureText(' ').width;
    const EMCW = ctx.measureText('EMC').width;

    const totalW = DW + EW + LLW + spW + EMCW;
    let cx = (cvs.width - totalW) / 2;
    const cy = cvs.height / 2;

    ctx.fillText('D', cx, cy);
    cx += DW;

    ctx.save();
    ctx.translate(cx + EW / 2, cy);
    ctx.rotate(-40 * Math.PI / 180);
    ctx.textAlign = 'center';
    ctx.fillText('E', 0, 0);
    ctx.restore();
    cx += EW;

    ctx.textAlign = 'left';
    ctx.fillText('LL', cx, cy);
    cx += LLW + spW;

    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('EMC', cx, cy);

    const tex = new THREE.CanvasTexture(cvs);
    tex.anisotropy = 16;
    return tex;
  }, []);

  // ── Cleanup GPU resources on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      hexGeo.dispose();
      grillMat.dispose();
      frameMat.dispose();
      logoTex.dispose();
      hexInst.dispose();
    };
  }, [hexGeo, grillMat, frameMat, logoTex, hexInst]);

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
      <mesh position={[0.12, 0, DEPTH + 0.02]}>
        <planeGeometry args={[5.2, 1.30]} />
        <meshStandardMaterial
          map={logoTex}
          emissiveMap={logoTex}
          emissive="#ffffff"
          emissiveIntensity={0.55}
          transparent
          opacity={1.0}
          depthWrite={false}
        />
      </mesh>

      {/* ── Lock cylinder - lower right ───────────────────────────────────── */}
      <group position={[PW / 2 - 0.46, -(PH / 2 - 0.40), DEPTH + 1]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.155, 0.155, 0.13, 24]} />
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
