import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "./card";

type Trend = {
  value: number;
  label?: string;
  direction?: "up" | "down";
};

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: Trend;
  href?: string;
  icon?: ReactNode;
};

export function StatCard({ label, value, hint, trend, href, icon }: StatCardProps) {
  const inner = (
    <Card className={href ? "transition hover:-translate-y-0.5" : ""}>
      <div className="px-5 py-5">
        <div className="flex items-start justify-between">
          <p
            className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--admin-text-mute)" }}
          >
            {label}
          </p>
          {icon ? (
            <div style={{ color: "var(--admin-text-mute)" }}>{icon}</div>
          ) : null}
        </div>
        <p
          className="admin-display mt-3 text-3xl font-medium"
          style={{ color: "var(--admin-text)" }}
        >
          {value}
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          {trend ? (
            <span
              className="font-medium"
              style={{
                color:
                  trend.direction === "down" ? "#b3261e" : "#1f7a3f",
              }}
            >
              {trend.direction === "down" ? "▼" : "▲"} {trend.value}%
            </span>
          ) : null}
          {hint ? (
            <span style={{ color: "var(--admin-text-mute)" }}>{hint}</span>
          ) : null}
        </div>
      </div>
    </Card>
  );

  return href ? (
    <Link href={href} className="block focus:outline-none">
      {inner}
    </Link>
  ) : (
    inner
  );
}
