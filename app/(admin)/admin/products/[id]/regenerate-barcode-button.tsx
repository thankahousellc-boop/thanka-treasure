"use client";

import { useActionState } from "react";

import { Button } from "@/components/admin/ui";

import type { RegenerateBarcodeState } from "../actions";

type RegenerateBarcodeButtonProps = {
  // Server action already bound to the product id.
  action: (
    prevState: RegenerateBarcodeState,
    formData: FormData,
  ) => Promise<RegenerateBarcodeState>;
};

// Inline feedback: spinner label while the action runs, then a persistent
// "✓ regenerated" note next to the button. Because the regenerated barcode is
// deterministic (same value every time), this note is the only visible proof
// the click did anything.
export function RegenerateBarcodeButton({
  action,
}: RegenerateBarcodeButtonProps) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  });

  return (
    <form action={formAction} className="flex items-center gap-2">
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Regenerating…" : "Regenerate"}
      </Button>
      {!pending && state.status === "success" ? (
        <span className="text-xs" style={{ color: "var(--admin-accent)" }}>
          ✓ {state.message}
        </span>
      ) : null}
      {!pending && state.status === "error" ? (
        <span className="text-xs" style={{ color: "var(--admin-danger)" }}>
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
