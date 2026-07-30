type SpinnerProps = {
  /** Rendered width/height in px. Defaults to 14 to sit beside 13px button text. */
  size?: number;
  className?: string;
};

/**
 * Inline "work in progress" indicator. Inherits `currentColor` so it adapts to
 * whatever button variant renders it — no per-theme wiring needed.
 */
export function Spinner({ size = 14, className = "" }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin shrink-0 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.4"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
