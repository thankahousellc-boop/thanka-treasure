"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type ProductStatusButtonProps = {
  formAction: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  pendingLabel?: ReactNode;
};

/**
 * Secondary header status toggle (Move to draft / Publish) inside the product
 * edit <form>. Uses useFormStatus() so the whole header reflects the in-flight
 * submit: while pending it disables and shows a pendingLabel — matching the
 * SubmitButton feedback pattern while keeping the bespoke header styling.
 */
export function ProductStatusButton({
  formAction,
  children,
  pendingLabel = "Saving…",
}: ProductStatusButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      formAction={formAction}
      formNoValidate
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        backgroundColor: "var(--admin-surface)",
        color: "var(--admin-text)",
        border: "1px solid var(--admin-border-strong)",
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
