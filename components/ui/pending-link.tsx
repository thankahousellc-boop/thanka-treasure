"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";

/**
 * Renders inside the <Link>, which is what `useLinkStatus` requires — the hook
 * reads the pending state of its nearest Link ancestor.
 *
 * The slot keeps its size whether or not the spinner is mounted, so the label
 * beside it never jumps when a navigation starts (the docs call out inline
 * indicators as a common source of layout shift).
 */
function LinkSpinner({ size }: { size: number }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span
        aria-hidden="true"
        className="inline-grid shrink-0 place-items-center"
        style={{ width: size, height: size }}
      >
        {pending ? <Spinner size={size} /> : null}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {pending ? "Loading…" : ""}
      </span>
    </>
  );
}

type PendingLinkProps = {
  spinnerSize?: number;
  children: ReactNode;
} & ComponentProps<typeof Link>;

/**
 * Link that shows a spinner while the route it points at is loading.
 *
 * For navigations only — a Link keeps middle-click, open-in-new-tab, and
 * prefetch, which a button with `router.push` throws away. If the destination
 * is already prefetched the transition is instant and the spinner never
 * appears, which is the intended behaviour.
 */
export function PendingLink({
  spinnerSize = 14,
  className = "",
  children,
  ...props
}: PendingLinkProps) {
  return (
    <Link {...props} className={className}>
      {children}
      <LinkSpinner size={spinnerSize} />
    </Link>
  );
}
