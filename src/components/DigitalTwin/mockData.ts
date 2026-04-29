/**
 * Mock data generator — produces realistic Rack3D + Device3D fixtures
 * for the data center visualization.
 */

import type { Rack3D, Device3D } from './types';

const MANUFACTURERS = ['Dell EMC', 'HPE', 'Supermicro', 'Lenovo', 'Cisco'];
const MODELS = [
  'PowerEdge R750',
  'PowerEdge R650',
  'ProLiant DL380 Gen11',
  'SuperServer 6029P',
  'ThinkSystem SR650',
  'UCS C240 M6',
];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateDevices(rackId: string, rackSeed: number): Device3D[] {
  const rand = rng(rackSeed);
  const devices: Device3D[] = [];
  const U_HEIGHT = 20;

  let u = 1;
  let idx = 0;
  while (u <= U_HEIGHT) {
    const heightU = rand() < 0.15 ? 2 : 1; // ~15% are 2U
    if (u + heightU - 1 > U_HEIGHT) break;

    // Skip a U occasionally to add visual variety (gaps in the rack)
    if (rand() < 0.08) {
      u += 1;
      continue;
    }

    const healthRoll = rand();
    const health: Device3D['health_status'] =
      healthRoll < 0.04
        ? 'critical'
        : healthRoll < 0.12
          ? 'warning'
          : 'ok';
    const status: Device3D['status'] =
      health === 'critical' ? 'degraded' : 'online';

    devices.push({
      device_id: `${rackId}-D${idx + 1}`,
      hostname: `${rackId.toLowerCase()}-srv-${String(idx + 1).padStart(2, '0')}`,
      ip_address: `10.0.${rackSeed % 250}.${(idx * 3 + 10) % 250}`,
      device_type: rand() < 0.85 ? 'Server' : 'Switch',
      status,
      temperature: 22 + rand() * 18,
      power_consumption: 200 + rand() * 600,
      rack_position: `U${u}`,
      u_position: u,
      height_u: heightU,
      health_status: health,
      manufacturer: MANUFACTURERS[Math.floor(rand() * MANUFACTURERS.length)],
      model: MODELS[Math.floor(rand() * MODELS.length)],
      firmware_version: `2.${Math.floor(rand() * 9)}.${Math.floor(rand() * 99)}`,
      service_tag: `SVC${Math.floor(rand() * 999999)
        .toString()
        .padStart(6, '0')}`,
      serial: `SN${Math.floor(rand() * 999999999)
        .toString()
        .padStart(9, '0')}`,
      bmc_ip: `10.1.${rackSeed % 250}.${(idx * 3 + 10) % 250}`,
      bmc_type: 'iDRAC9',
      ports_count: 4 + Math.floor(rand() * 4),
      protocols_found: ['SSH', 'IPMI', 'Redfish'],
    });

    u += heightU;
    idx += 1;
  }

  return devices;
}

export function generateRacks(): Rack3D[] {
  const racks: Rack3D[] = [];
  const RACK_SPACING = 1.0;
  const ROW_COUNT = 14;

  // Row A — facing the corridor (+Z direction), along the -Z wall
  for (let i = 0; i < ROW_COUNT; i++) {
    const x = -7.5 + i * RACK_SPACING;
    const rackId = `A${i + 1}`;
    racks.push({
      rack_id: rackId,
      rack_name: `Rack ${rackId}`,
      row_name: 'Row A',
      position: [x, -0.25, -3.8],
      rotation: [0, 0, 0],
      u_height: 20,
      rack_color: '#00aaff',
      devices: generateDevices(rackId, (i + 1) * 17),
    });
  }

  // Row B — facing the corridor (-Z direction), along the +Z wall
  for (let i = 0; i < ROW_COUNT; i++) {
    const x = -7.5 + i * RACK_SPACING;
    const rackId = `B${i + 1}`;
    racks.push({
      rack_id: rackId,
      rack_name: `Rack ${rackId}`,
      row_name: 'Row B',
      position: [x, -0.25, 3.8],
      rotation: [0, Math.PI, 0],
      u_height: 20,
      rack_color: '#ff8800',
      devices: generateDevices(rackId, (i + ROW_COUNT + 1) * 17),
    });
  }

  return racks;
}
