"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Submit button for the per-message status forms. Preserves the existing
 * custom styling of the inline status pills while reflecting the parent
 * <form action={serverAction}>'s pending state — spinner + disabled — so the
 * user gets clear "request in progress" feedback without restyling.
 */
export function StatusSubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition hover:brightness-95 disabled:opacity-60"
      style={{
        backgroundColor: "var(--admin-surface)",
        color: "var(--admin-text-soft)",
        border: "1px solid var(--admin-border-strong)",
      }}
    >
      {pending ? (
        <svg
          className="animate-spin"
          width={14}
          height={14}
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
      ) : null}
      {children}
    </button>
  );
}
