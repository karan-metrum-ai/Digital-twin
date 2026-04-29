/**
 * ExplodedServer — the high-detail server that appears at the focused slot
 * and explodes apart vertically.
 *
 * Composed of 8 named layers (see layers.ts). Mounted only while the scene
 * is in zooming/focused/exploding/exploded/collapsing — not in overview.
 *
 * Animation choreography (driven by the sceneStore stage):
 *   1. zooming   -> mounted at the rack origin, layers stacked, slide=0
 *   2. exploding -> slide forward (+forwardVec * SLIDE_OUT_DISTANCE) AND
 *                   layer y-offsets ramp from 0 -> slot * LAYER_SPACING
 *   3. exploded  -> hold, labels visible
 *   4. collapsing-> reverse explode, then slide back, then sceneStore advances
 */

import { useMemo, useRef } from 'react';
import { useSpring, animated, easings } from '@react-spring/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from './sceneStore';
import { useMetricsStore } from './metricsStore';
import {
  LAYERS,
  LAYER_SPACING,
  SLIDE_OUT_DISTANCE,
  SLIDE_DURATION,
} from './layers';
import { ServerLayer } from './ServerLayer';

export function ExplodedServer() {
  const stage = useSceneStore((s) => s.stage);
  const focus = useSceneStore((s) => s.focus);
  const onExplodeComplete = useSceneStore((s) => s.onExplodeComplete);
  const onCollapseComplete = useSceneStore((s) => s.onCollapseComplete);
  const metrics = useMetricsStore((s) =>
    focus ? s.servers[focus.serverId] ?? null : null
  );
  const invalidate = useThree((s) => s.invalidate);

  const settledCountRef = useRef(0);

  const isExploding = stage.kind === 'exploding';
  const isExploded = stage.kind === 'exploded';
  const isCollapsing = stage.kind === 'collapsing';

  // The layer's target offset from its stacked position. Zero in zooming,
  // full spacing in exploding/exploded, back to zero during collapsing.
  const layerOffset = (slot: number) => {
    if (isExploding || isExploded) return slot * LAYER_SPACING;
    return 0;
  };

  // Forward direction in world space, derived from rack yaw.
  // For Row A (yaw=0) forward is +Z, for Row B (yaw=π) forward is -Z.
  const forward = useMemo(() => {
    if (!focus) return new THREE.Vector3(0, 0, 1);
    return new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, focus.yaw, 0));
  }, [focus]);

  // Slide forward when exploding/exploded, slide back during collapsing.
  const slideTarget = isExploding || isExploded ? SLIDE_OUT_DISTANCE : 0;

  const slide = useSpring({
    s: slideTarget,
    config: { duration: SLIDE_DURATION * 1000, easing: easings.easeOutQuart },
    onChange: () => invalidate(),
  });

  // Reset settled counter whenever stage changes meaningfully.
  if (
    (isExploding && settledCountRef.current >= LAYERS.length) ||
    (isCollapsing && settledCountRef.current >= LAYERS.length)
  ) {
    settledCountRef.current = 0;
  }

  if (!focus) return null;

  const handleLayerSettle = () => {
    settledCountRef.current += 1;
    if (settledCountRef.current >= LAYERS.length) {
      if (isExploding) onExplodeComplete();
      else if (isCollapsing) onCollapseComplete();
      settledCountRef.current = 0;
    }
  };

  // Group origin = focus.position. We orient the group with the rack yaw so
  // that local +Z still points "out of the rack" for the slide animation.
  return (
    <animated.group
      position-x={slide.s.to((s) => focus.position.x + forward.x * s)}
      position-y={focus.position.y}
      position-z={slide.s.to((s) => focus.position.z + forward.z * s)}
      rotation-y={focus.yaw}
    >
      {LAYERS.map((layer) => (
        <ServerLayer
          key={layer.id}
          layer={layer}
          targetOffset={layerOffset(layer.slot)}
          exploding={isExploding || isExploded}
          metric={metrics?.[layer.id] ?? null}
          showLabel={isExploded}
          onSettle={handleLayerSettle}
        />
      ))}
    </animated.group>
  );
}
