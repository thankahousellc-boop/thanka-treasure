import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "./card";

type Trend = {
  value: number;
  label?: string;
  direction?: "up" | "down";
};

type Tone = "default" | "accent" | "danger" | "success";

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: Trend;
  href?: string;
  icon?: ReactNode;
  tone?: Tone;
};

function toneColor(tone: Tone): string {
  switch (tone) {
    case "accent":
      return "var(--admin-accent)";
    case "danger":
      return "var(--admin-danger)";
    case "success":
      return "var(--admin-success)";
    default:
      return "var(--admin-text-mute)";
  }
}

export function StatCard({
  label,
  value,
  hint,
  trend,
  href,
  icon,
  tone = "default",
}: StatCardProps) {
  const accent = toneColor(tone);
  const chipBg =
    tone === "default"
      ? "var(--admin-surface-2)"
      : `color-mix(in srgb, ${accent} 14%, var(--admin-surface))`;

  const inner = (
    <Card
      className={
        href
          ? "h-full transition hover:-translate-y-0.5 hover:shadow-(--admin-shadow-lg) group-focus-visible:-translate-y-0.5 group-focus-visible:shadow-(--admin-shadow-lg)"
          : "h-full"
      }
    >
      <div className="px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <p
            className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--admin-text-mute)" }}
          >
            {label}
          </p>
          {icon ? (
            <div
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
              style={{ background: chipBg, color: accent }}
            >
              {icon}
            </div>
          ) : null}
        </div>
        <p
          className="admin-display mt-3 text-3xl font-medium tabular-nums"
          style={{
            color: tone === "default" ? "var(--admin-text)" : accent,
          }}
        >
          {value}
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          {trend ? (
            <span
              className="font-medium tabular-nums"
              style={{
                color:
                  trend.direction === "down"
                    ? "var(--admin-danger)"
                    : "var(--admin-success)",
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
    <Link
      href={href}
      className="group block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--admin-bg)"
    >
      {inner}
    </Link>
  ) : (
    inner
  );
}
