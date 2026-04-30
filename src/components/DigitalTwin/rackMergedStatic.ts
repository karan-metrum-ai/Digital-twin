/**
 * Pre-merged static rack geometry (one buffer per material group).
 * Cuts draw calls for frame/back/door/glass/LED/rails without changing appearance.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rackGeo } from './rackSharedGeometries';

type Part = {
    geometry: THREE.BufferGeometry;
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
};

function mergeParts(parts: Part[]): THREE.BufferGeometry {
    const m = new THREE.Matrix4();
    const v = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const geoms: THREE.BufferGeometry[] = [];

    for (const p of parts) {
        const g = p.geometry.clone();
        v.set(...p.position);
        q.setFromEuler(new THREE.Euler(...(p.rotation ?? [0, 0, 0])));
        s.set(...(p.scale ?? [1, 1, 1]));
        m.compose(v, q, s);
        g.applyMatrix4(m);
        geoms.push(g);
    }

    if (geoms.length === 1) {
        return geoms[0];
    }

    const merged = mergeGeometries(geoms);
    for (const g of geoms) {
        g.dispose();
    }
    if (!merged) {
        throw new Error('rackMergedStatic: mergeGeometries returned null');
    }
    return merged;
}

export const mergedRackStaticGeo = {
    rackFrame: mergeParts([
        { geometry: rackGeo.post, position: [0, 0, 0] },
        { geometry: rackGeo.post, position: [0.58, 0, 0] },
        { geometry: rackGeo.post, position: [0, 0, -0.44] },
        { geometry: rackGeo.post, position: [0.58, 0, -0.44] },
        { geometry: rackGeo.topBottom, position: [0.29, 0.93, -0.22] },
        { geometry: rackGeo.topBottom, position: [0.29, -0.93, -0.22] },
    ]),
    rackBack: mergeParts([
        { geometry: rackGeo.rackBack, position: [0.29, 0, -0.46] },
    ]),
    doorFrame: mergeParts([
        { geometry: rackGeo.doorFrameVertical, position: [-0.01, 0, 0.48] },
        { geometry: rackGeo.doorFrameVertical, position: [0.59, 0, 0.48] },
        { geometry: rackGeo.doorFrameHorizontal, position: [0.29, 0.91, 0.48] },
        { geometry: rackGeo.doorFrameHorizontal, position: [0.29, -0.91, 0.48] },
    ]),
    glassDoor: mergeParts([
        { geometry: rackGeo.glassDoor, position: [0.29, 0, 0.49] },
    ]),
    verticalLedStrip: mergeParts([
        { geometry: rackGeo.verticalLedStrip, position: [-0.025, 0, 0.02] },
        { geometry: rackGeo.verticalLedStrip, position: [0.605, 0, 0.02] },
    ]),
    topIndicator: mergeParts([
        { geometry: rackGeo.topIndicator, position: [0.29, 0.88, 0.46] },
    ]),
    rail: mergeParts([
        { geometry: rackGeo.rail, position: [0.05, 0, 0.38] },
        { geometry: rackGeo.rail, position: [0.53, 0, 0.38] },
    ]),
} as const;
