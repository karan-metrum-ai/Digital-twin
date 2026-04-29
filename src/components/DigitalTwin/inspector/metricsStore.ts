/**
 * metricsStore — mocked live telemetry for the focused server's components.
 *
 * One ring buffer per (serverId, layerId). The ticker only runs while the
 * inspector is focused on a server, and only updates that server. When the
 * user collapses back to overview, the ticker stops.
 *
 * Real implementation would swap out tick() for a websocket subscription.
 */

import { create } from 'zustand';
import type { LayerId } from './layers';
import { LAYERS } from './layers';

const HISTORY_LEN = 60;

export type Health = 'ok' | 'warning' | 'critical';

export interface LayerMetric {
  /** current value, units defined per layer in layers.ts */
  value: number;
  /** rolling history, oldest first, length up to HISTORY_LEN. */
  history: number[];
  /** derived health based on value vs. layer thresholds. */
  health: Health;
  /** 0-1, drives emissive heat in the 3D view (1 = critically hot). */
  severity: number;
}

export type ServerMetrics = Record<LayerId, LayerMetric>;

interface MetricsStoreState {
  /** keyed by serverId. Only the currently-focused server has fresh data. */
  servers: Record<string, ServerMetrics>;
  /** id of the server currently being polled; null when overview. */
  activeServerId: string | null;

  startPolling: (serverId: string) => void;
  stopPolling: () => void;
  /** Internal — invoked by the polling interval. */
  tick: () => void;
}

/**
 * Per-layer realistic value ranges for the procedural mock. Tuned so the
 * inspector shows interesting variation across the 8 components.
 */
const RANGES: Record<LayerId, { min: number; max: number; warn: number; crit: number }> = {
  chassis_shell: { min: 22, max: 35, warn: 32, crit: 38 },          // ambient °C
  psu_fans: { min: 3000, max: 6500, warn: 6000, crit: 7000 },        // rpm
  motherboard: { min: 38, max: 55, warn: 60, crit: 70 },             // °C
  cpu_sockets: { min: 15, max: 95, warn: 80, crit: 92 },             // % util
  gpu_cards: { min: 45, max: 88, warn: 80, crit: 87 },               // °C
  ram_dimms: { min: 60, max: 240, warn: 220, crit: 248 },            // GB used (out of 256)
  storage: { min: 8000, max: 95000, warn: 80000, crit: 90000 },      // IOPS
  network_cards: { min: 2, max: 95, warn: 85, crit: 95 },            // Gb/s
};

function seedHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function evalHealth(layerId: LayerId, value: number): { health: Health; severity: number } {
  const r = RANGES[layerId];
  if (value >= r.crit) return { health: 'critical', severity: 1 };
  if (value >= r.warn) {
    const t = (value - r.warn) / Math.max(0.001, r.crit - r.warn);
    return { health: 'warning', severity: 0.5 + 0.5 * t };
  }
  // normalize warm-but-ok values to a small severity so very cool stays at 0
  const cool = (value - r.min) / Math.max(0.001, r.warn - r.min);
  return { health: 'ok', severity: Math.max(0, Math.min(0.4, cool * 0.4)) };
}

function generate(serverId: string, t: number): ServerMetrics {
  const seed = seedHash(serverId);
  const out = {} as ServerMetrics;
  for (const layer of LAYERS) {
    const r = RANGES[layer.id];
    const phase = seed * 6.28 + layer.slot * 0.7;
    // Sinusoidal base + small noise + slow drift, clamped to [min, max].
    const sine = (Math.sin(t * 0.7 + phase) + 1) / 2;          // 0..1
    const noise = (Math.sin(t * 3.1 + phase * 2.3) * 0.5 + 0.5) * 0.15;
    const norm = Math.min(1, Math.max(0, sine * 0.85 + noise));
    const value = r.min + (r.max - r.min) * norm;
    const { health, severity } = evalHealth(layer.id, value);
    out[layer.id] = {
      value,
      history: [value],
      health,
      severity,
    };
  }
  return out;
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let tickCounter = 0;

export const useMetricsStore = create<MetricsStoreState>((set, get) => ({
  servers: {},
  activeServerId: null,

  startPolling: (serverId) => {
    if (get().activeServerId === serverId) return;

    // Seed first frame immediately so the HUD doesn't blank for 1s.
    const seedFrame = generate(serverId, tickCounter);
    set((state) => ({
      activeServerId: serverId,
      servers: { ...state.servers, [serverId]: seedFrame },
    }));

    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = setInterval(() => get().tick(), 1000);
  },

  stopPolling: () => {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
    set({ activeServerId: null });
  },

  tick: () => {
    const { activeServerId, servers } = get();
    if (!activeServerId) return;
    tickCounter += 1;
    const current = servers[activeServerId];
    const fresh = generate(activeServerId, tickCounter);
    const merged = {} as ServerMetrics;
    for (const layer of LAYERS) {
      const next = fresh[layer.id];
      const prevHistory = current?.[layer.id]?.history ?? [];
      const history = [...prevHistory, next.value].slice(-HISTORY_LEN);
      merged[layer.id] = { ...next, history };
    }
    set({ servers: { ...servers, [activeServerId]: merged } });
  },
}));

/** Health -> hex color, used by the HUD pill and the layer emissive driver. */
export function healthColor(h: Health): string {
  if (h === 'critical') return '#ef4444';
  if (h === 'warning') return '#f59e0b';
  return '#10b981';
}
