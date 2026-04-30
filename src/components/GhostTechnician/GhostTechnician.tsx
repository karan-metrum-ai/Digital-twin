/**
 * GhostTechnician
 *
 * Top-level holographic technician. Lifecycle:
 *   1. spawn  — fade in at the first path point, idle for `spawnDelay`
 *   2. walk   — follow `pathPoints` (or directly to `targetPosition`)
 *   3. fix    — at the destination, play the fix animation for `fixDuration`
 *   4. leave  — walk back to the spawn point (if `returnHome`)
 *   5. despawn — fade out, then fire `onDespawnComplete`
 *
 * The component takes ownership of position so the parent only needs to
 * provide where to spawn/walk to and an optional waypoint chain.
 */

import {
    Suspense,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
    GhostBody,
    type AnimationMode,
    type FixSide,
    type GhostBodyRef,
} from './GhostBody';
import { GhostTag } from './GhostTag';
import { GhostTrail } from './GhostTrail';
import { GhostWisps } from './GhostWisps';
import { GhostSparkles } from './GhostSparkles';
import { useOpacityAnimation } from './useArmAnimation';
import { FLOOR_Y } from './ghostMaterial';

type Vec3 = [number, number, number];

export interface GhostTechnicianProps {
    /** Final destination — where the ghost performs the fix. */
    targetPosition: Vec3;
    /**
     * Optional explicit path. If provided, the ghost walks through these in
     * order; the LAST point is treated as the fix location (so the ghost
     * faces it and plays `fix` there).
     * Y is automatically snapped to FLOOR_Y.
     */
    pathPoints?: Vec3[];
    /** Spawn position. Defaults to the first path point or far edge of room. */
    spawnPosition?: Vec3;
    /** Floating tag label. */
    label?: string;
    /** Floating tag status (line under label). */
    status?: string;
    /** Walking speed in units/sec. */
    walkSpeed?: number;
    /** How long to play `fix` at the target before leaving, in seconds. */
    fixDuration?: number;
    /** Delay between fade-in and starting to walk. */
    spawnDelay?: number;
    /** If true, walk back to spawnPosition after fixing before despawning. */
    returnHome?: boolean;
    /** Fired after the despawn fade-out completes. */
    onDespawnComplete?: () => void;
    /** Disable the trail (for many ghosts, perf). */
    showTrail?: boolean;
    /** Disable the floating tag. */
    showTag?: boolean;
    /** Which arm performs the fix motion. Defaults to 'right'. */
    fixSide?: FixSide;
}

type Phase = 'spawning' | 'idle' | 'walking' | 'fixing' | 'leaving' | 'despawning';

function snapY(p: Vec3): Vec3 {
    return [p[0], FLOOR_Y, p[2]];
}

export function GhostTechnician({
    targetPosition,
    pathPoints,
    spawnPosition,
    label = 'Ghost Tech',
    status,
    walkSpeed = 1.3,
    fixDuration = 12,
    spawnDelay = 0.2,
    returnHome = false,
    onDespawnComplete,
    showTrail = true,
    showTag = true,
    fixSide = 'right',
}: GhostTechnicianProps) {
    const groupRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<GhostBodyRef>(null);

    // Build the full waypoint list, snapped to floor
    const route = useMemo<Vec3[]>(() => {
        const pts = pathPoints && pathPoints.length > 0
            ? pathPoints
            : [targetPosition];
        return pts.map(snapY);
    }, [pathPoints, targetPosition]);

    const home = useMemo<Vec3>(
        () => snapY(spawnPosition ?? route[0]),
        [spawnPosition, route]
    );

    const [phase, setPhase] = useState<Phase>('spawning');
    const phaseRef = useRef(phase);
    phaseRef.current = phase;

    const segmentRef = useRef(0); // index into current waypoint chain
    const timerRef = useRef(0);
    const currentRouteRef = useRef<Vec3[]>(route);

    // How long the current walk segment has been running. Used to ease in
    // the walking speed so the avatar accelerates from a standstill instead
    // of teleporting to full velocity in one frame.
    const walkStartTimeRef = useRef(0);
    // Last frame's planar position — used to compute a true ground speed
    // (units / sec) that GhostBody reads to drive its stride frequency.
    const lastPlanarRef = useRef(new THREE.Vector2());
    // Smoothed ground speed (low-pass filtered to avoid jitter).
    const smoothedSpeedRef = useRef(0);
    // Total time since mount — used to drive the spawn drift (avatar
    // emerges from slightly below the floor and settles into place).
    const lifeTimeRef = useRef(0);
    // Total time since despawn began — drives the dissolve drift upward.
    const despawnTimeRef = useRef(0);

    // Initial position
    useEffect(() => {
        if (groupRef.current) {
            groupRef.current.position.set(home[0], home[1], home[2]);
            lastPlanarRef.current.set(home[0], home[2]);
        }
        const t = setTimeout(() => {
            bodyRef.current?.play('walk');
            setPhase('walking');
            currentRouteRef.current = route;
            segmentRef.current = 0;
            walkStartTimeRef.current = 0;
        }, Math.max(0, spawnDelay) * 1000);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Opacity fade in/out — bind to body material's uOpacity
    const matUniformProxy = useRef<{ value: number }>({ value: 0 });
    useEffect(() => {
        const id = setInterval(() => {
            const mat = bodyRef.current?.getMaterial();
            if (mat) {
                matUniformProxy.current = mat.uniforms.uOpacity as { value: number };
                clearInterval(id);
            }
        }, 30);
        return () => clearInterval(id);
    }, []);

    useOpacityAnimation({
        targetUniform: matUniformProxy.current,
        isDespawning: phase === 'despawning',
        onFadeOutComplete: () => onDespawnComplete?.(),
    });

    // Per-frame movement
    useFrame((_, dt) => {
        const grp = groupRef.current;
        if (!grp) return;

        // Spawn drift: emerge from ~8 cm below the floor over the first
        // 1.1 s. Despawn drift: rise gently in the air while fading out.
        // Both are subtle but make materialization feel deliberate.
        lifeTimeRef.current += dt;
        const SPAWN_DRIFT = 0.08;
        const SPAWN_DUR = 1.1;
        const spawnK = THREE.MathUtils.clamp(lifeTimeRef.current / SPAWN_DUR, 0, 1);
        const spawnEase = 1 - (1 - spawnK) * (1 - spawnK); // ease-out quad
        const spawnOffset = -SPAWN_DRIFT * (1 - spawnEase);

        let despawnOffset = 0;
        if (phase === 'despawning') {
            despawnTimeRef.current += dt;
            const dK = THREE.MathUtils.clamp(despawnTimeRef.current / 0.6, 0, 1);
            despawnOffset = dK * 0.12; // float up to 12 cm while fading
        }

        // Lock Y to the floor (plus drift offsets) — body stays upright, no bob
        grp.position.y = FLOOR_Y + spawnOffset + despawnOffset;

        if (phase !== 'walking' && phase !== 'leaving') {
            // While idle / fixing / despawning, decay published ground speed
            // toward zero so GhostBody's stride animation winds down naturally
            // instead of freezing mid-cycle.
            smoothedSpeedRef.current *= Math.max(0, 1 - dt * 6);
            grp.userData.groundSpeed = smoothedSpeedRef.current;
            lastPlanarRef.current.set(grp.position.x, grp.position.z);
            return;
        }

        const route = currentRouteRef.current;
        const idx = segmentRef.current;
        if (idx >= route.length) return;

        const target = route[idx];
        const dx = target[0] - grp.position.x;
        const dz = target[2] - grp.position.z;
        const dist = Math.hypot(dx, dz);

        // Face direction of travel
        if (dist > 0.001) {
            const yaw = Math.atan2(dx, dz);
            // Slerp yaw smoothly
            const cur = grp.rotation.y;
            let delta = yaw - cur;
            while (delta > Math.PI) delta -= Math.PI * 2;
            while (delta < -Math.PI) delta += Math.PI * 2;
            grp.rotation.y = cur + delta * Math.min(1, dt * 8);
        }

        // Walk-start ramp: ease the speed in over ~0.55s so the avatar
        // accelerates smoothly from rest rather than snapping to full
        // velocity on the first frame.
        walkStartTimeRef.current += dt;
        const startK = THREE.MathUtils.clamp(walkStartTimeRef.current / 0.55, 0, 1);
        const startEase = startK * startK * (3 - 2 * startK); // smoothstep

        // Decelerate when approaching the final waypoint of the current
        // route so the ghost "settles" into its stance rather than
        // hard-stopping mid-stride.
        const isFinalLeg = idx === route.length - 1;
        const decel = isFinalLeg ? Math.min(1, dist / 1.2) : 1;
        const easedSpeed = walkSpeed * (0.5 + 0.5 * decel) * startEase;
        const step = easedSpeed * dt;
        if (dist <= step) {
            grp.position.x = target[0];
            grp.position.z = target[2];
            segmentRef.current = idx + 1;
            // Reached the end of the current route
            if (segmentRef.current >= route.length) {
                if (phase === 'walking') {
                    setPhase('fixing');
                    timerRef.current = 0;
                    bodyRef.current?.setFixSide(fixSide);
                    bodyRef.current?.play('fix');
                } else if (phase === 'leaving') {
                    setPhase('despawning');
                }
            }
        } else {
            grp.position.x += (dx / dist) * step;
            grp.position.z += (dz / dist) * step;
        }

        // Compute and publish a smoothed ground speed for GhostBody to read.
        // Using actual displacement (not the desired speed) makes the leg
        // stride frequency naturally match the body's real ground travel,
        // killing the foot-slip "ice skating" look entirely.
        const last = lastPlanarRef.current;
        const moved = Math.hypot(grp.position.x - last.x, grp.position.z - last.y);
        const instSpeed = dt > 1e-5 ? moved / dt : 0;
        // Low-pass filter — fast attack, slower release feels natural.
        const tau = instSpeed > smoothedSpeedRef.current ? 12 : 6;
        const a = Math.min(1, dt * tau);
        smoothedSpeedRef.current += (instSpeed - smoothedSpeedRef.current) * a;
        grp.userData.groundSpeed = smoothedSpeedRef.current;
        // Publish yaw delta for head-leads-body lookahead in GhostBody.
        last.set(grp.position.x, grp.position.z);
    });

    // Fix timer -> leave or despawn
    useFrame((_, dt) => {
        if (phase !== 'fixing') return;
        timerRef.current += dt;
        if (timerRef.current >= fixDuration) {
            if (returnHome) {
                bodyRef.current?.play('walk');
                currentRouteRef.current = [...route].reverse().concat([home]);
                segmentRef.current = 0;
                walkStartTimeRef.current = 0; // re-arm the start ramp
                setPhase('leaving');
            } else {
                setPhase('despawning');
            }
        }
    });

    // Wisp emission window. Spawn wisps puff for the first ~1.2s after
    // mount, despawn wisps puff during the despawn fade.
    const wispMode: 'spawn' | 'despawn' | 'idle' =
        phase === 'despawning'
            ? 'despawn'
            : phase === 'spawning' || phase === 'walking'
                ? 'spawn'
                : 'idle';

    return (
        <group ref={groupRef}>
            <Suspense fallback={null}>
                <GhostBody ref={bodyRef} initialMode={'idle' as AnimationMode} />
            </Suspense>
            {showTag && <GhostTag label={label} status={status ?? phaseLabel(phase)} />}
            {showTrail && <GhostTrail sourceRef={groupRef} />}
            <GhostWisps mode={wispMode} />
            <GhostSparkles bodyRef={bodyRef} parentRef={groupRef} />
        </group>
    );
}

function phaseLabel(p: Phase): string {
    switch (p) {
        case 'spawning':
        case 'idle':
            return 'standby';
        case 'walking':
            return 'en route';
        case 'fixing':
            return 'servicing';
        case 'leaving':
            return 'returning';
        case 'despawning':
            return 'offline';
    }
}
