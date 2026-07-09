"use client";

import { Icon } from "@/components/admin/ui";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: "var(--admin-surface)",
          border: "1px solid var(--admin-border)",
          boxShadow: "var(--admin-shadow-lg)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          className="text-xl font-semibold"
          style={{ color: "var(--admin-text)" }}
        >
          {title}
        </h2>
        {message ? (
          <p className="mt-2 text-base" style={{ color: "var(--admin-text-soft)" }}>
            {message}
          </p>
        ) : null}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-xl text-base font-semibold transition hover:bg-(--admin-accent-soft)"
            style={{
              color: "var(--admin-text)",
              border: "1px solid var(--admin-border-strong)",
            }}
          >
            <Icon.Close width={20} height={20} />
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-xl text-base font-semibold text-white transition hover:brightness-110"
            style={{
              background: danger ? "var(--admin-danger)" : "var(--admin-accent)",
              color: "var(--admin-on-accent)",
            }}
          >
            <Icon.Check width={20} height={20} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
