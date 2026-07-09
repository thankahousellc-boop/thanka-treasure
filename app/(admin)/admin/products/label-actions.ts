"use server";

import { z } from "zod";

import { productRepository } from "@/lib/repositories/product-repository";

const inputSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1).max(500),
});

export type ProductLabel = {
  variantId: string;
  productTitle: string;
  vendor: string | null;
  option1: string | null;
  price: number;
  sku: string;
};

export async function getProductLabels(input: {
  productIds: string[];
}): Promise<ProductLabel[]> {
  const { productIds } = inputSchema.parse(input);

  const rows = await productRepository.labelsForProducts(productIds);

  return rows.map((row) => ({
    variantId: row.variantId,
    productTitle: row.productTitle,
    vendor: row.vendor,
    option1: row.option1,
    price: row.price,
    sku: row.sku,
  }));
}
