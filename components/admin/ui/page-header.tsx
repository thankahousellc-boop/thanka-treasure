import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
};

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p
            className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--admin-saffron)" }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          className="admin-display text-[28px] font-medium leading-tight md:text-[32px]"
          style={{ color: "var(--admin-text)" }}
        >
          {title}
        </h1>
        {description ? (
          <p
            className="mt-1.5 max-w-2xl text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}
