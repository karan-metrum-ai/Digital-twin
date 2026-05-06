/**
 * Pre-merged static rack geometry (one buffer per material group).
 * Fully enclosed Dell-style server rack - no gaps on sides or top.
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

// Rack center X position
const CX = 0.3;
// Rack center Z position (depth center) - moved forward to cover servers
const CZ = 0.1;

export const mergedRackStaticGeo = {
    // Main frame (4 corner posts) - hidden inside panels
    rackFrame: mergeParts([
        { geometry: rackGeo.post, position: [0.02, 0, 0.45] },
        { geometry: rackGeo.post, position: [0.58, 0, 0.45] },
        { geometry: rackGeo.post, position: [0.02, 0, -0.25] },
        { geometry: rackGeo.post, position: [0.58, 0, -0.25] },
    ]),

    // Back panel - fully closes the back
    rackBack: mergeParts([
        { geometry: rackGeo.rackBack, position: [CX, 0, -0.27] },
    ]),

    // Top panel - fully closes the top
    topPanel: mergeParts([
        { geometry: rackGeo.topPanel, position: [CX, 0.96, CZ] },
    ]),

    // Bottom panel - fully closes the bottom
    bottomPanel: mergeParts([
        { geometry: rackGeo.bottomPanel, position: [CX, -0.96, CZ] },
    ]),

    // Side panels - fully close left and right sides, positioned to cover servers
    sidePanels: mergeParts([
        { geometry: rackGeo.sidePanel, position: [-0.02, 0, CZ] },
        { geometry: rackGeo.sidePanel, position: [0.62, 0, CZ] },
    ]),

    // Door frame
    doorFrame: mergeParts([
        { geometry: rackGeo.doorFrameVertical, position: [-0.01, 0, 0.5] },
        { geometry: rackGeo.doorFrameVertical, position: [0.61, 0, 0.5] },
        { geometry: rackGeo.doorFrameHorizontal, position: [CX, 0.92, 0.5] },
        { geometry: rackGeo.doorFrameHorizontal, position: [CX, -0.92, 0.5] },
    ]),

    // Mesh door panel
    meshDoor: mergeParts([
        { geometry: rackGeo.meshDoor, position: [CX, 0, 0.5] },
    ]),

    // Silver edge trim - front edges only
    edgeTrim: mergeParts([
        // Front vertical edges
        { geometry: rackGeo.edgeTrimVertical, position: [-0.02, 0, 0.52] },
        { geometry: rackGeo.edgeTrimVertical, position: [0.62, 0, 0.52] },
        // Front horizontal edges
        { geometry: rackGeo.edgeTrimHorizontal, position: [CX, 0.96, 0.52] },
        { geometry: rackGeo.edgeTrimHorizontal, position: [CX, -0.96, 0.52] },
    ]),

    // Door handle
    doorHandle: mergeParts([
        { geometry: rackGeo.doorHandle, position: [0.58, 0, 0.52] },
    ]),

    // Bottom feet - small and under the rack
    feet: mergeParts([
        { geometry: rackGeo.foot, position: [0.08, -0.99, 0.4], rotation: [0, 0, 0] },
        { geometry: rackGeo.foot, position: [0.52, -0.99, 0.4], rotation: [0, 0, 0] },
        { geometry: rackGeo.foot, position: [0.08, -0.99, -0.2], rotation: [0, 0, 0] },
        { geometry: rackGeo.foot, position: [0.52, -0.99, -0.2], rotation: [0, 0, 0] },
    ]),
} as const;
