/**
 * CameraController — drives the camera + OrbitControls target via springs
 * during the inspector flow.
 *
 * Stage handling:
 *   - overview     : no animation; OrbitControls fully enabled
 *   - zooming      : springs run from current pos/target -> focus pos/target
 *                    OrbitControls disabled (no fight between user + program)
 *   - exploding/exploded : camera held at focus pos; orbit stays disabled but
 *                    we lock the target on the focus center
 *   - collapsing   : after the layers re-stack, springs run from focus ->
 *                    cameraHome / cameraHomeTarget; OrbitControls re-enables
 *                    once the return tween settles
 *
 * IMPORTANT: don't enable OrbitControls during the tween — competing inputs
 * cause a visible "jerk" when input is handed back. We toggle .enabled.
 */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useSpring, easings } from '@react-spring/three';
import * as THREE from 'three';
import { useSceneStore } from './sceneStore';
import { CAMERA_DURATION } from './layers';

interface OrbitControlsLike {
  enabled: boolean;
  target: THREE.Vector3;
  update: () => void;
}

export function CameraController() {
  const stage = useSceneStore((s) => s.stage);
  const focus = useSceneStore((s) => s.focus);
  const cameraHome = useSceneStore((s) => s.cameraHome);
  const cameraHomeTarget = useSceneStore((s) => s.cameraHomeTarget);
  const onCameraArrived = useSceneStore((s) => s.onCameraArrived);
  const onReturnComplete = useSceneStore((s) => s.onReturnComplete);

  const { camera, controls, invalidate } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: OrbitControlsLike | null;
    invalidate: () => void;
  };

  // Track whether we're currently animating so we can suppress OrbitControls.
  const animatingRef = useRef(false);
  const phaseRef = useRef<'idle' | 'inbound' | 'outbound'>('idle');

  // Single spring driving 0..1 progress; we lerp pos/target manually each frame
  // so we have a single onRest to fire stage transitions from.
  const fromRef = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });
  const toRef = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });
  const tmpPos = useRef(new THREE.Vector3());
  const tmpTarget = useRef(new THREE.Vector3());

  const [, springApi] = useSpring(() => ({
    t: 0,
    config: { duration: CAMERA_DURATION * 1000, easing: easings.easeInOutCubic },
    onChange: (result) => {
      const t = result.value.t as number;
      tmpPos.current.lerpVectors(fromRef.current.pos, toRef.current.pos, t);
      tmpTarget.current.lerpVectors(fromRef.current.target, toRef.current.target, t);
      camera.position.copy(tmpPos.current);
      if (controls) {
        controls.target.copy(tmpTarget.current);
        controls.update();
      } else {
        camera.lookAt(tmpTarget.current);
      }
      invalidate();
    },
    onRest: () => {
      animatingRef.current = false;
      if (phaseRef.current === 'inbound') {
        phaseRef.current = 'idle';
        onCameraArrived();
      } else if (phaseRef.current === 'outbound') {
        phaseRef.current = 'idle';
        if (controls) controls.enabled = true;
        onReturnComplete();
      }
    },
  }));

  // Kick off the inbound dolly when stage enters "zooming".
  useEffect(() => {
    if (stage.kind === 'zooming' && focus) {
      if (controls) controls.enabled = false;
      fromRef.current.pos.copy(camera.position);
      fromRef.current.target.copy(controls ? controls.target : new THREE.Vector3());
      toRef.current.pos.copy(focus.cameraPosition);
      toRef.current.target.copy(focus.cameraTarget);
      animatingRef.current = true;
      phaseRef.current = 'inbound';
      springApi.start({ from: { t: 0 }, to: { t: 1 }, reset: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.kind === 'zooming' ? stage.serverId : null]);

  // Kick off the outbound return when collapsing finishes its layer phase.
  // We watch for stage = collapsing AND animatingRef = false (means the
  // ExplodedServer's onCollapseComplete already fired and we're now waiting
  // to return). To avoid double-trigger, also require phase = idle.
  useEffect(() => {
    if (stage.kind === 'collapsing' && cameraHome && cameraHomeTarget) {
      // Wait one tick so the layer collapse animation has time to fully reset.
      const handle = setTimeout(() => {
        if (controls) controls.enabled = false;
        fromRef.current.pos.copy(camera.position);
        fromRef.current.target.copy(controls ? controls.target : new THREE.Vector3());
        toRef.current.pos.copy(cameraHome);
        toRef.current.target.copy(cameraHomeTarget);
        animatingRef.current = true;
        phaseRef.current = 'outbound';
        springApi.start({ from: { t: 0 }, to: { t: 1 }, reset: true });
      }, 50);
      return () => clearTimeout(handle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.kind === 'collapsing' ? stage.serverId : null]);

  // While focused/exploded, hold the orbit target locked on the focus center
  // and keep OrbitControls disabled so accidental drags don't drift.
  useEffect(() => {
    if (!controls) return;
    if (stage.kind === 'overview') {
      controls.enabled = true;
    } else {
      controls.enabled = false;
      if (focus) controls.target.copy(focus.cameraTarget);
    }
  }, [stage.kind, focus, controls]);

  return null;
}
