/**
 * Reusable animation hooks for the ghost technician.
 *
 * - `useOpacityAnimation` smoothly ramps a uniform from 0..GHOST_MAX_OPACITY
 *   on spawn, and back to 0 on despawn, calling onComplete when fully faded.
 * - `useBreathingAnimation` returns a per-frame Y bob factor for idle motion.
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export const GHOST_MAX_OPACITY = 0.95;

export function useOpacityAnimation(opts: {
    targetUniform: { value: number };
    isDespawning: boolean;
    fadeInDuration?: number;
    fadeOutDuration?: number;
    onFadeOutComplete?: () => void;
}) {
    const {
        targetUniform,
        isDespawning,
        fadeInDuration = 0.6,
        fadeOutDuration = 0.6,
        onFadeOutComplete,
    } = opts;

    const completedRef = useRef(false);

    useEffect(() => {
        completedRef.current = false;
    }, [isDespawning]);

    useFrame((_, dt) => {
        const target = isDespawning ? 0 : GHOST_MAX_OPACITY;
        const duration = isDespawning ? fadeOutDuration : fadeInDuration;
        const speed = GHOST_MAX_OPACITY / Math.max(0.0001, duration);
        const cur = targetUniform.value;
        if (cur < target) {
            targetUniform.value = Math.min(target, cur + speed * dt);
        } else if (cur > target) {
            targetUniform.value = Math.max(target, cur - speed * dt);
        }
        if (
            isDespawning &&
            !completedRef.current &&
            targetUniform.value <= 0.001
        ) {
            completedRef.current = true;
            onFadeOutComplete?.();
        }
    });
}

export function useBreathingAnimation(opts: {
    amplitude?: number;
    frequency?: number;
} = {}) {
    const { amplitude = 0.04, frequency = 1.2 } = opts;
    const ref = useRef({ y: 0, t: Math.random() * Math.PI * 2 });

    useFrame((_, dt) => {
        ref.current.t += dt * frequency;
        ref.current.y = Math.sin(ref.current.t) * amplitude;
    });

    return ref;
}
