"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setBarcodeConfig } from "@/lib/barcode/config";
import { auth } from "@/lib/auth";
import { productRepository } from "@/lib/repositories/product-repository";

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveBarcodeConfigAction(formData: FormData) {
  await assertAdmin();

  const attributeKeys = formData
    .getAll("attributeKeys")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);

  const prefix = getString(formData, "prefix");
  const separator = getString(formData, "separator") || "-";

  await setBarcodeConfig({ attributeKeys, prefix, separator });

  // Existing products must pick up the new format.
  await productRepository.regenerateAllBarcodesForAdmin();

  revalidatePath("/admin/settings/barcode");
  revalidatePath("/admin/products");
  redirect("/admin/settings/barcode?status=saved");
}
