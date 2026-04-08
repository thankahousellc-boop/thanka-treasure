"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { inventoryRepository } from "@/lib/repositories/inventory-repository";

const inventoryUpdateSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(1_000_000),
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

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

export async function updateVariantInventoryAction(formData: FormData) {
  await assertAdmin();

  const payload = inventoryUpdateSchema.safeParse({
    variantId: getString(formData, "variantId"),
    quantity: toWholeNumber(getString(formData, "quantity")),
    lowStockThreshold: toWholeNumber(getString(formData, "lowStockThreshold")),
  });

  if (!payload.success) {
    throw new Error("Invalid inventory update payload.");
  }

  const updated = await inventoryRepository.upsertVariantInventoryForAdmin({
    variantId: payload.data.variantId,
    quantity: payload.data.quantity,
    lowStockThreshold: payload.data.lowStockThreshold,
  });

  if (!updated) {
    throw new Error("Failed to update variant inventory.");
  }

  const productId = getString(formData, "productId");

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/inventory");

  if (productId) {
    revalidatePath(`/admin/products/${productId}`);
  }
}
