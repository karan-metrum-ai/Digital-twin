/**
 * FocusTrigger — bridge between DOM-side click handlers and the in-Canvas
 * camera state. Watches sceneStore.pending; when a focus request lands,
 * it captures the live camera position + orbit target as the "home" pose,
 * computes the focus target, and advances the state machine.
 *
 * Also wires the metricsStore polling lifecycle to the focus stage:
 * starts on focus, stops on overview.
 */

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore, computeFocusTarget } from './sceneStore';
import { useMetricsStore } from './metricsStore';

interface OrbitControlsLike {
  target: THREE.Vector3;
}

export function FocusTrigger() {
  const pending = useSceneStore((s) => s.pending);
  const stage = useSceneStore((s) => s.stage);
  const beginFocus = useSceneStore((s) => s.beginFocus);
  const clearPending = useSceneStore((s) => s.clearPending);
  const startPolling = useMetricsStore((s) => s.startPolling);
  const stopPolling = useMetricsStore((s) => s.stopPolling);

  const { camera, controls } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: OrbitControlsLike | null;
  };

  // Process any pending focus request.
  useEffect(() => {
    if (!pending) return;
    const target = computeFocusTarget(pending.device, pending.rack);
    const home = camera.position.clone();
    const homeTarget = controls ? controls.target.clone() : new THREE.Vector3(0, 0, 0);
    beginFocus(target, home, homeTarget);
    startPolling(pending.device.device_id);
    clearPending();
  }, [pending, camera, controls, beginFocus, clearPending, startPolling]);

  // Stop the metrics ticker when we leave the inspector.
  useEffect(() => {
    if (stage.kind === 'overview') {
      stopPolling();
    }
  }, [stage.kind, stopPolling]);

  return null;
}
