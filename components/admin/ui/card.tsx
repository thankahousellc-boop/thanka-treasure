import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        background: "var(--admin-surface)",
        border: "1px solid var(--admin-border)",
        boxShadow: "var(--admin-shadow)",
      }}
    >
      {children}
    </div>
  );
}

type CardHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function CardHeader({
  title,
  description,
  action,
  className = "",
}: CardHeaderProps) {
  return (
    <div
      className={`flex items-start justify-between gap-4 px-5 py-4 ${className}`}
      style={{ borderBottom: "1px solid var(--admin-border)" }}
    >
      <div className="min-w-0">
        <h3
          className="text-[13.5px] font-semibold"
          style={{ color: "var(--admin-text)" }}
        >
          {title}
        </h3>
        {description ? (
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--admin-text-mute)" }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-5 py-5 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-5 py-3 text-xs ${className}`}
      style={{
        background: "var(--admin-surface-2)",
        borderTop: "1px solid var(--admin-border)",
        color: "var(--admin-text-soft)",
      }}
    >
      {children}
    </div>
  );
}
