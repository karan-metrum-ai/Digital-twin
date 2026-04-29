/**
 * sceneStore — Zustand state machine for the exploded-server inspector.
 *
 * Five stages, modeled as a discriminated union so the camera/explode logic
 * can branch exhaustively (TS will complain if you forget a branch):
 *
 *   overview -> zooming -> focused -> exploding -> exploded
 *                                            ^             |
 *                                            └─ collapsing ┘
 */

import { create } from 'zustand';
import * as THREE from 'three';
import type { Device3D, Rack3D } from '../types';

export type SceneStageKind =
  | 'overview'
  | 'zooming'
  | 'focused'
  | 'exploding'
  | 'exploded'
  | 'collapsing';

export type SceneStage =
  | { kind: 'overview' }
  | { kind: 'zooming'; serverId: string }
  | { kind: 'focused'; serverId: string }
  | { kind: 'exploding'; serverId: string }
  | { kind: 'exploded'; serverId: string }
  | { kind: 'collapsing'; serverId: string };

/**
 * Resolved focus target — world-space coordinates of the clicked server,
 * computed once when focus begins so the camera + exploder share one source
 * of truth.
 */
export interface FocusTarget {
  serverId: string;
  device: Device3D;
  rack: Rack3D;
  /** world position of the server's chassis center. */
  position: THREE.Vector3;
  /** world rotation around Y, matches the rack rotation. */
  yaw: number;
  /** camera position to dolly to (world space). */
  cameraPosition: THREE.Vector3;
  /** point the camera should look at. */
  cameraTarget: THREE.Vector3;
}

interface SceneStoreState {
  stage: SceneStage;
  focus: FocusTarget | null;
  /** position the camera should return to when collapsing back to overview. */
  cameraHome: THREE.Vector3 | null;
  cameraHomeTarget: THREE.Vector3 | null;
  /**
   * Bridge: outside-Canvas code sets a pending request; an inside-Canvas
   * hook (FocusTrigger) reads it, captures the live camera state, and
   * calls beginFocus(). Keeps DOM and R3F worlds cleanly separated.
   */
  pending: { device: Device3D; rack: Rack3D } | null;
  requestFocus: (device: Device3D, rack: Rack3D) => void;
  clearPending: () => void;

  beginFocus: (target: FocusTarget, cameraHome: THREE.Vector3, cameraHomeTarget: THREE.Vector3) => void;
  /** Called by CameraController when the dolly tween settles. */
  onCameraArrived: () => void;
  /** Called by ExplodedServer when all layer springs settle. */
  onExplodeComplete: () => void;
  /** User clicked the Collapse button. */
  collapse: () => void;
  /** Called by ExplodedServer when the collapse tween settles. */
  onCollapseComplete: () => void;
  /** Called by CameraController when the return tween settles. */
  onReturnComplete: () => void;

  /** Convenience accessor — true if the inspector is in any non-overview stage. */
  isInspecting: () => boolean;
  /** True if user input (orbit) should be locked. */
  isCameraLocked: () => boolean;
}

export const useSceneStore = create<SceneStoreState>((set, get) => ({
  stage: { kind: 'overview' },
  focus: null,
  cameraHome: null,
  cameraHomeTarget: null,
  pending: null,

  requestFocus: (device, rack) => {
    // Ignore re-clicks if we're already inspecting (would jank the camera).
    if (get().stage.kind !== 'overview') return;
    set({ pending: { device, rack } });
  },

  clearPending: () => set({ pending: null }),

  beginFocus: (target, cameraHome, cameraHomeTarget) => {
    set({
      stage: { kind: 'zooming', serverId: target.serverId },
      focus: target,
      cameraHome: cameraHome.clone(),
      cameraHomeTarget: cameraHomeTarget.clone(),
    });
  },

  onCameraArrived: () => {
    const stage = get().stage;
    if (stage.kind === 'zooming') {
      // Move straight into exploding — the slide-out is part of explode anim.
      set({ stage: { kind: 'exploding', serverId: stage.serverId } });
    }
  },

  onExplodeComplete: () => {
    const stage = get().stage;
    if (stage.kind === 'exploding') {
      set({ stage: { kind: 'exploded', serverId: stage.serverId } });
    }
  },

  collapse: () => {
    const stage = get().stage;
    if (stage.kind === 'exploded' || stage.kind === 'focused') {
      set({ stage: { kind: 'collapsing', serverId: stage.serverId } });
    }
  },

  onCollapseComplete: () => {
    const stage = get().stage;
    if (stage.kind === 'collapsing') {
      // Layers re-stacked — now tween camera back. Stage stays "collapsing"
      // until the camera return finishes; CameraController watches for this.
      set({ stage: { kind: 'collapsing', serverId: stage.serverId } });
    }
  },

  onReturnComplete: () => {
    set({ stage: { kind: 'overview' }, focus: null });
  },

  isInspecting: () => get().stage.kind !== 'overview',
  isCameraLocked: () => {
    const k = get().stage.kind;
    return k === 'zooming' || k === 'exploding' || k === 'exploded' || k === 'collapsing';
  },
}));

/**
 * Compute a world-space focus target for a clicked device.
 *
 * Mirrors the slot math from ServerRack.tsx:
 *   - rack origin is at rack.position
 *   - server local position is (0.29, yPos, 0.15) inside that rack group
 *   - racks may be rotated 180° around Y (Row B), so we rotate the local
 *     offset before adding it to the rack origin.
 */
export function computeFocusTarget(device: Device3D, rack: Rack3D): FocusTarget {
  const slotSpacing = 0.082;
  const heightU = Math.max(1, Math.floor(device.height_u || 1));
  const firstIndex = Math.max(0, device.u_position - 1);
  const baseY = -0.76 + firstIndex * slotSpacing;
  const centerOffset = ((heightU - 1) * slotSpacing) / 2;
  const localY = baseY + centerOffset;

  const yaw = rack.rotation?.[1] ?? 0;
  const local = new THREE.Vector3(0.29, localY, 0.15);
  local.applyEuler(new THREE.Euler(0, yaw, 0));

  const worldPos = new THREE.Vector3(
    rack.position[0] + local.x,
    rack.position[1] + local.y,
    rack.position[2] + local.z
  );

  // Camera sits in front of the server (forward direction depends on rack yaw).
  // For Row A (yaw=0), front face is +Z; for Row B (yaw=π), front face is -Z.
  const forward = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, yaw, 0));
  const cameraDistance = 2.6;
  const cameraHeightLift = 0.55;

  const cameraPosition = worldPos.clone().add(forward.clone().multiplyScalar(cameraDistance));
  cameraPosition.y += cameraHeightLift;

  // Look slightly above the chassis so the exploded stack is centered in view.
  const cameraTarget = worldPos.clone();
  cameraTarget.y += 0.55;

  return {
    serverId: device.device_id,
    device,
    rack,
    position: worldPos,
    yaw,
    cameraPosition,
    cameraTarget,
  };
}
