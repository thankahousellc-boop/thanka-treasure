type Point = { date: string; revenue: number };

type RevenueSparkProps = {
  points: Point[];
  width?: number;
  height?: number;
};

export function RevenueSpark({
  points,
  width = 600,
  height = 140,
}: RevenueSparkProps) {
  if (points.length === 0) {
    return (
      <div
        className="grid h-35 place-items-center text-xs"
        style={{ color: "var(--admin-text-mute)" }}
      >
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
      style={{ color: "var(--admin-accent)" }}
    >
      <defs>
        <linearGradient id="revenue-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={pathArea} fill="url(#revenue-spark-fill)" />
      <path
        d={pathLine}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
