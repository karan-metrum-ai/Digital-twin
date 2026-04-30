/**
 * Single GPU buffers per shape — reused across all ServerRack instances.
 * Dynamic device height uses scale on unit-height boxes.
 */
import * as THREE from 'three';

export const rackGeo = {
    rackHighlight: new THREE.BoxGeometry(0.75, 1.95, 1.1),
    post: new THREE.BoxGeometry(0.04, 1.9, 0.04),
    rackBack: new THREE.BoxGeometry(0.62, 1.85, 0.02),
    topBottom: new THREE.BoxGeometry(0.62, 0.04, 0.5),
    doorFrameVertical: new THREE.BoxGeometry(0.03, 1.85, 0.02),
    doorFrameHorizontal: new THREE.BoxGeometry(0.64, 0.03, 0.02),
    glassDoor: new THREE.BoxGeometry(0.56, 1.78, 0.01),
    verticalLedStrip: new THREE.BoxGeometry(0.015, 1.75, 0.015),
    topIndicator: new THREE.BoxGeometry(0.5, 0.025, 0.01),
    rail: new THREE.BoxGeometry(0.025, 1.7, 0.04),
    /** Y scale = meshHeight * 1.1 */
    deviceChassis: new THREE.BoxGeometry(0.52, 1, 0.68),
    /** Y scale = meshHeight * 1.15 */
    deviceBezel: new THREE.BoxGeometry(0.54, 1, 0.006),
    deviceEdgeAccent: new THREE.BoxGeometry(0.55, 0.006, 0.01),
    ledSquare: new THREE.BoxGeometry(0.022, 0.022, 0.004),
    ledStrip: new THREE.BoxGeometry(0.12, 0.012, 0.003),
    /** Y scale = max(0.035, meshHeight * 0.65) */
    handle: new THREE.BoxGeometry(0.022, 1, 0.012),
} as const;
