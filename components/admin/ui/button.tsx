import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

function variantStyle(variant: Variant): CSSProperties {
  switch (variant) {
    case "primary":
      return {
        backgroundColor: "var(--admin-accent)",
        color: "#ffffff",
      };
    case "secondary":
      return {
        backgroundColor: "var(--admin-surface)",
        color: "var(--admin-text)",
        border: "1px solid var(--admin-border-strong)",
      };
    case "ghost":
      return {
        backgroundColor: "transparent",
        color: "var(--admin-text-soft)",
      };
    case "danger":
      return {
        backgroundColor: "#b3261e",
        color: "#ffffff",
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
      className={`${baseClasses} ${sizeClasses[size]} hover:brightness-110 ${className}`}
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
      className={`${baseClasses} ${sizeClasses[size]} hover:brightness-110 ${className}`}
      style={variantStyle(variant)}
    >
      {children}
    </Link>
  );
}
