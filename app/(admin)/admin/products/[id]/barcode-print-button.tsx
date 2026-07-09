"use client";

import { Button } from "@/components/admin/ui";

// Print isolation: same visibility trick the POS receipt uses. Only the node
// tagged .barcode-print-area (and its children) stays visible during print(),
// so the rest of the product detail page never reaches the printer.
export function BarcodePrintButton() {
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .barcode-print-area, .barcode-print-area * { visibility: visible !important; }
          .barcode-print-area {
            position: fixed !important;
            left: 0;
            top: 0;
          }
        }
      `}</style>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => window.print()}
      >
        Print label
      </Button>
    </>
  );
}
