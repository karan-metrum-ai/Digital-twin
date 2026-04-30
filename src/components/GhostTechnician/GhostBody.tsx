/**
 * GhostBody
 *
 * Loads the rigged Ready Player Me technician GLB and procedurally drives
 * its skeleton to produce believable, naturalistic motion.
 *
 * Modes:
 *   - 'idle' : breathing, micro weight-shifts, gentle head sway
 *   - 'walk' : full-body human walk with hip/knee/foot drive + arm swing
 *   - 'fix'  : multi-phase server work loop (reach, sweep, pinch, glance,
 *              two-handed reference) with one arm on the rack and the
 *              other holding the tablet at the hip
 *
 * Why we don't write to bone.rotation.x directly:
 *
 * The RPM skeleton uses non-axis-aligned bind-pose rotations. LeftUpLeg's
 * rest quaternion is roughly 180deg around Z; the upper arms carry a
 * ~60deg twist; etc. Adding 0.5 to bone.rotation.x means "rotate around
 * THIS bone's local X axis", which is some arbitrary anatomical direction.
 *
 * We solve this by precomputing, ONCE at mount, each bone's
 * "parent-local axes" — basis vectors that correspond to the model's
 * world axes (X = side, Y = up, Z = forward). Then in the per-frame loop
 * we accumulate angular deltas in those parent-local axes and apply them
 * as a single quaternion multiplication on top of the rest quaternion.
 * This keeps multi-axis rotations stable and lets us compose layered
 * offsets (idle + walk + breath) without the order of operations
 * stomping on each other.
 */

import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
} from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
    createGhostMaterial,
    cloneGhostMaterial,
    type GhostMaterial,
} from './ghostMaterial';
import { GhostBodyProcedural } from './GhostBodyProcedural';

export type AnimationMode = 'idle' | 'walk' | 'fix';
export type FixSide = 'left' | 'right';

export interface GhostBodyRef {
    play: (mode: AnimationMode) => void;
    setFixSide: (side: FixSide) => void;
    getMaterial: () => GhostMaterial;
    /**
     * Returns the world position of the currently active working hand
     * (whichever side is set via `setFixSide`). Returns null if the rig
     * is not yet ready. Caller may pass an output Vector3 to avoid
     * allocating per frame.
     */
    getWorkingHandWorld: (out?: THREE.Vector3) => THREE.Vector3 | null;
    /**
     * Returns the current "press intensity" (0..1) of the fix gesture —
     * peaks during the 0..1.5s reach + index press window of each cycle.
     * Other phases of the fix loop return lower values. 0 outside fix.
     */
    getFixPressIntensity: () => number;
}

export const MODEL_PATH = '/model/ghost-technician.glb';

try {
    useGLTF.preload(MODEL_PATH);
} catch {
    /* preload is best-effort */
}

interface GhostBodyProps {
    initialMode?: AnimationMode;
    fixSide?: FixSide;
}

interface BoneRig {
    hips?: THREE.Object3D;
    spine?: THREE.Object3D;
    spine1?: THREE.Object3D;
    spine2?: THREE.Object3D;
    neck?: THREE.Object3D;
    head?: THREE.Object3D;

    leftUpperLeg?: THREE.Object3D;
    rightUpperLeg?: THREE.Object3D;
    leftLowerLeg?: THREE.Object3D;
    rightLowerLeg?: THREE.Object3D;
    leftFoot?: THREE.Object3D;
    rightFoot?: THREE.Object3D;
    leftToe?: THREE.Object3D;
    rightToe?: THREE.Object3D;

    leftShoulder?: THREE.Object3D;  // upper arm
    rightShoulder?: THREE.Object3D;
    leftForearm?: THREE.Object3D;
    rightForearm?: THREE.Object3D;
    leftHand?: THREE.Object3D;
    rightHand?: THREE.Object3D;

    rIndex1?: THREE.Object3D;
    rIndex2?: THREE.Object3D;
    rMiddle1?: THREE.Object3D;
    rMiddle2?: THREE.Object3D;
    rRing1?: THREE.Object3D;
    rRing2?: THREE.Object3D;
    rPinky1?: THREE.Object3D;
    rPinky2?: THREE.Object3D;
    rThumb1?: THREE.Object3D;
    rThumb2?: THREE.Object3D;

    lIndex1?: THREE.Object3D;
    lIndex2?: THREE.Object3D;
    lMiddle1?: THREE.Object3D;
    lMiddle2?: THREE.Object3D;
    lRing1?: THREE.Object3D;
    lRing2?: THREE.Object3D;
    lPinky1?: THREE.Object3D;
    lPinky2?: THREE.Object3D;
    lThumb1?: THREE.Object3D;
    lThumb2?: THREE.Object3D;
}

function classifyBones(root: THREE.Object3D): BoneRig {
    const rig: BoneRig = {};
    const byName = new Map<string, THREE.Object3D>();
    root.traverse((obj) => {
        if (obj.name) byName.set(obj.name, obj);
    });

    const get = (...names: string[]): THREE.Object3D | undefined => {
        for (const n of names) {
            const hit =
                byName.get(n) ||
                byName.get(`mixamorig:${n}`) ||
                byName.get(`mixamorig${n}`);
            if (hit) return hit;
        }
        return undefined;
    };

    rig.hips = get('Hips', 'Pelvis');
    rig.spine = get('Spine');
    rig.spine1 = get('Spine1');
    rig.spine2 = get('Spine2');
    rig.neck = get('Neck');
    rig.head = get('Head');

    rig.leftUpperLeg = get('LeftUpLeg');
    rig.rightUpperLeg = get('RightUpLeg');
    rig.leftLowerLeg = get('LeftLeg');
    rig.rightLowerLeg = get('RightLeg');
    rig.leftFoot = get('LeftFoot');
    rig.rightFoot = get('RightFoot');
    rig.leftToe = get('LeftToeBase');
    rig.rightToe = get('RightToeBase');

    rig.leftShoulder = get('LeftArm');
    rig.rightShoulder = get('RightArm');
    rig.leftForearm = get('LeftForeArm');
    rig.rightForearm = get('RightForeArm');
    rig.leftHand = get('LeftHand');
    rig.rightHand = get('RightHand');

    rig.rIndex1 = get('RightHandIndex1');
    rig.rIndex2 = get('RightHandIndex2');
    rig.rMiddle1 = get('RightHandMiddle1');
    rig.rMiddle2 = get('RightHandMiddle2');
    rig.rRing1 = get('RightHandRing1');
    rig.rRing2 = get('RightHandRing2');
    rig.rPinky1 = get('RightHandPinky1');
    rig.rPinky2 = get('RightHandPinky2');
    rig.rThumb1 = get('RightHandThumb1');
    rig.rThumb2 = get('RightHandThumb2');

    rig.lIndex1 = get('LeftHandIndex1');
    rig.lIndex2 = get('LeftHandIndex2');
    rig.lMiddle1 = get('LeftHandMiddle1');
    rig.lMiddle2 = get('LeftHandMiddle2');
    rig.lRing1 = get('LeftHandRing1');
    rig.lRing2 = get('LeftHandRing2');
    rig.lPinky1 = get('LeftHandPinky1');
    rig.lPinky2 = get('LeftHandPinky2');
    rig.lThumb1 = get('LeftHandThumb1');
    rig.lThumb2 = get('LeftHandThumb2');

    return rig;
}

/* ========================================================================
 * Per-bone "anatomical axes" precomputed from the BIND POSE.
 *
 * For each bone we store three unit vectors (in the bone's parent-local
 * coordinate space) that correspond to the model's world axes at bind
 * time. Rotating a bone around `axes.up` always feels like a yaw
 * (looking left/right), around `axes.right` is a pitch, and around
 * `axes.forward` is a roll — irrespective of how twisted the bone's
 * own rest quaternion is.
 *
 * Computation: take the parent's bind WORLD quaternion, invert it, and
 * apply that inverse to the world basis vectors. The result is the
 * world axes expressed in the parent's local frame.
 * ======================================================================== */

interface BoneAxes {
    right: THREE.Vector3;   // world +X in parent-local space
    up: THREE.Vector3;      // world +Y
    forward: THREE.Vector3; // world +Z
}

const WORLD_X = new THREE.Vector3(1, 0, 0);
const WORLD_Y = new THREE.Vector3(0, 1, 0);
const WORLD_Z = new THREE.Vector3(0, 0, 1);

function precomputeBoneAxes(
    rig: BoneRig,
    rootScene: THREE.Object3D
): {
    rest: Map<THREE.Object3D, THREE.Quaternion>;
    axes: Map<THREE.Object3D, BoneAxes>;
} {
    rootScene.updateMatrixWorld(true);
    const rest = new Map<THREE.Object3D, THREE.Quaternion>();
    const axes = new Map<THREE.Object3D, BoneAxes>();
    const tmp = new THREE.Quaternion();

    for (const bone of Object.values(rig)) {
        if (!bone) continue;
        rest.set(bone, bone.quaternion.clone());

        if (bone.parent) {
            // Parent's WORLD quaternion at bind time
            bone.parent.getWorldQuaternion(tmp);
            const invParent = tmp.clone().invert();
            axes.set(bone, {
                right: WORLD_X.clone().applyQuaternion(invParent).normalize(),
                up: WORLD_Y.clone().applyQuaternion(invParent).normalize(),
                forward: WORLD_Z.clone().applyQuaternion(invParent).normalize(),
            });
        } else {
            axes.set(bone, {
                right: WORLD_X.clone(),
                up: WORLD_Y.clone(),
                forward: WORLD_Z.clone(),
            });
        }
    }

    return { rest, axes };
}

/* ========================================================================
 * Per-frame rotation accumulator.
 *
 * Because we now compose multiple offsets onto each bone (breath + idle +
 * walk + fix can all touch the spine), we accumulate angular deltas in a
 * Map<bone, {x,y,z}> across the whole frame, then flush them at the end
 * as a single quaternion multiplication: bone.quaternion = rest * delta.
 *
 * x / y / z here are anatomical (model-world) axes — pitch, yaw, roll —
 * resolved through the precomputed BoneAxes table.
 * ======================================================================== */

interface AngleAccum {
    x: number; // pitch  (rotation around model-world X = forward/back)
    y: number; // yaw    (rotation around model-world Y = left/right turn)
    z: number; // roll   (rotation around model-world Z = side lean)
}

function add(
    acc: Map<THREE.Object3D, AngleAccum>,
    bone: THREE.Object3D | undefined,
    x: number,
    y: number,
    z: number
) {
    if (!bone) return;
    let a = acc.get(bone);
    if (!a) {
        a = { x: 0, y: 0, z: 0 };
        acc.set(bone, a);
    }
    a.x += x;
    a.y += y;
    a.z += z;
}

const _qx = new THREE.Quaternion();
const _qy = new THREE.Quaternion();
const _qz = new THREE.Quaternion();
const _qDelta = new THREE.Quaternion();

function flushAccumulator(
    acc: Map<THREE.Object3D, AngleAccum>,
    rest: Map<THREE.Object3D, THREE.Quaternion>,
    axes: Map<THREE.Object3D, BoneAxes>
) {
    for (const [bone, a] of acc) {
        const restQ = rest.get(bone);
        const ax = axes.get(bone);
        if (!restQ || !ax) continue;

        _qDelta.identity();
        if (Math.abs(a.x) > 1e-6) {
            _qx.setFromAxisAngle(ax.right, a.x);
            _qDelta.multiply(_qx);
        }
        if (Math.abs(a.y) > 1e-6) {
            _qy.setFromAxisAngle(ax.up, a.y);
            _qDelta.multiply(_qy);
        }
        if (Math.abs(a.z) > 1e-6) {
            _qz.setFromAxisAngle(ax.forward, a.z);
            _qDelta.multiply(_qz);
        }

        // Apply: new = rest * delta  (delta lives in parent-local space)
        bone.quaternion.copy(restQ).multiply(_qDelta);
    }

    // Bones not in accumulator stay at rest (already reset earlier)
}

/** Reset every tracked bone to its rest quaternion. */
function resetToRest(rest: Map<THREE.Object3D, THREE.Quaternion>) {
    rest.forEach((q, obj) => obj.quaternion.copy(q));
}

/* ========================================================================
 * Hand curl helper. Finger bones DO have a clean local Z axis for curling
 * because they were authored that way in RPM, so a direct local-axis
 * accumulator works fine here.
 * ======================================================================== */

function addCurl(
    acc: Map<THREE.Object3D, AngleAccum>,
    axes: Map<THREE.Object3D, BoneAxes>,
    bone: THREE.Object3D | undefined,
    side: 'left' | 'right',
    amount: number
) {
    if (!bone) return;
    const sign = side === 'left' ? 1 : -1;
    // Curl = rotation around the model's forward axis (Z).
    add(acc, bone, 0, 0, amount * sign);
    // The pre-projected axes table will resolve this correctly.
    void axes;
}

function curlHand(
    acc: Map<THREE.Object3D, AngleAccum>,
    axes: Map<THREE.Object3D, BoneAxes>,
    rig: BoneRig,
    side: 'left' | 'right',
    amount: number,
    excludeIndex = false
) {
    const a = THREE.MathUtils.clamp(amount, 0, 1);
    const proximal = a * 0.6;
    const distal = a * 0.8;
    const thumb = a * 0.45;

    if (side === 'left') {
        if (!excludeIndex) {
            addCurl(acc, axes, rig.lIndex1, side, proximal);
            addCurl(acc, axes, rig.lIndex2, side, distal);
        }
        addCurl(acc, axes, rig.lMiddle1, side, proximal);
        addCurl(acc, axes, rig.lMiddle2, side, distal);
        addCurl(acc, axes, rig.lRing1, side, proximal);
        addCurl(acc, axes, rig.lRing2, side, distal);
        addCurl(acc, axes, rig.lPinky1, side, proximal);
        addCurl(acc, axes, rig.lPinky2, side, distal);
        addCurl(acc, axes, rig.lThumb1, side, thumb);
        addCurl(acc, axes, rig.lThumb2, side, thumb);
    } else {
        if (!excludeIndex) {
            addCurl(acc, axes, rig.rIndex1, side, proximal);
            addCurl(acc, axes, rig.rIndex2, side, distal);
        }
        addCurl(acc, axes, rig.rMiddle1, side, proximal);
        addCurl(acc, axes, rig.rMiddle2, side, distal);
        addCurl(acc, axes, rig.rRing1, side, proximal);
        addCurl(acc, axes, rig.rRing2, side, distal);
        addCurl(acc, axes, rig.rPinky1, side, proximal);
        addCurl(acc, axes, rig.rPinky2, side, distal);
        addCurl(acc, axes, rig.rThumb1, side, thumb);
        addCurl(acc, axes, rig.rThumb2, side, thumb);
    }
}

function smooth(t: number): number {
    const x = THREE.MathUtils.clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
}

export const GhostBody = forwardRef<GhostBodyRef, GhostBodyProps>(
    function GhostBody({ initialMode = 'idle', fixSide = 'right' }, fwdRef) {
        const groupRef = useRef<THREE.Group>(null);

        const gltf = useGLTF(MODEL_PATH) as unknown as GLTF;
        const material = useMemo(() => createGhostMaterial(), []);

        const cloned = useMemo(() => {
            if (!gltf || !gltf.scene) return null;
            try {
                return skeletonClone(gltf.scene) as THREE.Group;
            } catch {
                return gltf.scene.clone(true) as THREE.Group;
            }
        }, [gltf]);

        useEffect(() => {
            if (!cloned) return;
            cloned.position.set(0, 0, 0);
            cloned.rotation.set(0, 0, 0);
            cloned.traverse((obj) => {
                const mesh = obj as THREE.Mesh;
                if (mesh.isMesh) {
                    mesh.material = cloneGhostMaterial(material);
                    mesh.castShadow = false;
                    mesh.receiveShadow = false;
                    mesh.renderOrder = 10;
                    mesh.frustumCulled = false;
                }
            });
        }, [cloned, material]);

        const rigRef = useRef<BoneRig>({});
        const restRef = useRef<Map<THREE.Object3D, THREE.Quaternion>>(new Map());
        const axesRef = useRef<Map<THREE.Object3D, BoneAxes>>(new Map());
        const accRef = useRef<Map<THREE.Object3D, AngleAccum>>(new Map());

        useEffect(() => {
            if (!cloned) return;
            const rig = classifyBones(cloned);
            rigRef.current = rig;
            const { rest, axes } = precomputeBoneAxes(rig, cloned);
            restRef.current = rest;
            axesRef.current = axes;
        }, [cloned]);

        const modeRef = useRef<AnimationMode>(initialMode);
        const fixSideRef = useRef<FixSide>(fixSide);
        const tRef = useRef(Math.random() * 10);
        const blendRef = useRef({ idle: 1, walk: 0, fix: 0 });
        const seedRef = useRef({
            breath: Math.random() * Math.PI * 2,
            sway: Math.random() * Math.PI * 2,
            head: Math.random() * Math.PI * 2,
            fixOffset: Math.random() * 10,
        });

        // Stride phase is advanced per-frame at a frequency that tracks the
        // parent group's actual ground speed. This keeps the leg cycle locked
        // to real translation so feet do not "skate" when the body slows or
        // accelerates.
        const stridePhaseRef = useRef(0);
        // Last frame's parent-group yaw — used to synthesize a head-lead
        // offset so the head turns slightly ahead of body rotation.
        const lastParentYawRef = useRef<number | null>(null);
        const headLeadRef = useRef(0);

        // Latest press intensity from the fix loop (0..1). Read by
        // GhostSparkles to time particle bursts at the working hand.
        const pressIntensityRef = useRef(0);

        // Tracks the last animation mode so we can fire a brief
        // anticipation impulse when transitioning into fix (slight
        // back-tilt of the spine before the forward lean engages).
        const lastModeRef = useRef<AnimationMode>(initialMode);
        // Time remaining (seconds) on the current anticipation impulse.
        const anticipationRef = useRef(0);

        useFrame((_, dt) => {
            material.uniforms.uTime.value += dt;
            tRef.current += dt;
            const t = tRef.current;

            const targetWalk = modeRef.current === 'walk' ? 1 : 0;
            const targetFix = modeRef.current === 'fix' ? 1 : 0;
            const targetIdle = 1 - Math.max(targetWalk, targetFix);
            const k = Math.min(1, dt * 4);
            blendRef.current.walk += (targetWalk - blendRef.current.walk) * k;
            blendRef.current.fix += (targetFix - blendRef.current.fix) * k;
            blendRef.current.idle += (targetIdle - blendRef.current.idle) * k;
            const wWalk = blendRef.current.walk;
            const wFix = blendRef.current.fix;
            const wIdle = blendRef.current.idle;

            // Detect mode transitions to fire a one-shot anticipation
            // impulse. Right now we only anticipate the walk -> fix beat
            // (a small backward spine tilt before leaning forward into
            // the rack). 0.32 s window feels natural.
            if (lastModeRef.current !== modeRef.current) {
                if (modeRef.current === 'fix' && lastModeRef.current !== 'fix') {
                    anticipationRef.current = 0.32;
                }
                lastModeRef.current = modeRef.current;
            }
            if (anticipationRef.current > 0) {
                anticipationRef.current = Math.max(0, anticipationRef.current - dt);
            }

            // Read parent-group telemetry (published by GhostTechnician).
            const parent = groupRef.current?.parent;
            const groundSpeed = (parent?.userData?.groundSpeed as number | undefined) ?? 0;
            // Map ground speed to stride frequency. A 1.3 u/s walk maps to
            // ~5.4 rad/s (matches the previous hand-tuned constant). When
            // the body slows the legs slow with it; when it stops, they
            // settle to the rest pose because phase stops advancing.
            const NOMINAL_SPEED = 1.3;
            const NOMINAL_FREQ = 5.4;
            const speedRatio = THREE.MathUtils.clamp(groundSpeed / NOMINAL_SPEED, 0, 1.4);
            stridePhaseRef.current += dt * NOMINAL_FREQ * speedRatio;
            const stride = stridePhaseRef.current;

            // Head-leads-body: detect parent yaw delta and let the head
            // anticipate the turn by ~150ms.
            if (parent) {
                const yaw = parent.rotation.y;
                if (lastParentYawRef.current === null) {
                    lastParentYawRef.current = yaw;
                }
                let dYaw = yaw - lastParentYawRef.current;
                while (dYaw > Math.PI) dYaw -= Math.PI * 2;
                while (dYaw < -Math.PI) dYaw += Math.PI * 2;
                lastParentYawRef.current = yaw;
                // Per-frame yaw rate, in rad/s, scaled and clamped.
                const yawRate = dt > 1e-5 ? dYaw / dt : 0;
                const targetLead = THREE.MathUtils.clamp(yawRate * 0.15, -0.18, 0.18);
                // Gentle low-pass so the head doesn't twitch.
                headLeadRef.current += (targetLead - headLeadRef.current) * Math.min(1, dt * 6);
            }

            const rest = restRef.current;
            const axes = axesRef.current;
            const acc = accRef.current;
            acc.clear();
            resetToRest(rest);

            const rig = rigRef.current;
            const seed = seedRef.current;

            // ============================================================
            // BREATHING — runs in every mode, layered with everything else
            // ============================================================
            const breath = Math.sin(t * 1.05 + seed.breath) * 0.5 + 0.5;
            const breathAmp = 0.05 * (wIdle * 1.0 + wFix * 0.7 + wWalk * 0.3);
            add(acc, rig.spine1, -breath * breathAmp, 0, 0);
            add(acc, rig.spine2, -breath * breathAmp * 0.6, 0, 0);

            // ============================================================
            // ANTICIPATION — short backward spine tilt at walk->fix moment
            // ============================================================
            if (anticipationRef.current > 0) {
                // Bell curve over the 0.32 s window — peaks halfway.
                const u = 1 - anticipationRef.current / 0.32;
                const bell = Math.sin(u * Math.PI);
                add(acc, rig.spine, -0.08 * bell, 0, 0);
                add(acc, rig.spine1, -0.04 * bell, 0, 0);
            }

            // ============================================================
            // LEFT ARM = TABLET HOLDER (always pulled into hold pose)
            // The forearm bends up so the hand sits at hip height.
            // Lifting/forward of the upper arm is a Z-axis rotation in
            // anatomical space (because we projected world-Z into parent
            // local). Negative on the left side tucks it inward.
            // ============================================================
            const tabletHold = Math.max(wIdle, wWalk * 0.7, wFix * 0.95);
            if (tabletHold > 0.001) {
                // Upper arm: tuck slightly toward torso + rotate to hold tablet
                add(acc, rig.leftShoulder, 0, 0, -0.55 * tabletHold);
                // Forearm: bend ~80deg up
                add(acc, rig.leftForearm, -1.4 * tabletHold, 0, 0);
                // Wrist tilt
                add(acc, rig.leftHand, 0, 0, 0.2 * tabletHold);
                curlHand(acc, axes, rig, 'left', 0.55 * tabletHold);
            }

            // ============================================================
            // IDLE — slow weight shift, head sway
            // ============================================================
            if (wIdle > 0.001) {
                const sway = Math.sin(t * 0.55 + seed.sway);
                add(acc, rig.hips, 0, 0, sway * 0.05 * wIdle);
                add(acc, rig.spine1, 0, 0, -sway * 0.025 * wIdle);
                add(
                    acc,
                    rig.head,
                    Math.sin(t * 0.45 + seed.head * 0.7) * 0.07 * wIdle,
                    Math.sin(t * 0.6 + seed.head) * 0.13 * wIdle,
                    0
                );
            }

            // ============================================================
            // WALK — heel-strike, knee bend, hip sway, arm counter-swing
            // ============================================================
            if (wWalk > 0.001) {
                // `stride` is advanced from ground speed above so leg
                // cadence follows real translation, eliminating foot-slip.
                const phaseL = Math.sin(stride);
                const phaseR = -phaseL;

                // Thigh swing: pitch around X (anatomical pitch -> forward/back)
                const thighAmp = 0.7 * wWalk;
                add(acc, rig.leftUpperLeg, phaseL * thighAmp, 0, 0);
                add(acc, rig.rightUpperLeg, phaseR * thighAmp, 0, 0);

                // Knee bend: only flex during swing phase
                const kneeL = Math.max(0, Math.sin(stride + Math.PI * 0.4));
                const kneeR = Math.max(0, Math.sin(stride + Math.PI * 1.4));
                const kneeAmp = 1.2 * wWalk;
                // Knee flex pitches the lower leg backward (negative pitch)
                add(acc, rig.leftLowerLeg, -kneeL * kneeAmp, 0, 0);
                add(acc, rig.rightLowerLeg, -kneeR * kneeAmp, 0, 0);

                // Foot roll: heel-strike -> mid -> toe-off
                const footL = Math.sin(stride + Math.PI * 0.9);
                const footR = Math.sin(stride - Math.PI * 0.1);
                add(acc, rig.leftFoot, footL * 0.4 * wWalk, 0, 0);
                add(acc, rig.rightFoot, footR * 0.4 * wWalk, 0, 0);

                const toeL = Math.max(0, -Math.sin(stride - Math.PI * 0.3));
                const toeR = Math.max(0, -Math.sin(stride + Math.PI * 0.7));
                add(acc, rig.leftToe, -toeL * 0.5 * wWalk, 0, 0);
                add(acc, rig.rightToe, -toeR * 0.5 * wWalk, 0, 0);

                // Pelvis: yaw rock + lateral roll (Trendelenburg drop)
                add(acc, rig.hips, 0, phaseL * 0.1 * wWalk, phaseL * 0.06 * wWalk);

                // Torso counter-rotation
                add(acc, rig.spine1, 0, -phaseL * 0.08 * wWalk, 0);
                add(acc, rig.spine2, 0, -phaseL * 0.05 * wWalk, 0);

                // Right arm (free arm) — full counter-swing
                const armAmp = 0.75 * wWalk;
                add(acc, rig.rightShoulder, phaseL * armAmp, 0, 0);
                // Forearm flex oscillates 20-45 deg
                const forearmFlex = -(0.4 + 0.25 * Math.sin(stride + Math.PI * 0.5));
                add(acc, rig.rightForearm, forearmFlex * wWalk, 0, 0);
                add(acc, rig.rightHand, phaseL * 0.2 * wWalk, 0, 0);
                curlHand(acc, axes, rig, 'right', 0.35 * wWalk);

                // Left arm dampened (tablet holder) — only ~15% counter-swing
                add(acc, rig.leftShoulder, phaseR * armAmp * 0.15, 0, 0);

                // Head: stable forward + occasional tablet glance + lead on turns
                const glance = Math.max(
                    0,
                    Math.sin(t * 0.8 + seed.head) - 0.7
                ) / 0.3;
                add(
                    acc,
                    rig.head,
                    glance * 0.4 * wWalk,
                    headLeadRef.current * wWalk,
                    -phaseL * 0.04 * wWalk
                );
                add(acc, rig.neck, glance * 0.12 * wWalk, headLeadRef.current * 0.4 * wWalk, 0);
            }

            // ============================================================
            // FIX — multi-phase server work loop
            // 10s cycle:
            //   0.0-1.5s : reach + index press
            //   1.5-3.5s : vertical inspection sweep
            //   3.5-5.0s : pinch & pull reseat
            //   5.0-6.0s : tablet glance
            //   6.0-8.0s : two-handed reference
            //   8.0-10.0 : settle / micro adjustments
            // ============================================================
            if (wFix > 0.001) {
                const side = fixSideRef.current;
                const sign = side === 'left' ? 1 : -1;
                const shoulder = side === 'left' ? rig.leftShoulder : rig.rightShoulder;
                const forearm = side === 'left' ? rig.leftForearm : rig.rightForearm;
                const hand = side === 'left' ? rig.leftHand : rig.rightHand;
                const ft = (t + seed.fixOffset) % 10;

                // Body engagement
                add(acc, rig.spine, 0.1 * wFix, 0, 0);
                add(acc, rig.spine1, 0.05 * wFix, 0, 0);
                add(acc, rig.hips, 0, 0,
                    -0.06 * wFix * sign + Math.sin(ft * 1.6) * 0.025 * wFix);

                let reach = 0;
                let vertical = 0;
                let pinch = 0;
                let leftLift = 0;
                let headDown = 0;
                let pressIndex = 0;
                let curlAmount = 0.4;

                if (ft < 1.5) {
                    const k1 = smooth(ft / 0.8);
                    const k2 = smooth((1.5 - ft) / 0.5);
                    reach = k1 * Math.min(1, k2 * 1.2);
                    pressIndex = reach;
                    curlAmount = 0.65 - reach * 0.4;
                } else if (ft < 3.5) {
                    const u = (ft - 1.5) / 2;
                    vertical = Math.sin(u * Math.PI);
                    reach = 0.6;
                    curlAmount = 0.45;
                    headDown = -vertical * 0.4;
                } else if (ft < 5.0) {
                    const u = (ft - 3.5) / 1.5;
                    pinch = Math.sin(u * Math.PI);
                    reach = 0.55 - pinch * 0.35;
                    curlAmount = 0.25 + pinch * 0.5;
                } else if (ft < 6.0) {
                    const u = (ft - 5.0) / 1.0;
                    headDown = Math.sin(u * Math.PI) * 0.55;
                    reach = 0.45;
                    curlAmount = 0.5;
                } else if (ft < 8.0) {
                    const u = (ft - 6.0) / 2.0;
                    leftLift = Math.sin(u * Math.PI);
                    reach = 0.5;
                    curlAmount = 0.4;
                    headDown = leftLift * 0.3;
                } else {
                    const u = (ft - 8.0) / 2.0;
                    reach = 0.5 + Math.sin(u * Math.PI * 2) * 0.07;
                    curlAmount = 0.45;
                }

                // Working arm pose:
                //   - Pitch X negative   -> raise the upper arm forward
                //   - Roll  Z (signed)   -> rotate arm outward away from torso
                //   - Pitch X on forearm -> elbow bend
                add(
                    acc,
                    shoulder,
                    -1.0 - reach * 0.4 - vertical * 0.7,
                    0,
                    -0.5 * sign + Math.sin(ft * 2.7) * 0.05 * sign
                );
                add(
                    acc,
                    forearm,
                    -(1.4 - reach * 0.6),
                    0,
                    pinch * 0.4 * sign
                );
                add(
                    acc,
                    hand,
                    Math.sin(ft * 3.1) * 0.1,
                    0,
                    vertical * 0.25 * sign
                );

                // Index finger extends when pressing (right hand)
                if (side === 'right' && pressIndex > 0.05) {
                    add(acc, rig.rIndex1, 0, 0, pressIndex * 0.6);
                    add(acc, rig.rIndex2, 0, 0, pressIndex * 0.4);
                }
                curlHand(acc, axes, rig, side, curlAmount * wFix, pressIndex > 0.05);

                // Two-handed lift on left arm (during 6-8s window)
                if (leftLift > 0.001) {
                    add(acc, rig.leftShoulder, -leftLift * 0.5 * wFix, 0, -leftLift * 0.5 * wFix);
                    add(acc, rig.leftForearm, -leftLift * 0.3 * wFix, 0, 0);
                }

                // Head: looks at the work, dips at tablet
                add(
                    acc,
                    rig.head,
                    (0.22 + headDown) * wFix,
                    Math.sin(ft * 0.6) * 0.1 * wFix,
                    Math.sin(ft * 0.9) * 0.06 * wFix
                );
                add(acc, rig.neck, headDown * 0.35 * wFix, 0, 0);

                // Publish press intensity (weighted by fix blend) so the
                // sparkle particle system can pulse in time with the press.
                pressIntensityRef.current = pressIndex * wFix;
            } else {
                // Outside fix mode — nothing to sparkle.
                pressIntensityRef.current = 0;
            }

            // Apply accumulated angles to all touched bones
            flushAccumulator(acc, rest, axes);
        });

        useImperativeHandle(
            fwdRef,
            (): GhostBodyRef => ({
                play: (mode) => {
                    modeRef.current = mode;
                },
                setFixSide: (side) => {
                    fixSideRef.current = side;
                },
                getMaterial: () => material,
                getWorkingHandWorld: (out) => {
                    const rig = rigRef.current;
                    const hand =
                        fixSideRef.current === 'left' ? rig.leftHand : rig.rightHand;
                    if (!hand) return null;
                    const v = out ?? new THREE.Vector3();
                    hand.getWorldPosition(v);
                    return v;
                },
                getFixPressIntensity: () => pressIntensityRef.current,
            }),
            [material]
        );

        if (!cloned) {
            return <GhostBodyProcedural ref={groupRef} material={material} />;
        }

        return (
            <group ref={groupRef}>
                <primitive object={cloned} />
            </group>
        );
    }
);
