export function Sparkline({
  values,
  width = 120,
  height = 32,
  color = "#ff5c35",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!values.length) {
    return (
      <span className="text-xs text-text-muted">geen tijdreeks</span>
    );
  }
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const points = values
    .map(
      (v, i) =>
        `${(i * step).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`
    )
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
