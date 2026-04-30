/**
 * One hex-ring BufferGeometry for all Dell EMC grills — lowers unique geometry count.
 * Kept at module scope (not disposed) for the app lifetime.
 */
import * as THREE from 'three';

const PW = 12.0;
const PH = 3.0;
const PD = 0.44;
const R_OUT = 0.85;
const R_IN = 0.75;
const DEPTH = PD + 0.06;

function buildHexRingGeometry(): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const hole = new THREE.Path();

    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        if (i === 0) {
            shape.moveTo(R_OUT * Math.cos(a), R_OUT * Math.sin(a));
            hole.moveTo(R_IN * Math.cos(a), R_IN * Math.sin(a));
        } else {
            shape.lineTo(R_OUT * Math.cos(a), R_OUT * Math.sin(a));
            hole.lineTo(R_IN * Math.cos(a), R_IN * Math.sin(a));
        }
    }
    shape.closePath();
    hole.closePath();
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: DEPTH,
        bevelEnabled: false,
        curveSegments: 1,
    });
    geo.translate(0, 0, -DEPTH / 2);
    return geo;
}

/** Slightly coarser hex grid than the original — still reads as honeycomb at rack scale. */
export function buildGrillGridPositions(): [number, number][] {
    const COL_STEP = 1.5 * R_OUT;
    const ROW_STEP = Math.sqrt(3) * R_OUT;
    const V_OFF = ROW_STEP / 2;
    const CLIP_HW = PW / 2;
    const CLIP_HH = PH / 2;
    const HEX_HALF_W = R_OUT;
    const HEX_HALF_H = R_OUT * Math.sqrt(3) / 2;

    const pts: [number, number][] = [];
    for (let col = -10; col <= 10; col++) {
        for (let row = -5; row <= 5; row++) {
            const x = col * COL_STEP;
            const y = row * ROW_STEP + (Math.abs(col) % 2 === 1 ? V_OFF : 0);

            if (Math.abs(x) + HEX_HALF_W > CLIP_HW) continue;
            if (Math.abs(y) + HEX_HALF_H > CLIP_HH) continue;

            pts.push([x, y]);
        }
    }
    return pts;
}

export const GRILL_HEX_DEPTH = DEPTH;
export const sharedGrillHexGeometry = buildHexRingGeometry();
