import { useMemo } from 'react';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showGradient?: boolean;
}

export function SparklineChart({
  data,
  width = 120,
  height = 40,
  color,
  showGradient = true,
}: SparklineChartProps) {
  const pathData = useMemo(() => {
    if (data.length < 2) return { path: '', area: '', lineColor: '#4e7cff' };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;

    const effectiveWidth = width - padding * 2;
    const effectiveHeight = height - padding * 2;

    const points = data.map((val, i) => ({
      x: padding + (i / (data.length - 1)) * effectiveWidth,
      y: padding + effectiveHeight - ((val - min) / range) * effectiveHeight,
    }));

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const lastPoint = points[points.length - 1];
    const area =
      path +
      ` L ${lastPoint.x} ${height} L ${points[0].x} ${height} Z`;

    const isUp = data[data.length - 1] >= data[0];
    const lineColor = color ?? (isUp ? '#22c55e' : '#ef4444');

    return { path, area, lineColor };
  }, [data, width, height, color]);

  if (data.length < 2) {
    return (
      <svg width={width} height={height}>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#2a2d3e"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      </svg>
    );
  }

  const gradientId = `sparkline-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={pathData.lineColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={pathData.lineColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      {showGradient && (
        <path d={pathData.area} fill={`url(#${gradientId})`} />
      )}
      <path
        d={pathData.path}
        fill="none"
        stroke={pathData.lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
