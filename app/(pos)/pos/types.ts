import type { PosLookupResult } from "@/lib/repositories/product-repository";

export type PaymentMethod = "cash" | "card" | "other";

// A product picked/scanned but not yet committed to the cart. The cashier can
// stack several of these, choose variants, then confirm them all at once.
export type StagedLine = {
  key: string;
  result: PosLookupResult;
  variantId: string | null;
  quantity: number;
};

export type CartLine = {
  variantId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  availableQuantity: number;
  imageUrl: string | null;
};

// Snapshot captured at the moment a sale is charged, so the receipt and
// success screen survive even after the working cart is cleared.
export type CompletedSale = {
  orderNumber: string;
  lines: CartLine[];
  subtotal: number;
  discountMinor: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  cashReceivedMinor: number | null;
  changeDueMinor: number | null;
  customerName: string | null;
  soldAt: string;
};
