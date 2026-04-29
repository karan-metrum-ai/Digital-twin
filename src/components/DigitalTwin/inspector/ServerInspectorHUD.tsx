/**
 * ServerInspectorHUD — fixed right-side panel shown while the inspector is
 * focused on a server. Header with hostname + rack/slot, then 8 rows
 * (one per layer) with name, current value, sparkline, health pill.
 *
 * Bottom: Collapse button → triggers the collapse stage in sceneStore.
 *
 * Lives outside the Canvas (DOM overlay), so it can use plain React inline
 * styles — matches the rest of this codebase. No Tailwind dependency.
 */

import { useSceneStore } from './sceneStore';
import { useMetricsStore, healthColor } from './metricsStore';
import type { Health } from './metricsStore';
import { LAYERS } from './layers';
import { Sparkline } from './Sparkline';

const PANEL_WIDTH = 380;

export function ServerInspectorHUD() {
  const stage = useSceneStore((s) => s.stage);
  const focus = useSceneStore((s) => s.focus);
  const collapse = useSceneStore((s) => s.collapse);
  const metrics = useMetricsStore((s) =>
    focus ? s.servers[focus.serverId] ?? null : null
  );

  // Show as soon as we begin focusing, hide on overview. Slide in via CSS.
  const visible = stage.kind !== 'overview';
  const interactive = stage.kind === 'exploded' || stage.kind === 'focused';

  if (!focus) return null;

  const device = focus.device;
  const rack = focus.rack;

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: visible ? 20 : -PANEL_WIDTH - 40,
        width: PANEL_WIDTH,
        maxHeight: 'calc(100vh - 40px)',
        background: 'linear-gradient(180deg, rgba(13, 15, 22, 0.96) 0%, rgba(10, 11, 16, 0.94) 100%)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        color: '#e5e7eb',
        fontFamily: "'Inter', -apple-system, sans-serif",
        boxShadow: '0 18px 48px rgba(0, 0, 0, 0.6), 0 0 1px rgba(0, 170, 255, 0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'right 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s',
        opacity: visible ? 1 : 0,
        pointerEvents: interactive ? 'auto' : 'none',
        zIndex: 50,
      }}
    >
      <Header device={device} rack={rack} />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {LAYERS.map((layer) => {
          const m = metrics?.[layer.id];
          return (
            <LayerRow
              key={layer.id}
              name={layer.label}
              unit={layer.unit}
              value={m?.value}
              history={m?.history ?? []}
              health={m?.health ?? 'ok'}
            />
          );
        })}
      </div>

      <Footer onCollapse={collapse} disabled={!interactive} />
    </div>
  );
}

function Header({
  device,
  rack,
}: {
  device: { hostname: string; rack_position: string; status: string; manufacturer?: string; model?: string; ip_address: string };
  rack: { rack_name: string; row_name: string };
}) {
  const powerColor =
    device.status === 'online' ? '#10b981' : device.status === 'degraded' ? '#f59e0b' : '#6b7280';
  return (
    <div
      style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(0, 170, 255, 0.06) 0%, transparent 100%)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.45)',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        Server Inspector
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          color: '#fff',
          lineHeight: 1.2,
          marginBottom: 6,
        }}
      >
        {device.hostname}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11 }}>
        <Chip>{rack.rack_name}</Chip>
        <Chip>{rack.row_name}</Chip>
        <Chip>{device.rack_position}</Chip>
        <Chip dot={powerColor}>{device.status}</Chip>
      </div>
      {(device.manufacturer || device.model) && (
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            marginTop: 8,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {[device.manufacturer, device.model].filter(Boolean).join(' · ')}
        </div>
      )}
      <div
        style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.4)',
          marginTop: 2,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {device.ip_address}
      </div>
    </div>
  );
}

function Chip({ children, dot }: { children: React.ReactNode; dot?: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 4,
        color: 'rgba(255,255,255,0.7)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dot,
            boxShadow: `0 0 6px ${dot}`,
          }}
        />
      )}
      {children}
    </span>
  );
}

function LayerRow({
  name,
  unit,
  value,
  history,
  health,
}: {
  name: string;
  unit: string;
  value: number | undefined;
  history: number[];
  health: Health;
}) {
  const color = healthColor(health);
  const display =
    value === undefined
      ? '—'
      : unit === 'IOPS'
        ? Math.round(value).toLocaleString()
        : value >= 100
          ? Math.round(value).toString()
          : value.toFixed(1);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.06em',
            color: 'rgba(255,255,255,0.55)',
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            color: '#fff',
            lineHeight: 1.1,
          }}
        >
          {display}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginLeft: 4 }}>
            {unit}
          </span>
        </div>
      </div>
      <Sparkline data={history} color={color} width={110} height={26} />
      <span
        title={health}
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
          flexShrink: 0,
        }}
      />
    </div>
  );
}

function Footer({ onCollapse, disabled }: { onCollapse: () => void; disabled: boolean }) {
  return (
    <div
      style={{
        padding: 12,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.25)',
      }}
    >
      <button
        type="button"
        onClick={onCollapse}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid rgba(0, 170, 255, 0.4)',
          background: disabled
            ? 'rgba(255,255,255,0.04)'
            : 'linear-gradient(180deg, rgba(0, 170, 255, 0.18) 0%, rgba(0, 170, 255, 0.08) 100%)',
          color: disabled ? 'rgba(255,255,255,0.35)' : '#bfe9ff',
          fontFamily: "'Inter', -apple-system, sans-serif",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: disabled ? 'default' : 'pointer',
          transition: 'background 0.15s, transform 0.1s',
        }}
        onMouseDown={(e) => {
          if (!disabled) e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        Collapse & Return
      </button>
    </div>
  );
}
