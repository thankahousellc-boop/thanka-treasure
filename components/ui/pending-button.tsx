"use client";

import {
  useCallback,
  useTransition,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

import { Spinner } from "@/components/ui/spinner";

type PendingButtonProps = {
  className?: string;
  children: ReactNode;
  /**
   * Content shown beside the spinner while the handler is in flight. Omit to
   * keep `children`; pass `null` for icon-only buttons, where the spinner
   * should replace the icon rather than sit next to it.
   */
  pendingLabel?: ReactNode;
  disabled?: boolean;
  spinnerSize?: number;
  /** Sync or async work. Pending lasts until the handler and any router
   *  navigation it starts have both settled. */
  onClick: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "children" | "disabled" | "onClick"
>;

/**
 * Button for client-side async work — fetch, `router.push`, store mutations.
 *
 * The handler runs inside a transition, which is what makes this work for both
 * shapes of async: an awaited promise holds pending until it settles, and a
 * `router.push` holds pending until the destination actually renders (push
 * itself returns void, so awaiting it would resolve instantly and flash).
 *
 * A second click while pending is ignored, so slow requests can't double-fire.
 */
export function PendingButton({
  className = "",
  children,
  pendingLabel,
  disabled = false,
  spinnerSize = 14,
  onClick,
  type = "button",
  ...props
}: PendingButtonProps) {
  const [pending, startTransition] = useTransition();

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (pending) return;
      startTransition(async () => {
        await onClick(event);
      });
    },
    [onClick, pending],
  );

  return (
    <button
      {...props}
      type={type}
      onClick={handleClick}
      disabled={disabled || pending}
      aria-busy={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60 aria-busy:cursor-progress`}
    >
      {pending ? (
        <>
          <Spinner size={spinnerSize} />
          {pendingLabel === undefined ? children : pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
