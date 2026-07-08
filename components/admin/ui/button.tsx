import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const sizeClasses: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-3.5 text-[13px]",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--admin-accent) focus-visible:ring-offset-(--admin-bg) disabled:cursor-not-allowed disabled:opacity-50";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

// Filled variants brighten on hover; secondary/ghost change background via
// className (inline bg would override a Tailwind hover:bg rule). Ghost also
// keeps its text color in className so the hover text shift can apply.
const variantClasses: Record<Variant, string> = {
  primary: "hover:brightness-110",
  danger: "hover:brightness-110",
  secondary: "bg-(--admin-surface) hover:bg-(--admin-surface-2)",
  ghost:
    "bg-transparent text-(--admin-text-soft) hover:bg-(--admin-accent-soft) hover:text-(--admin-text)",
};

function variantStyle(variant: Variant): CSSProperties {
  switch (variant) {
    case "primary":
      return {
        backgroundColor: "var(--admin-accent)",
        color: "var(--admin-on-accent)",
      };
    case "secondary":
      return {
        color: "var(--admin-text)",
        border: "1px solid var(--admin-border-strong)",
      };
    case "ghost":
      return {};
    case "danger":
      return {
        backgroundColor: "var(--admin-danger)",
        color: "var(--admin-on-accent)",
      };
  }
}

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      style={variantStyle(variant)}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = CommonProps & {
  href: string;
  prefetch?: boolean;
  target?: string;
  rel?: string;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  children,
  href,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      {...props}
      href={href}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      style={variantStyle(variant)}
    >
      {children}
    </Link>
  );
}
