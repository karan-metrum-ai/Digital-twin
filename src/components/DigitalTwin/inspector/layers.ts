/**
 * Server layer configuration.
 *
 * The 8 named child nodes that make up an exploded server. Match these names
 * exactly in any GLTF model so the swap from procedural placeholder -> real
 * model is a one-line change. Order is bottom -> top of the stack.
 */

export type LayerId =
  | 'chassis_shell'
  | 'psu_fans'
  | 'motherboard'
  | 'cpu_sockets'
  | 'gpu_cards'
  | 'ram_dimms'
  | 'storage'
  | 'network_cards';

export interface LayerConfig {
  id: LayerId;
  label: string;
  /** vertical slot (0 = bottom). Multiplied by spacing to get explode offset. */
  slot: number;
  /** primary metric key to show in the HUD + drive emissive heat. */
  metricKey: 'temp' | 'util' | 'power' | 'throughput' | 'iops' | 'memUsed' | 'rpm';
  /** unit string for HUD display. */
  unit: string;
  /** display color tint for the layer (used in collapsed material + HUD pill). */
  tint: string;
  /** approximate height (Y) of the layer plate in 3D, in meters. */
  height: number;
  /** approximate width (X) of the layer plate, in meters. */
  width: number;
  /** approximate depth (Z) of the layer plate, in meters. */
  depth: number;
}

export const LAYERS: LayerConfig[] = [
  {
    id: 'chassis_shell',
    label: 'Chassis Shell',
    slot: 0,
    metricKey: 'temp',
    unit: '°C',
    tint: '#3a3f4a',
    height: 0.05,
    width: 1.4,
    depth: 1.0,
  },
  {
    id: 'psu_fans',
    label: 'PSU & Fans',
    slot: 1,
    metricKey: 'rpm',
    unit: 'rpm',
    tint: '#5a5f6a',
    height: 0.06,
    width: 1.35,
    depth: 0.95,
  },
  {
    id: 'motherboard',
    label: 'Motherboard',
    slot: 2,
    metricKey: 'temp',
    unit: '°C',
    tint: '#1d4536',
    height: 0.04,
    width: 1.32,
    depth: 0.92,
  },
  {
    id: 'cpu_sockets',
    label: 'CPU Sockets',
    slot: 3,
    metricKey: 'util',
    unit: '%',
    tint: '#4a4f5a',
    height: 0.06,
    width: 1.0,
    depth: 0.5,
  },
  {
    id: 'gpu_cards',
    label: 'GPU Cards',
    slot: 4,
    metricKey: 'temp',
    unit: '°C',
    tint: '#1a3a5a',
    height: 0.10,
    width: 1.25,
    depth: 0.45,
  },
  {
    id: 'ram_dimms',
    label: 'RAM DIMMs',
    slot: 5,
    metricKey: 'memUsed',
    unit: 'GB',
    tint: '#2a2a3a',
    height: 0.12,
    width: 0.8,
    depth: 0.18,
  },
  {
    id: 'storage',
    label: 'NVMe Storage',
    slot: 6,
    metricKey: 'iops',
    unit: 'IOPS',
    tint: '#3a2a4a',
    height: 0.06,
    width: 1.2,
    depth: 0.4,
  },
  {
    id: 'network_cards',
    label: 'Network Cards',
    slot: 7,
    metricKey: 'throughput',
    unit: 'Gb/s',
    tint: '#4a3a1a',
    height: 0.04,
    width: 0.9,
    depth: 0.35,
  },
];

/** Vertical spacing between layers in the exploded view, in meters. */
export const LAYER_SPACING = 0.32;

/** How far the server slides forward (out of the rack) before exploding, in meters. */
export const SLIDE_OUT_DISTANCE = 0.45;

/** Stagger between successive layer explode animations, in seconds. */
export const LAYER_STAGGER = 0.12;

/** Total explode tween duration per layer, in seconds. */
export const LAYER_DURATION = 0.7;

/** Camera dolly duration, in seconds. */
export const CAMERA_DURATION = 1.2;

/** Server slide-out duration, in seconds. */
export const SLIDE_DURATION = 0.6;

/** Convert seconds -> ms for react-spring. */
export const sec = (s: number) => s * 1000;
