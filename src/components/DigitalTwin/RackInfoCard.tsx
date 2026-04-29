import { Check } from 'lucide-react';
import '../../styles/DigitalTwin/RackInfoCard.css';

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
  // New fields from updated API
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
}

interface RackInfoCardProps {
  deviceData: DeviceData | null;
  isSelected: boolean;
  onClose: () => void;
  onToggleSelection: (deviceId: string, selected: boolean) => void;
}

export default function RackInfoCard({ 
  deviceData, 
  isSelected,
  onClose,
  onToggleSelection 
}: RackInfoCardProps) {
  if (!deviceData) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#10b981';
      case 'degraded':
        return '#f59e0b';
      case 'offline':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getHealthStatusDisplay = (health?: string) => {
    switch (health) {
      case 'ok':
        return { text: 'HEALTHY', color: '#10b981' };
      case 'warning':
        return { text: 'WARNING', color: '#f59e0b' };
      case 'critical':
        return { text: 'CRITICAL', color: '#ef4444' };
      default:
        return { text: 'UNKNOWN', color: '#6b7280' };
    }
  };

  const healthDisplay = getHealthStatusDisplay(deviceData.health_status);

  return (
    <div className="rack-info-card device-info-card">
      <div className="card-header">
        <div className="header-title">
          <h2>{deviceData.hostname}</h2>
          <span className="device-type-badge">{deviceData.device_type}</span>
        </div>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      {/* Selection Control */}
      <div className="selection-control">
        <label className="selection-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onToggleSelection(deviceData.device_id, e.target.checked)}
          />
          <span className="checkbox-custom">
            {isSelected && <Check size={14} />}
          </span>
          <span className="checkbox-label">
            {isSelected ? 'Selected for Onboarding' : 'Select for Onboarding'}
          </span>
        </label>
      </div>

      <div className="card-content">
        {/* Status Section */}
        <div className="info-section">
          <div className="info-label">Status</div>
          <div className="info-value">
            <span 
              className="status-dot" 
              style={{ backgroundColor: getStatusColor(deviceData.status) }}
            ></span>
            {deviceData.status.toUpperCase()}
          </div>
        </div>

        {deviceData.health_status && (
          <div className="info-section">
            <div className="info-label">Health</div>
            <div className="info-value" style={{ color: healthDisplay.color }}>
              {healthDisplay.text}
            </div>
          </div>
        )}

        {/* Network Information */}
        <div className="info-section">
          <div className="info-label">IP Address</div>
          <div className="info-value mono">{deviceData.ip_address}</div>
        </div>

        {/* Hardware Information */}
        <div className="info-section">
          <div className="info-label">Manufacturer</div>
          <div className="info-value">{deviceData.manufacturer}</div>
        </div>

        <div className="info-section">
          <div className="info-label">Model</div>
          <div className="info-value">{deviceData.model}</div>
        </div>

        {deviceData.firmware_version && deviceData.firmware_version !== 'Unknown' && (
          <div className="info-section">
            <div className="info-label">Firmware</div>
            <div className="info-value">{deviceData.firmware_version}</div>
          </div>
        )}

        {/* Location Information */}
        {deviceData.location && deviceData.location !== 'Unknown' && (
          <div className="info-section">
            <div className="info-label">Location</div>
            <div className="info-value">{deviceData.location}</div>
          </div>
        )}

        <div className="info-section">
          <div className="info-label">Rack Position</div>
          <div className="info-value">{deviceData.rack_position}</div>
        </div>

        {/* Performance Metrics */}
        {deviceData.power_consumption !== undefined && deviceData.power_consumption > 0 && (
          <div className="info-section">
            <div className="info-label">Power Draw</div>
            <div className="info-value">{deviceData.power_consumption.toFixed(1)}W</div>
          </div>
        )}

        {deviceData.temperature !== undefined && deviceData.temperature > 0 && (
          <div className="info-section">
            <div className="info-label">Temperature</div>
            <div className="info-value">{deviceData.temperature.toFixed(1)}°C</div>
          </div>
        )}

        {/* Management Information */}
        {deviceData.management_interface && (
          <div className="info-section">
            <div className="info-label">Management</div>
            <div className="info-value">{deviceData.management_interface}</div>
          </div>
        )}

        {deviceData.protocols_found && deviceData.protocols_found.length > 0 && (
          <div className="info-section">
            <div className="info-label">Protocols</div>
            <div className="info-value">
              {deviceData.protocols_found.join(', ').toUpperCase()}
            </div>
          </div>
        )}

        {deviceData.ports_count !== undefined && deviceData.ports_count > 0 && (
          <div className="info-section">
            <div className="info-label">Ports</div>
            <div className="info-value">{deviceData.ports_count}</div>
          </div>
        )}

        {/* BMC Information */}
        {deviceData.bmc_ip && (
          <div className="info-section">
            <div className="info-label">BMC IP</div>
            <div className="info-value mono">{deviceData.bmc_ip}</div>
          </div>
        )}

        {deviceData.bmc_type && (
          <div className="info-section">
            <div className="info-label">BMC Type</div>
            <div className="info-value">{deviceData.bmc_type}</div>
          </div>
        )}

        {/* Accelerator Information */}
        {deviceData.accelerators && (
          <div className="info-section">
            <div className="info-label">Accelerator</div>
            <div className="info-value">
              <span 
                className="accelerator-badge"
                style={{
                  backgroundColor: deviceData.accelerators === 'GPU' 
                    ? 'rgba(16, 185, 129, 0.2)' 
                    : deviceData.accelerators === 'AI Accelerator'
                    ? 'rgba(139, 92, 246, 0.2)'
                    : 'rgba(107, 114, 128, 0.2)',
                  color: deviceData.accelerators === 'GPU'
                    ? '#10b981'
                    : deviceData.accelerators === 'AI Accelerator'
                    ? '#8b5cf6'
                    : '#9ca3af',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                {deviceData.accelerators}
              </span>
            </div>
          </div>
        )}

        {deviceData.gpu_count !== undefined && deviceData.gpu_count > 0 && (
          <div className="info-section">
            <div className="info-label">GPU Count</div>
            <div className="info-value">{deviceData.gpu_count}</div>
          </div>
        )}

        {/* Cluster & Tenant */}
        {deviceData.cluster_id && (
          <div className="info-section">
            <div className="info-label">Cluster</div>
            <div className="info-value">{deviceData.cluster_id}</div>
          </div>
        )}

        {deviceData.tenant && (
          <div className="info-section">
            <div className="info-label">Tenant</div>
            <div className="info-value">{deviceData.tenant}</div>
          </div>
        )}

        {/* Asset Information */}
        {deviceData.serial && (
          <div className="info-section">
            <div className="info-label">Serial</div>
            <div className="info-value mono">{deviceData.serial}</div>
          </div>
        )}

        {deviceData.asset_tag && (
          <div className="info-section">
            <div className="info-label">Asset Tag</div>
            <div className="info-value">{deviceData.asset_tag}</div>
          </div>
        )}

        {/* Tags */}
        {deviceData.tags && deviceData.tags.length > 0 && (
          <div className="info-section">
            <div className="info-label">Tags</div>
            <div className="info-value" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {deviceData.tags.map((tag, index) => (
                <span 
                  key={index}
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    padding: '1px 6px',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

