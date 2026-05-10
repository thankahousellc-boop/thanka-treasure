type Point = { date: string; revenue: number };

type RevenueSparkProps = {
  points: Point[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
};

export function RevenueSpark({
  points,
  width = 600,
  height = 140,
  strokeColor = "#5c1f2a",
  fillColor = "rgba(92, 31, 42, 0.08)",
}: RevenueSparkProps) {
  if (points.length === 0) {
    return (
      <div className="grid h-[140px] place-items-center text-xs text-zinc-400">
        No paid orders in this window yet.
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.revenue), 1);
  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  const coords = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : index * stepX;
    const y = height - (point.revenue / max) * (height - 14) - 4;
    return [x, y] as const;
  });

  const pathLine = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");

  const pathArea =
    `${pathLine} L ${coords[coords.length - 1][0].toFixed(2)} ${height} L ${coords[0][0].toFixed(2)} ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="Revenue trend"
      className="block"
    >
      <path d={pathArea} fill={fillColor} />
      <path
        d={pathLine}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
