import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-xl px-6 py-10 text-center"
      style={{
        background: "var(--admin-surface-2)",
        border: "1px dashed var(--admin-border-strong)",
      }}
    >
      {icon ? (
        <div style={{ color: "var(--admin-text-mute)" }}>{icon}</div>
      ) : null}
      <p
        className="text-sm font-medium"
        style={{ color: "var(--admin-text)" }}
      >
        {title}
      </p>
      {description ? (
        <p
          className="max-w-sm text-xs"
          style={{ color: "var(--admin-text-mute)" }}
        >
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
