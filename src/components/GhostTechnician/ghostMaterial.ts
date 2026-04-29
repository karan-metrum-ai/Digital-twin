/**
 * Holographic ghost material.
 *
 * Custom shader that gives meshes a translucent neon-cyan look:
 * - Fresnel rim glow on silhouettes
 * - Animated horizontal scanlines
 * - Additive blending so the body reads as light, not solid
 *
 * Use `createGhostMaterial` to build a fresh instance, `cloneGhostMaterial`
 * if you need a per-mesh copy that shares the same uniforms cadence,
 * and `disposeGhostMaterial` on cleanup.
 */

import * as THREE from 'three';

export const FLOOR_Y = -1.2;

export const GHOST_COLORS = {
    primary: new THREE.Color('#00e5ff'),
    rim: new THREE.Color('#7df9ff'),
    core: new THREE.Color('#a8fbff'),
};

const VERTEX_SHADER = /* glsl */ `
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    varying vec3 vViewDir;
    varying vec2 vUv;

    void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

const FRAGMENT_SHADER = /* glsl */ `
    uniform vec3 uPrimary;
    uniform vec3 uRim;
    uniform vec3 uCore;
    uniform float uTime;
    uniform float uOpacity;

    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    varying vec3 vViewDir;
    varying vec2 vUv;

    void main() {
        // Fresnel rim term -> bright on silhouettes, dim on facing surfaces
        float fres = 1.0 - max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0);
        float rim = pow(fres, 2.5);

        // Soft horizontal scanlines that drift upward over time
        float scan = sin(vWorldPos.y * 28.0 - uTime * 2.5) * 0.5 + 0.5;
        scan = smoothstep(0.35, 1.0, scan);

        // Subtle vertical flicker
        float flicker = 0.92 + 0.08 * sin(uTime * 11.0);

        vec3 base = mix(uPrimary, uCore, 0.25);
        vec3 col = base + uRim * rim * 1.4 + uCore * scan * 0.35;
        col *= flicker;

        // Final alpha: rim drives most of visibility, plus a low base glow
        float alpha = (0.18 + rim * 0.9 + scan * 0.12) * uOpacity;
        gl_FragColor = vec4(col, alpha);
    }
`;

export interface GhostMaterial extends THREE.ShaderMaterial {
    isGhostMaterial: true;
}

export function createGhostMaterial(): GhostMaterial {
    const mat = new THREE.ShaderMaterial({
        uniforms: {
            uPrimary: { value: GHOST_COLORS.primary.clone() },
            uRim: { value: GHOST_COLORS.rim.clone() },
            uCore: { value: GHOST_COLORS.core.clone() },
            uTime: { value: 0 },
            uOpacity: { value: 0 },
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
    }) as GhostMaterial;
    (mat as unknown as { isGhostMaterial: true }).isGhostMaterial = true;
    return mat;
}

/**
 * Returns a clone that shares uniform *values* with the source so that a
 * single time/opacity update on the source propagates to every clone.
 */
export function cloneGhostMaterial(src: GhostMaterial): GhostMaterial {
    const clone = src.clone() as GhostMaterial;
    clone.uniforms.uTime = src.uniforms.uTime;
    clone.uniforms.uOpacity = src.uniforms.uOpacity;
    clone.uniforms.uPrimary = src.uniforms.uPrimary;
    clone.uniforms.uRim = src.uniforms.uRim;
    clone.uniforms.uCore = src.uniforms.uCore;
    (clone as unknown as { isGhostMaterial: true }).isGhostMaterial = true;
    return clone;
}

export function disposeGhostMaterial(mat: GhostMaterial | null | undefined) {
    if (!mat) return;
    mat.dispose();
}
