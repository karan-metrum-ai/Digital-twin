/**
 * Shared types for Data Center Digital Twin components
 */

export interface Device3D {
  device_id: string;
  hostname: string;
  ip_address: string;
  device_type: string;
  status: 'online' | 'offline' | 'degraded';
  temperature?: number;
  power_consumption?: number;
  rack_position: string;
  u_position: number;
  height_u?: number;
  health_status?: 'ok' | 'warning' | 'critical' | 'unknown';
  manufacturer?: string;
  model?: string;
  firmware_version?: string;
  management_interface?: string;
  protocols_found?: string[];
  ports_count?: number;
  bmc_ip?: string;
  bmc_type?: string;
  bmc_username?: string;
  accelerators?: string;
  gpu_count?: number;
  cluster_id?: string;
  tenant?: string;
  tags?: string[];
  serial?: string;
  asset_tag?: string;
  service_tag?: string;
}

export interface Rack3D {
  rack_id: string;
  rack_name: string;
  row_name: string;
  devices: Device3D[];
  position: [number, number, number];
  rotation?: [number, number, number];
  u_height?: number;
  rack_color?: string;
}

export interface DeviceData {
  device_id: string;
  hostname: string;
  ip_address: string;
  device_type: string;
  status: 'online' | 'offline' | 'degraded';
  manufacturer: string;
  model: string;
  firmware_version?: string;
  location?: string;
  rack_position: string;
  power_consumption?: number;
  temperature?: number;
  health_status?: 'ok' | 'warning' | 'critical' | 'unknown';
  management_interface?: string;
  protocols_found?: string[];
  ports_count?: number;
  bmc_ip?: string;
  bmc_type?: string;
  bmc_username?: string;
  accelerators?: string;
  gpu_count?: number;
  cluster_id?: string;
  tenant?: string;
  tags?: string[];
  serial?: string;
  asset_tag?: string;
  service_tag?: string;
}
