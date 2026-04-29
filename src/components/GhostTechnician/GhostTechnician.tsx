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

    // Initial position
    useEffect(() => {
        if (groupRef.current) {
            groupRef.current.position.set(home[0], home[1], home[2]);
        }
        const t = setTimeout(() => {
            bodyRef.current?.play('walk');
            setPhase('walking');
            currentRouteRef.current = route;
            segmentRef.current = 0;
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

        // Lock Y to the floor — body stays perfectly upright, no bob
        grp.position.y = FLOOR_Y;

        if (phase !== 'walking' && phase !== 'leaving') return;

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

        // Decelerate when approaching the final waypoint of the current
        // route so the ghost "settles" into its stance rather than
        // hard-stopping mid-stride.
        const isFinalLeg = idx === route.length - 1;
        const decel = isFinalLeg ? Math.min(1, dist / 1.2) : 1;
        const easedSpeed = walkSpeed * (0.5 + 0.5 * decel);
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
                setPhase('leaving');
            } else {
                setPhase('despawning');
            }
        }
    });

    return (
        <group ref={groupRef}>
            <Suspense fallback={null}>
                <GhostBody ref={bodyRef} initialMode={'idle' as AnimationMode} />
            </Suspense>
            {showTag && <GhostTag label={label} status={status ?? phaseLabel(phase)} />}
            {showTrail && <GhostTrail sourceRef={groupRef} />}
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
