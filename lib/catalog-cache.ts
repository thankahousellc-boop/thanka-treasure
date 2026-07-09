import { unstable_cache } from "next/cache";
import { cache } from "react";

import { frameRepository } from "@/lib/repositories/frame-repository";
import { productRepository } from "@/lib/repositories/product-repository";

/**
 * Cross-request cache for storefront catalog reads that page-level ISR does not
 * already cover well: the home page's featured strip, a product page's related
 * strip, and a product's brocade frames. All are read on every render and are
 * pure functions of product data, so we wrap them in `unstable_cache`
 * (tag-invalidated) + React `cache` (per-request dedup), mirroring
 * lib/catalog-taxonomy.ts.
 *
 * Every product mutation calls `revalidateTag(CATALOG_PRODUCTS_TAG)` (see
 * app/(admin)/admin/products/actions.ts), so edits publish immediately.
 */
export const CATALOG_PRODUCTS_TAG = "catalog:products";

const loadFeaturedProducts = unstable_cache(
  async (limit: number) => productRepository.findFeatured(limit),
  ["catalog_featured_products"],
  { tags: [CATALOG_PRODUCTS_TAG], revalidate: 1800 },
);

export const getFeaturedProducts = cache((limit = 6) =>
  loadFeaturedProducts(limit),
);

const loadRelatedProducts = unstable_cache(
  async (productType: string | undefined, limit: number) => {
    const result = await productRepository.search({ productType, limit });
    return result.rows;
  },
  ["catalog_related_products"],
  { tags: [CATALOG_PRODUCTS_TAG], revalidate: 1800 },
);

export const getRelatedProducts = cache(
  (productType: string | undefined, limit = 6) =>
    loadRelatedProducts(productType, limit),
);

const loadProductFrames = unstable_cache(
  async (productId: string) => frameRepository.listForProductPublic(productId),
  ["catalog_product_frames"],
  { tags: [CATALOG_PRODUCTS_TAG], revalidate: 1800 },
);

export const getProductFrames = cache((productId: string) =>
  loadProductFrames(productId),
);
