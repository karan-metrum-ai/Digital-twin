/**
 * ServerLayer — one named child of the exploded server.
 *
 * Procedural placeholder geometry that follows the contract described in
 * layers.ts. Swap the inner <mesh> for a GLTF node lookup later and the rest
 * of the scene continues to work — the explode animation, label, emissive
 * heat driver are all driven by props.
 */

import { useMemo } from 'react';
import { animated, useSpring, easings } from '@react-spring/three';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { LayerConfig } from './layers';
import { LAYER_DURATION, LAYER_STAGGER } from './layers';
import type { LayerMetric } from './metricsStore';
import { healthColor } from './metricsStore';

interface ServerLayerProps {
  layer: LayerConfig;
  /** y offset to lerp to (0 = stacked, > 0 = exploded apart). */
  targetOffset: number;
  /** true once the explode tween should run for this layer. */
  exploding: boolean;
  /** live metric for this layer; null until polling kicks in. */
  metric: LayerMetric | null;
  /** show the floating callout label + value. */
  showLabel: boolean;
  /** called when this layer's spring settles (used to detect explode complete). */
  onSettle?: () => void;
}

export function ServerLayer({
  layer,
  targetOffset,
  exploding,
  metric,
  showLabel,
  onSettle,
}: ServerLayerProps) {
  // Stagger the explode/collapse start per layer slot.
  const delay = exploding ? layer.slot * LAYER_STAGGER * 1000 : (7 - layer.slot) * LAYER_STAGGER * 1000;

  const { y } = useSpring({
    y: targetOffset,
    delay,
    config: {
      duration: LAYER_DURATION * 1000,
      easing: exploding ? easings.easeOutBack : easings.easeInOutCubic,
    },
    onRest: () => {
      if (onSettle) onSettle();
    },
  });

  const severity = metric?.severity ?? 0;
  const health = metric?.health ?? 'ok';
  const heatColor = useMemo(() => {
    // Lerp from the layer's tint -> hot orange/red as severity climbs.
    const base = new THREE.Color(layer.tint);
    const hot = new THREE.Color(health === 'critical' ? '#ff3a1a' : health === 'warning' ? '#ffa033' : '#ffaa55');
    return base.clone().lerp(hot, Math.min(1, severity));
  }, [layer.tint, severity, health]);

  const emissiveIntensity = 0.05 + severity * 0.9;

  // Each layer renders a stylized "PCB plate" so the explode reads visually:
  // a base board + a few component cubes on top. All wrapped in a named group
  // so a real GLTF can be swapped in by name later.
  return (
    <animated.group name={layer.id} position-y={y}>
      {/* Base plate */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[layer.width, layer.height, layer.depth]} />
        <meshStandardMaterial
          color={layer.tint}
          metalness={0.5}
          roughness={0.55}
          emissive={heatColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Per-layer accent details so each slot reads differently in 3D. */}
      <LayerAccents layer={layer} severity={severity} health={health} />

      {showLabel && (
        <Html
          position={[layer.width / 2 + 0.18, 0, 0]}
          center
          zIndexRange={[120, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <LayerCallout layer={layer} metric={metric} />
        </Html>
      )}
    </animated.group>
  );
}

/**
 * LayerAccents — a few small boxes/strips that hint at what each component
 * looks like (DIMM slots, GPU fans, NIC ports). Pure decoration; keeps the
 * stack visually distinct without needing real GLTFs.
 */
function LayerAccents({
  layer,
  severity,
  health,
}: {
  layer: LayerConfig;
  severity: number;
  health: 'ok' | 'warning' | 'critical';
}) {
  const accentColor = health === 'critical' ? '#ff3a1a' : health === 'warning' ? '#f59e0b' : '#3a8de8';
  const accentEmissive = 0.6 + severity * 1.5;

  switch (layer.id) {
    case 'gpu_cards':
      // Two GPU cards with circular fans (cylinders).
      return (
        <group position-y={layer.height / 2 + 0.04}>
          {[-0.32, 0.32].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.5, 0.07, 0.4]} />
                <meshStandardMaterial color="#1c1c22" metalness={0.6} roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 0.02, 24]} />
                <meshStandardMaterial color="#2a2a30" metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.07, 0]}>
                <boxGeometry args={[0.42, 0.005, 0.04]} />
                <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={accentEmissive} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 'ram_dimms':
      // 8 vertical DIMM sticks.
      return (
        <group position-y={layer.height / 2 + 0.06}>
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh key={i} position={[(i - 3.5) * 0.085, 0, 0]} castShadow>
              <boxGeometry args={[0.04, 0.12, 0.14]} />
              <meshStandardMaterial color="#0e1e2a" metalness={0.4} roughness={0.5} emissive={accentColor} emissiveIntensity={0.15 + severity * 0.4} />
            </mesh>
          ))}
        </group>
      );
    case 'cpu_sockets':
      // Two CPU heatsinks.
      return (
        <group position-y={layer.height / 2 + 0.04}>
          {[-0.22, 0.22].map((x) => (
            <mesh key={x} position={[x, 0, 0]} castShadow>
              <boxGeometry args={[0.22, 0.08, 0.22]} />
              <meshStandardMaterial color="#3c3f48" metalness={0.85} roughness={0.25} />
            </mesh>
          ))}
        </group>
      );
    case 'storage':
      // 4 NVMe sticks side by side.
      return (
        <group position-y={layer.height / 2 + 0.03}>
          {Array.from({ length: 4 }).map((_, i) => (
            <mesh key={i} position={[(i - 1.5) * 0.26, 0, 0]} castShadow>
              <boxGeometry args={[0.2, 0.04, 0.32]} />
              <meshStandardMaterial color="#1c1f2a" metalness={0.5} roughness={0.45} emissive={accentColor} emissiveIntensity={0.1 + severity * 0.3} />
            </mesh>
          ))}
        </group>
      );
    case 'network_cards':
      // Three RJ45-like ports glowing.
      return (
        <group position-y={layer.height / 2 + 0.02}>
          {[-0.2, 0, 0.2].map((x) => (
            <mesh key={x} position={[x, 0, layer.depth / 2 - 0.04]}>
              <boxGeometry args={[0.08, 0.04, 0.04]} />
              <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.4 + severity * 1.2} />
            </mesh>
          ))}
        </group>
      );
    case 'psu_fans':
      // Two large fans (cylinders).
      return (
        <group position-y={layer.height / 2 + 0.04}>
          {[-0.4, 0.4].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.16, 0.04, 28]} />
              <meshStandardMaterial color="#202028" metalness={0.7} roughness={0.4} />
            </mesh>
          ))}
        </group>
      );
    case 'motherboard':
      // Subtle copper traces using emissive lines.
      return (
        <group position-y={layer.height / 2 + 0.005}>
          <mesh>
            <boxGeometry args={[layer.width * 0.95, 0.002, layer.depth * 0.95]} />
            <meshStandardMaterial color="#0c2a1d" emissive="#0c5a36" emissiveIntensity={0.35} />
          </mesh>
        </group>
      );
    case 'chassis_shell':
      // Outline accent strip.
      return (
        <mesh position={[0, layer.height / 2 + 0.001, layer.depth / 2 - 0.02]}>
          <boxGeometry args={[layer.width * 0.7, 0.004, 0.01]} />
          <meshStandardMaterial color="#3a8de8" emissive="#3a8de8" emissiveIntensity={1.1} />
        </mesh>
      );
    default:
      return null;
  }
}

function LayerCallout({ layer, metric }: { layer: LayerConfig; metric: LayerMetric | null }) {
  const value = metric?.value;
  const display =
    value === undefined
      ? '— ' + layer.unit
      : layer.unit === 'IOPS'
        ? Math.round(value).toLocaleString() + ' ' + layer.unit
        : value >= 100
          ? Math.round(value).toString() + ' ' + layer.unit
          : value.toFixed(1) + ' ' + layer.unit;

  const pillColor = healthColor(metric?.health ?? 'ok');

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(10, 12, 18, 0.92)',
        border: `1px solid ${pillColor}55`,
        borderRadius: 6,
        padding: '6px 10px',
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: '#e5e7eb',
        boxShadow: `0 0 12px ${pillColor}33`,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        transform: 'translateX(8px)',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: pillColor,
          boxShadow: `0 0 8px ${pillColor}`,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: '#9ca3af', textTransform: 'uppercase' }}>
          {layer.label}
        </span>
        <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#fff' }}>{display}</span>
      </div>
    </div>
  );
}
