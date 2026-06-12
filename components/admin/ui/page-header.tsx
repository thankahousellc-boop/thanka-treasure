import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
};

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p
            className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--admin-saffron)" }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          className="text-[18px] font-semibold leading-tight"
          style={{ color: "var(--admin-text)" }}
        >
          {title}
        </h1>
        {description ? (
          <p
            className="mt-0.5 max-w-2xl text-[12.5px]"
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
