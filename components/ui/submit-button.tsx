"use client";

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";

import { Spinner } from "@/components/ui/spinner";

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
 * (`<form method="get" action="/products">`). `useFormStatus` only tracks
 * server actions, so pending is derived from the form's own submit event and
 * held until the navigation replaces the page.
 *
 * `pageshow` resets it because a bfcache restore reuses the old DOM, which
 * would otherwise leave the button stuck disabled after a browser Back.
 */
export function NativeSubmitButton({
  className = "",
  children,
  pendingLabel,
  disabled = false,
  spinnerSize = 14,
  ...props
}: BaseProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const form = buttonRef.current?.form;
    if (!form) return;

    const handleSubmit = () => setPending(true);
    const handlePageShow = () => setPending(false);

    form.addEventListener("submit", handleSubmit);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      form.removeEventListener("submit", handleSubmit);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return (
    <button
      {...props}
      ref={buttonRef}
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
