"use client";

import { Button, Icon } from "@/components/admin/ui";

// Opens the bulk barcode print page for the selected products in a new tab, so
// the products list keeps its selection. The print page renders every label and
// auto-fires the print dialog.
export function BulkBarcodeButton({ productIds }: { productIds: string[] }) {
  const count = productIds.length;

  function handleOpen() {
    if (count === 0) return;
    const url = `/admin/products/labels?ids=${encodeURIComponent(productIds.join(","))}`;
    window.open(url, "_blank", "noopener");
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      onClick={handleOpen}
      disabled={count === 0}
    >
      <Icon.Tag />
      <span>Print barcodes{count > 0 ? ` (${count})` : ""}</span>
    </Button>
  );
}
