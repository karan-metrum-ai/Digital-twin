/**
 * GhostTechnicians
 *
 * Spawns 2-3 holographic technicians inside the data center scene and
 * routes each one along an L-shaped track from a corridor entry to the
 * service spot directly in front of a chosen server rack. Once there
 * the technician STAYS at the rack and plays the fix (hand up/down)
 * motion. After a long service window the ghost despawns and a fresh
 * one spawns at a different rack.
 *
 * Collision avoidance:
 *  - No two ghosts target the same rack at the same time.
 *  - Each ghost is assigned its own corridor lane Z so they do not
 *    walk through one another in the corridor.
 *  - Each ghost owns its own corridor entry side so paths are
 *    spatially separated end-to-end.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Rack3D } from './types';
import { GhostTechnician } from '../GhostTechnician';

interface GhostTechniciansProps {
    racks: Rack3D[];
    /** How many ghosts to keep alive at once. Defaults to 3. */
    count?: number;
}

interface ActiveGhost {
    id: number;
    slot: number; // 0..count-1, owns a unique lane + entry
    rack: Rack3D;
    spawn: [number, number, number];
    path: [number, number, number][];
    label: string;
    fixSide: 'left' | 'right';
}

/**
 * Per-slot corridor lane assignment. Each ghost uses a different
 * Z-line in the corridor so they never overlap while walking.
 *
 * Row A racks live at z = -3.8 (doors face +Z toward corridor).
 * Row B racks live at z = +3.8 (doors face -Z).
 * Corridor usable Z range is roughly [-3.0 .. +3.0].
 */
const SLOT_LANES_ROW_A = [-2.4, -1.6, -0.8]; // 3 distinct lanes for Row A targets
const SLOT_LANES_ROW_B = [2.4, 1.6, 0.8];

/** Service spot in front of the rack door — far enough not to clip. */
const SERVICE_GAP = 1.0;

function buildRoute(
    rack: Rack3D,
    slot: number,
    fromLeft: boolean
): {
    spawn: [number, number, number];
    path: [number, number, number][];
} {
    const [rx, , rz] = rack.position;
    const isRowA = rz < 0;

    const lanes = isRowA ? SLOT_LANES_ROW_A : SLOT_LANES_ROW_B;
    const laneZ = lanes[slot % lanes.length];

    const serviceZ = isRowA ? rz + SERVICE_GAP : rz - SERVICE_GAP;
    const entryX = fromLeft ? -12.5 : 12.5;
    const lanePathX = fromLeft ? -10.5 : 10.5;
    // Rack center is at rack.position.x + 0.29 (mesh local offset)
    const approachX = rx + 0.29;

    const spawn: [number, number, number] = [entryX, 0, laneZ];
    const path: [number, number, number][] = [
        [lanePathX, 0, laneZ],
        [approachX, 0, laneZ],
        [approachX, 0, serviceZ],
    ];
    return { spawn, path };
}

const NAMES = ['HOLO-01', 'HOLO-02', 'HOLO-03', 'HOLO-04', 'HOLO-05', 'HOLO-06'];

export function GhostTechnicians({ racks, count = 3 }: GhostTechniciansProps) {
    const targetCount = Math.min(count, Math.max(1, Math.floor(racks.length / 2)));
    const [active, setActive] = useState<ActiveGhost[]>([]);
    const idSeed = useMemo(() => ({ next: 0 }), []);

    /** Pick a rack that is not currently being serviced by another ghost. */
    const pickRack = useCallback(
        (taken: Set<string>): Rack3D | null => {
            const free = racks.filter((r) => !taken.has(r.rack_id));
            if (free.length === 0) return null;
            return free[Math.floor(Math.random() * free.length)];
        },
        [racks]
    );

    const spawnOne = useCallback(
        (slot: number, taken: Set<string>): ActiveGhost | null => {
            const rack = pickRack(taken);
            if (!rack) return null;
            const fromLeft = slot % 2 === 0;
            const { spawn, path } = buildRoute(rack, slot, fromLeft);
            const id = idSeed.next++;
            const fixSide: 'left' | 'right' = id % 2 === 0 ? 'right' : 'left';
            return {
                id,
                slot,
                rack,
                spawn,
                path,
                label: NAMES[id % NAMES.length],
                fixSide,
            };
        },
        [pickRack, idSeed]
    );

    // Initial staggered fill
    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        for (let slot = 0; slot < targetCount; slot++) {
            const t = setTimeout(() => {
                setActive((prev) => {
                    if (prev.some((g) => g.slot === slot)) return prev;
                    const taken = new Set(prev.map((g) => g.rack.rack_id));
                    const g = spawnOne(slot, taken);
                    return g ? [...prev, g] : prev;
                });
            }, slot * 2200);
            timers.push(t);
        }
        return () => timers.forEach(clearTimeout);
    }, [targetCount, spawnOne]);

    const handleDespawn = useCallback(
        (id: number) => {
            setActive((prev) => {
                const dying = prev.find((g) => g.id === id);
                const filtered = prev.filter((g) => g.id !== id);
                if (!dying) return filtered;
                const taken = new Set(filtered.map((g) => g.rack.rack_id));
                const replacement = spawnOne(dying.slot, taken);
                return replacement ? [...filtered, replacement] : filtered;
            });
        },
        [spawnOne]
    );

    return (
        <>
            {active.map((g) => (
                <GhostTechnician
                    key={g.id}
                    spawnPosition={g.spawn}
                    pathPoints={g.path}
                    targetPosition={g.path[g.path.length - 1]}
                    label={g.label}
                    status={`servicing ${g.rack.rack_id}`}
                    walkSpeed={1.3}
                    fixDuration={14}
                    fixSide={g.fixSide}
                    returnHome={false}
                    onDespawnComplete={() => handleDespawn(g.id)}
                />
            ))}
        </>
    );
}

export default GhostTechnicians;
