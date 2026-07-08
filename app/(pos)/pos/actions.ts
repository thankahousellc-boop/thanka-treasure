"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { orderRepository } from "@/lib/repositories/order-repository";
import {
  type PosLookupResult,
  productRepository,
} from "@/lib/repositories/product-repository";

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

export type PosCartLineInput = {
  variantId: string;
  quantity: number;
};

export type CompletePosSaleInput = {
  items: PosCartLineInput[];
  paymentMethod: "cash" | "card" | "other";
  customerEmail?: string;
  customerName?: string;
  // Manual discount in major currency units (e.g. 5 = $5.00 off).
  discount?: number;
};

export type CompletePosSaleResult =
  | { ok: true; orderNumber: string; grandTotal: number }
  | { ok: false; error: string };

export async function lookupPosProductAction(
  code: string,
): Promise<PosLookupResult | null> {
  await assertAdmin();
  return productRepository.lookupForPos(code);
}

export async function searchPosProductsAction(
  query: string,
): Promise<PosLookupResult[]> {
  await assertAdmin();
  return productRepository.listForPos({ query, limit: 40 });
}

export async function completePosSaleAction(
  input: CompletePosSaleInput,
): Promise<CompletePosSaleResult> {
  await assertAdmin();

  const lines = input.items.filter(
    (line) => line.variantId && line.quantity > 0,
  );
  if (lines.length === 0) {
    return { ok: false, error: "Cart is empty." };
  }

  // Resolve prices + titles server-side — never trust client-sent amounts.
  const variantIds = [...new Set(lines.map((line) => line.variantId))];
  const variants =
    await productRepository.listCheckoutVariantsByIds(variantIds);
  const variantById = new Map(variants.map((row) => [row.variantId, row]));

  const items = [];
  for (const line of lines) {
    const variant = variantById.get(line.variantId);
    if (!variant) {
      return { ok: false, error: "A product in the cart no longer exists." };
    }
    items.push({
      variantId: variant.variantId,
      productTitle: variant.productTitle,
      variantTitle: variant.variantTitle,
      sku: variant.sku,
      quantity: Math.floor(line.quantity),
      unitPrice: variant.price,
    });
  }

  const discountTotal =
    typeof input.discount === "number" && Number.isFinite(input.discount)
      ? Math.max(0, Math.round(input.discount * 100))
      : 0;

  try {
    const order = await orderRepository.createInStoreOrder({
      items,
      paymentMethod: input.paymentMethod,
      discountTotal,
      customer: input.customerEmail
        ? {
            email: input.customerEmail,
            firstName: input.customerName ?? null,
          }
        : null,
    });

    revalidatePath("/admin/products/inventory");
    revalidatePath("/admin/orders");

    return {
      ok: true,
      orderNumber: order.orderNumber,
      grandTotal: order.grandTotal,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to complete the sale.",
    };
  }
}
