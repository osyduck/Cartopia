// Tiny inline SVG sparkline. Pure presentational — renders on the server.
export function Sparkline({
  values,
  width = 96,
  height = 24,
  color = "var(--color-primary)",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length < 2) {
    return <span className="text-xs text-muted">—</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
