export { GhostTechnician } from './GhostTechnician';
export type { GhostTechnicianProps } from './GhostTechnician';

export { GhostBody } from './GhostBody';
export type { GhostBodyRef, AnimationMode, FixSide } from './GhostBody';

export { GhostTag } from './GhostTag';
export type { GhostTagProps } from './GhostTag';

export { GhostTrail } from './GhostTrail';
export type { GhostTrailProps } from './GhostTrail';

export {
    createGhostMaterial,
    cloneGhostMaterial,
    disposeGhostMaterial,
    GHOST_COLORS,
    FLOOR_Y,
} from './ghostMaterial';

export {
    useOpacityAnimation,
    useBreathingAnimation,
    GHOST_MAX_OPACITY,
} from './useArmAnimation';
