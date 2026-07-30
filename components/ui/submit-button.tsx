"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Spinner } from "@/components/ui/spinner";
import { useNativeFormPending } from "@/components/ui/use-native-form-pending";

const pendingClasses =
  "disabled:cursor-not-allowed disabled:opacity-60 aria-busy:cursor-progress";

type BaseProps = {
  className?: string;
  children: ReactNode;
  /**
   * Content shown beside the spinner while the request is in flight. Omit to
   * keep `children`; pass `null` for icon-only buttons, where the spinner
   * should replace the icon rather than sit next to it.
   */
  pendingLabel?: ReactNode;
  /** Disable independently of pending state (e.g. invalid form). */
  disabled?: boolean;
  /** Spinner size in px. Match to the button's text size. */
  spinnerSize?: number;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "children" | "type" | "disabled"
>;

function Content({
  pending,
  idleLabel,
  pendingLabel,
  spinnerSize,
}: {
  pending: boolean;
  idleLabel: ReactNode;
  pendingLabel: ReactNode;
  spinnerSize: number;
}) {
  if (!pending) return <>{idleLabel}</>;

  return (
    <>
      <Spinner size={spinnerSize} />
      {pendingLabel}
    </>
  );
}

/**
 * Submit button for forms driven by a server action (`<form action={fn}>`).
 * Reads the parent form's pending state, so it disables itself and swaps in a
 * spinner the moment the action starts — no per-form state wiring.
 *
 * Must be rendered inside the `<form>` it submits.
 */
export function SubmitButton({
  className = "",
  children,
  pendingLabel,
  disabled = false,
  spinnerSize = 14,
  ...props
}: BaseProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={`${className} ${pendingClasses}`}
    >
      <Content
        pending={pending}
        idleLabel={children}
        pendingLabel={pendingLabel === undefined ? children : pendingLabel}
        spinnerSize={spinnerSize}
      />
    </button>
  );
}

/**
 * Submit button for native forms that navigate the browser
 * (`<form method="get" action="/products">`), which `useFormStatus` cannot
 * see. See `useNativeFormPending` for how the pending window is derived.
 */
export function NativeSubmitButton({
  className = "",
  children,
  pendingLabel,
  disabled = false,
  spinnerSize = 14,
  ...props
}: BaseProps) {
  const { ref, pending } = useNativeFormPending<HTMLButtonElement>();

  return (
    <button
      {...props}
      ref={ref}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={`${className} ${pendingClasses}`}
    >
      <Content
        pending={pending}
        idleLabel={children}
        pendingLabel={pendingLabel === undefined ? children : pendingLabel}
        spinnerSize={spinnerSize}
      />
    </button>
  );
}
