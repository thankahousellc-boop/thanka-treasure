"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "./button";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type SubmitButtonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  /** Label shown while the parent form is submitting. Defaults to "Saving…". */
  pendingLabel?: ReactNode;
  /** Disable independently of pending state (e.g. invalid form). */
  disabled?: boolean;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "children" | "type" | "disabled"
>;

function Spinner() {
  return (
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
  );
}

/**
 * Submit button that automatically reflects the parent <form>'s pending state.
 * Must be rendered inside a <form action={serverAction}>. While the action is
 * in flight it disables itself and shows a spinner + pendingLabel — giving the
 * user clear "request in progress" feedback without per-form wiring.
 */
export function SubmitButton({
  pendingLabel = "Saving…",
  disabled = false,
  children,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
