"use client";

import { encodeCode128B } from "@/lib/barcode/code128";

type BarcodeProps = {
  value: string;
  height?: number;
  moduleWidth?: number;
};

export function Barcode({ value, height = 56, moduleWidth = 2 }: BarcodeProps) {
  let pattern: string;
  try {
    pattern = encodeCode128B(value);
  } catch {
    // Unencodable value should never reach here (SKUs are ASCII), but never
    // crash the whole print sheet over one bad label.
    return (
      <span className="text-xs" style={{ color: "#b91c1c" }}>
        Invalid barcode
      </span>
    );
  }

  const bars: { x: number; width: number }[] = [];
  let x = 0;
  for (let i = 0; i < pattern.length; i += 1) {
    const width = Number(pattern[i]) * moduleWidth;
    if (i % 2 === 0) {
      // Even index is a bar; odd index is a space.
      bars.push({ x, width });
    }
    x += width;
  }
  const totalWidth = x;

  return (
    <svg
      width={totalWidth}
      height={height}
      viewBox={`0 0 ${totalWidth} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Barcode ${value}`}
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
    >
      <rect x={0} y={0} width={totalWidth} height={height} fill="#ffffff" />
      {bars.map((bar, index) => (
        <rect
          key={index}
          x={bar.x}
          y={0}
          width={bar.width}
          height={height}
          fill="#000000"
        />
      ))}
    </svg>
  );
}
