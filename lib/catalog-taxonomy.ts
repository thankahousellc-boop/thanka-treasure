import { unstable_cache } from "next/cache";
import { cache } from "react";

import { attributeRepository } from "@/lib/repositories/attribute-repository";
import { productRepository } from "@/lib/repositories/product-repository";

/**
 * Cached storefront catalog taxonomy (filter facets + product types).
 *
 * These power the /products filters and are otherwise re-queried on every
 * request — and because the listing page varies by search params, the
 * page-level ISR cache doesn't cover them. We wrap the reads in
 * `unstable_cache` (cross-request, tag-invalidated) plus React `cache`
 * (per-request dedup), mirroring the pattern in lib/site-settings.ts.
 *
 * Invalidate via `revalidateTag` from the relevant admin mutations:
 *  - product / attribute-value changes -> facets + product types
 *  - attribute-definition changes      -> facets
 */
export const TAXONOMY_FACETS_TAG = "taxonomy:facets";
export const TAXONOMY_PRODUCT_TYPES_TAG = "taxonomy:product-types";

const loadFacets = unstable_cache(
  async () => attributeRepository.listFacets(),
  ["catalog_facets"],
  { tags: [TAXONOMY_FACETS_TAG], revalidate: 3600 },
);

export const getCatalogFacets = cache(loadFacets);

const loadActiveProductTypes = unstable_cache(
  async () => productRepository.listActiveProductTypes(),
  ["catalog_product_types"],
  { tags: [TAXONOMY_PRODUCT_TYPES_TAG], revalidate: 3600 },
);

export const getActiveProductTypes = cache(loadActiveProductTypes);
