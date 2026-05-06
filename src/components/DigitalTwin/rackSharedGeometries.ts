/**
 * Shared rack geometries - created once, reused across all ServerRack instances.
 * Optimized for minimal triangle count.
 */
import * as THREE from 'three';

// Rack dimensions
const RACK_WIDTH = 0.6;
const RACK_HEIGHT = 1.9;
const RACK_DEPTH = 0.8;
const POST_SIZE = 0.03;
const DOOR_FRAME_WIDTH = 0.03;
const PANEL_THICKNESS = 0.02;

export const rackGeo = {
    // Selection highlight box
    rackHighlight: new THREE.BoxGeometry(0.75, 1.95, 1.1),
    
    // Corner posts (4 vertical posts) - internal structure
    post: new THREE.BoxGeometry(POST_SIZE, RACK_HEIGHT - 0.1, POST_SIZE),
    
    // Back panel - full coverage
    rackBack: new THREE.BoxGeometry(RACK_WIDTH + 0.04, RACK_HEIGHT + 0.02, PANEL_THICKNESS),
    
    // Top panel - full coverage
    topPanel: new THREE.BoxGeometry(RACK_WIDTH + 0.04, PANEL_THICKNESS, RACK_DEPTH),
    
    // Bottom panel - full coverage
    bottomPanel: new THREE.BoxGeometry(RACK_WIDTH + 0.04, PANEL_THICKNESS, RACK_DEPTH),
    
    // Side panels - full coverage (left and right) - extends full depth
    sidePanel: new THREE.BoxGeometry(PANEL_THICKNESS, RACK_HEIGHT + 0.02, RACK_DEPTH),
    
    // Door frame pieces
    doorFrameVertical: new THREE.BoxGeometry(DOOR_FRAME_WIDTH, RACK_HEIGHT - 0.05, 0.025),
    doorFrameHorizontal: new THREE.BoxGeometry(RACK_WIDTH + 0.02, DOOR_FRAME_WIDTH, 0.025),
    
    // Perforated door panel (using texture)
    meshDoor: new THREE.BoxGeometry(RACK_WIDTH - 0.04, RACK_HEIGHT - 0.08, 0.015),
    
    // Door handle
    doorHandle: new THREE.BoxGeometry(0.02, 0.15, 0.025),
    doorHandleGrip: new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8),
    
    // Edge trim (silver accent strips)
    edgeTrimVertical: new THREE.BoxGeometry(0.02, RACK_HEIGHT + 0.02, 0.02),
    edgeTrimHorizontal: new THREE.BoxGeometry(RACK_WIDTH + 0.04, 0.02, 0.02),
    
    // Dell logo badge (circular)
    logoBadge: new THREE.CylinderGeometry(0.04, 0.04, 0.008, 16),
    logoBadgeRing: new THREE.RingGeometry(0.035, 0.042, 16),
    
    // Bottom casters/feet - smaller
    foot: new THREE.CylinderGeometry(0.02, 0.015, 0.03, 6),
    
    // Device geometries (kept for compatibility)
    deviceChassis: new THREE.BoxGeometry(0.52, 1, 0.68),
    deviceBezel: new THREE.BoxGeometry(0.54, 1, 0.006),
    deviceEdgeAccent: new THREE.BoxGeometry(0.55, 0.006, 0.01),
    ledSquare: new THREE.BoxGeometry(0.022, 0.022, 0.004),
    ledStrip: new THREE.BoxGeometry(0.12, 0.012, 0.003),
    handle: new THREE.BoxGeometry(0.022, 1, 0.012),
} as const;

// Shared perforated door texture - created once
let sharedDoorTexture: THREE.CanvasTexture | null = null;

export function getPerforatedDoorTexture(): THREE.CanvasTexture {
    if (sharedDoorTexture) return sharedDoorTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark base
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw perforated hole pattern
    const holeRadius = 3;
    const spacingX = 10;
    const spacingY = 10;
    
    ctx.fillStyle = '#1a1a1e';
    
    for (let y = spacingY / 2; y < canvas.height; y += spacingY) {
        const offset = (Math.floor(y / spacingY) % 2) * (spacingX / 2);
        for (let x = spacingX / 2 + offset; x < canvas.width; x += spacingX) {
            ctx.beginPath();
            ctx.arc(x, y, holeRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    sharedDoorTexture = new THREE.CanvasTexture(canvas);
    sharedDoorTexture.wrapS = THREE.RepeatWrapping;
    sharedDoorTexture.wrapT = THREE.RepeatWrapping;
    sharedDoorTexture.repeat.set(2, 4);
    sharedDoorTexture.colorSpace = THREE.SRGBColorSpace;
    sharedDoorTexture.needsUpdate = true;
    return sharedDoorTexture;
}

// Shared Dell logo texture
let sharedRackLogoTexture: THREE.CanvasTexture | null = null;

export function getDellLogoBadgeTexture(): THREE.CanvasTexture {
    if (sharedRackLogoTexture) return sharedRackLogoTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Circular background
    ctx.fillStyle = '#1a1a1e';
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    // Ring
    ctx.strokeStyle = '#404048';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.stroke();

    // Dell text
    ctx.font = '900 28px "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText('DELL', 64, 64);

    sharedRackLogoTexture = new THREE.CanvasTexture(canvas);
    sharedRackLogoTexture.colorSpace = THREE.SRGBColorSpace;
    sharedRackLogoTexture.needsUpdate = true;
    return sharedRackLogoTexture;
}
