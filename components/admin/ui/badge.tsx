import type { CSSProperties, ReactNode } from "react";

type Tone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

// Each tone derives its surface/ring from a single semantic token via
// color-mix, so badges adapt automatically to light and dark themes.
function toneStyle(tone: Tone): CSSProperties {
  if (tone === "neutral" || tone === "muted") {
    return {
      background: "var(--admin-surface-2)",
      color:
        tone === "muted" ? "var(--admin-text-mute)" : "var(--admin-text-soft)",
      boxShadow: "inset 0 0 0 1px var(--admin-border)",
    };
  }
  const token =
    tone === "success"
      ? "var(--admin-success)"
      : tone === "warning"
        ? "var(--admin-warning)"
        : tone === "danger"
          ? "var(--admin-danger)"
          : "var(--admin-info)";
  return {
    background: `color-mix(in srgb, ${token} 16%, var(--admin-surface))`,
    color: token,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${token} 32%, transparent)`,
  };
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider ${className}`}
      style={toneStyle(tone)}
    >
      {children}
    </span>
  );
}
