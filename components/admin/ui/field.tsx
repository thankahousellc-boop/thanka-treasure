import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const inputBase =
  "w-full rounded-md px-3 text-sm placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-0";

const inputStyle = {
  backgroundColor: "var(--admin-surface)",
  borderWidth: "1px",
  borderStyle: "solid" as const,
  borderColor: "var(--admin-border-strong)",
  color: "var(--admin-text)",
};

type FieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function Field({ label, hint, error, children, className = "" }: FieldProps) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span
        className="text-[12.5px] font-medium"
        style={{ color: "var(--admin-text-soft)" }}
      >
        {label}
      </span>
      {children}
      {hint && !error ? (
        <span
          className="block text-[11px]"
          style={{ color: "var(--admin-text-mute)" }}
        >
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="block text-[11px]" style={{ color: "#b3261e" }}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", style, ...rest } = props;
  return (
    <input
      {...rest}
      className={`${inputBase} h-10 ${className}`}
      style={{ ...inputStyle, ...style }}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", style, rows = 3, ...rest } = props;
  return (
    <textarea
      {...rest}
      rows={rows}
      className={`${inputBase} py-2 ${className}`}
      style={{ ...inputStyle, ...style }}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", style, children, ...rest } = props;
  return (
    <select
      {...rest}
      className={`${inputBase} h-10 ${className}`}
      style={{ ...inputStyle, ...style }}
    >
      {children}
    </select>
  );
}
