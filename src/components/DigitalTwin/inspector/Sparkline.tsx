/**
 * Sparkline — tiny SVG polyline driven by a number[] history buffer.
 * No deps. Auto-fits the y range to [min, max] of the data with a small pad.
 */

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
}

export function Sparkline({
  data,
  width = 120,
  height = 28,
  color = '#3b82f6',
  fillOpacity = 0.18,
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={color}
          strokeOpacity={0.3}
          strokeWidth={1}
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const stepX = (width - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const norm = (v - min) / range;
    const y = height - pad - norm * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const areaPoints = `${pad},${height - pad} ${points.join(' ')} ${(width - pad).toFixed(1)},${height - pad}`;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polygon points={areaPoints} fill={color} fillOpacity={fillOpacity} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
