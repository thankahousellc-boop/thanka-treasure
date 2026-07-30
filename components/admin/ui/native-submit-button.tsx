"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";
import { useNativeFormPending } from "@/components/ui/use-native-form-pending";

import { Button } from "./button";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type NativeSubmitButtonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  /** Label shown while the navigation is in flight. Defaults to "Loading…". */
  pendingLabel?: ReactNode;
  disabled?: boolean;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "children" | "type" | "disabled"
>;

/**
 * Admin counterpart to `SubmitButton`, for the filter bars that submit a plain
 * `<form>` with no server action (list pages read their filters from the URL
 * query). Those do a full browser navigation, which `useFormStatus` does not
 * report — so the pending window comes from the form's submit event instead.
 */
export function NativeSubmitButton({
  pendingLabel = "Loading…",
  disabled = false,
  children,
  ...props
}: NativeSubmitButtonProps) {
  const { ref, pending } = useNativeFormPending<HTMLButtonElement>();

  return (
    <Button
      {...props}
      ref={ref}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
    >
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
