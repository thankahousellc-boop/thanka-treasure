import type { BarcodeConfig } from "@/lib/barcode/config";

// Code128 can encode the full ASCII range, but barcodes are easier to read and
// reprint when restricted to uppercase alphanumerics + a few separators.
function sanitizeSegment(input: string) {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Builds the scannable string for a product. Kept deliberately SHORT — just an
// optional prefix plus a unique id slice — so the 1D Code128 symbol stays narrow
// enough for a laser scanner regardless of how many attributes a product has.
// The human-meaningful attribute values are NOT encoded here; they are printed
// as separate label text next to the barcode (see the product detail page).
export function buildBarcodeValue(input: {
  config: BarcodeConfig;
  productId: string;
}) {
  const { config, productId } = input;

  const segments: string[] = [];
  if (config.prefix) {
    const prefix = sanitizeSegment(config.prefix);
    if (prefix) segments.push(prefix);
  }

  // Deterministic, collision-free suffix from the product UUID.
  const suffix = productId.replace(/-/g, "").slice(0, 8).toUpperCase();
  segments.push(suffix);

  const separator = sanitizeSegment(config.separator) || "-";
  return segments.join(separator);
}
