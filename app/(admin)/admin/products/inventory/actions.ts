"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { monitor } from "@/lib/monitoring/logger";
import { inventoryRepository } from "@/lib/repositories/inventory-repository";

export type InventoryUpdateResult =
  | { ok: true; quantity: number; lowStockThreshold: number }
  | { ok: false; error: string };

export type InventoryItemResult = {
  variantId: string;
  quantity: number;
  lowStockThreshold: number;
};

export type InventoryBatchResult =
  | { ok: true; items: InventoryItemResult[] }
  | { ok: false; error: string };

const inventoryUpdateSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(1_000_000),
});

const inventoryBatchSchema = z.object({
  productId: z.string().uuid(),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(0).max(1_000_000),
        lowStockThreshold: z.number().int().min(0).max(1_000_000),
      }),
    )
    .min(1)
    .max(100),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function toWholeNumber(raw: string) {
  if (!raw) {
    return 0;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.floor(parsed));
}

export async function updateVariantInventoryAction(
  formData: FormData,
): Promise<InventoryUpdateResult> {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    return { ok: false, error: "You are not authorized to edit inventory." };
  }

  const payload = inventoryUpdateSchema.safeParse({
    variantId: getString(formData, "variantId"),
    quantity: toWholeNumber(getString(formData, "quantity")),
    lowStockThreshold: toWholeNumber(getString(formData, "lowStockThreshold")),
  });

  if (!payload.success) {
    return { ok: false, error: "On hand and threshold must be whole numbers ≥ 0." };
  }

  try {
    const updated = await inventoryRepository.upsertVariantInventoryForAdmin({
      variantId: payload.data.variantId,
      quantity: payload.data.quantity,
      lowStockThreshold: payload.data.lowStockThreshold,
    });

    if (!updated) {
      return { ok: false, error: "Variant not found — refresh and try again." };
    }
  } catch (error) {
    monitor.error("Failed to update variant inventory", error, {
      variantId: payload.data.variantId,
    });
    return { ok: false, error: "Something went wrong saving. Please retry." };
  }

  const productId = getString(formData, "productId");

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/inventory");

  if (productId) {
    revalidatePath(`/admin/products/${productId}`);
  }

  return {
    ok: true,
    quantity: payload.data.quantity,
    lowStockThreshold: payload.data.lowStockThreshold,
  };
}

export async function updateProductInventoryAction(input: {
  productId: string;
  items: InventoryItemResult[];
}): Promise<InventoryBatchResult> {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    return { ok: false, error: "You are not authorized to edit inventory." };
  }

  const payload = inventoryBatchSchema.safeParse(input);
  if (!payload.success) {
    return { ok: false, error: "On hand and threshold must be whole numbers ≥ 0." };
  }

  try {
    for (const item of payload.data.items) {
      const updated = await inventoryRepository.upsertVariantInventoryForAdmin({
        variantId: item.variantId,
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
      });

      if (!updated) {
        return { ok: false, error: "A variant was not found — refresh and try again." };
      }
    }
  } catch (error) {
    monitor.error("Failed to batch-update product inventory", error, {
      productId: payload.data.productId,
    });
    return { ok: false, error: "Something went wrong saving. Please retry." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/inventory");
  revalidatePath(`/admin/products/${payload.data.productId}`);

  return { ok: true, items: payload.data.items };
}
