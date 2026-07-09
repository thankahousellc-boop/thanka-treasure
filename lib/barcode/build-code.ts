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

// Builds the scannable string for a product. The configured attribute values
// (in order) form the human-meaningful part; a short slice of the product id is
// appended so the code is always unique even when two products share attributes.
export function buildBarcodeValue(input: {
  config: BarcodeConfig;
  productId: string;
  // attribute_definitions.key → that product's value(s).
  valuesByKey: Record<string, string[]>;
}) {
  const { config, productId, valuesByKey } = input;

  const segments: string[] = [];
  if (config.prefix) {
    const prefix = sanitizeSegment(config.prefix);
    if (prefix) segments.push(prefix);
  }

  for (const key of config.attributeKeys) {
    const values = valuesByKey[key];
    if (!values || values.length === 0) continue;
    const segment = sanitizeSegment(values.join("-"));
    if (segment) segments.push(segment);
  }

  // Deterministic, collision-free suffix from the product UUID.
  const suffix = productId.replace(/-/g, "").slice(0, 8).toUpperCase();
  segments.push(suffix);

  const separator = sanitizeSegment(config.separator) || "-";
  return segments.join(separator);
}
