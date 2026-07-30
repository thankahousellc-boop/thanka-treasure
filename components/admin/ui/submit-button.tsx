"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Spinner } from "@/components/ui/spinner";

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
