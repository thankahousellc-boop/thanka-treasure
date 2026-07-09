"use client";

import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/admin/ui";

// Toolbar for the label print page: a back link and a manual print button.
// Also fires the print dialog automatically once, after a short delay so the
// barcode SVGs have painted. Hidden on the printed page itself.
export function PrintControls({ autoPrint }: { autoPrint: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, [autoPrint]);

  return (
    <div className="print-hidden flex items-center gap-2">
      <ButtonLink href="/admin/products" variant="secondary" size="md">
        Back to products
      </ButtonLink>
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={() => window.print()}
      >
        Print
      </Button>
    </div>
  );
}
