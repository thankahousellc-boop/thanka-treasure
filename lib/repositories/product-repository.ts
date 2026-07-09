import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { getDb } from "@/db";
import {
  attributeDefinitions,
  categories,
  collectionProducts,
  inventory,
  productAttributeValues,
  productImages,
  products,
  productVariants,
} from "@/db/schema";
import { buildBarcodeValue } from "@/lib/barcode/build-code";
import { getBarcodeConfig } from "@/lib/barcode/config";
import { attributeRepository } from "@/lib/repositories/attribute-repository";
import { requireAdminSession } from "@/lib/repositories/authz";
import { resolveUrl } from "@/lib/storage/resolve-url";

export type PosLookupResult = {
  productId: string;
  productTitle: string;
  barcode: string | null;
  imageUrl: string | null;
  variants: {
    variantId: string;
    title: string;
    sku: string | null;
    price: number;
    availableQuantity: number;
  }[];
};

type ProductSearchInput = {
  query?: string;
  productType?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "oldest" | "title" | "price_asc" | "price_desc";
  limit?: number;
  page?: number;
  // Dynamic attribute facets: definition key → selected values (OR within a
  // key, AND across keys).
  attributes?: Record<string, string[]>;
};

type ProductBaseRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
};

type ProductImageRef = {
  bucket: string;
  path: string;
};

type CheckoutVariantRow = {
  variantId: string;
  productId: string;
  productTitle: string;
  productStatus: string;
  productDeletedAt: Date | null;
  variantTitle: string;
  sku: string | null;
  price: number;
};

export type ProductPreview = ProductBaseRow & {
  price: number | null;
  primaryImage: ProductImageRef | null;
  secondaryImage: ProductImageRef | null;
};

export type ProductFullTextMatch = ProductPreview & {
  rank: number;
};

type ProductListingResult = {
  rows: ProductPreview[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type AdminProductStatus = "draft" | "active" | "archived";

type AdminProductVariantUpsertInput = {
  id?: string;
  title: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  quantity: number;
  lowStockThreshold: number;
};

type AdminProductImageUpsertInput = {
  bucket: string;
  path: string;
  altText: string | null;
  variantId: string | null;
};

type AdminProductUpsertInput = {
  title: string;
  slug: string;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  status: AdminProductStatus;
  productType: string | null;
  categoryId: string | null;
  vendor: string | null;
  tags: string[];
  variants: AdminProductVariantUpsertInput[];
  attributes: { definitionId: string; values: string[] }[];
};

function clampPage(input: number | undefined) {
  if (!Number.isFinite(input)) {
    return 1;
  }

  return Math.max(1, Math.floor(input ?? 1));
}

function clampLimit(input: number | undefined) {
  if (!Number.isFinite(input)) {
    return 24;
  }

  return Math.min(48, Math.max(1, Math.floor(input ?? 24)));
}

async function enrichProductPreviews(
  baseRows: ProductBaseRow[],
): Promise<ProductPreview[]> {
  if (baseRows.length === 0) {
    return [];
  }

  const db = getDb();
  const productIds = baseRows.map((row) => row.id);

  const minPriceRows = await db
    .select({
      productId: productVariants.productId,
      minPrice: sql<number>`min(${productVariants.price})`,
    })
    .from(productVariants)
    .where(inArray(productVariants.productId, productIds))
    .groupBy(productVariants.productId);

  const imageRows = await db
    .select({
      productId: productImages.productId,
      bucket: productImages.bucket,
      path: productImages.path,
      position: productImages.position,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(asc(productImages.productId), asc(productImages.position));

  const minPriceByProductId = new Map(
    minPriceRows.map((row) => [row.productId, Number(row.minPrice)]),
  );

  const imagesByProductId = new Map<string, ProductImageRef[]>();

  for (const row of imageRows) {
    const images = imagesByProductId.get(row.productId) ?? [];
    if (images.length < 2) {
      images.push({ bucket: row.bucket, path: row.path });
      imagesByProductId.set(row.productId, images);
    }
  }

  return baseRows.map((row) => {
    const images = imagesByProductId.get(row.id) ?? [];

    return {
      ...row,
      price: minPriceByProductId.get(row.id) ?? null,
      primaryImage: images[0] ?? null,
      secondaryImage: images[1] ?? null,
    };
  });
}

function createEmptyListing(input: Pick<ProductSearchInput, "page" | "limit">) {
  const pageSize = clampLimit(input.limit);
  const page = clampPage(input.page);

  return {
    rows: [] as ProductPreview[],
    total: 0,
    page,
    pageSize,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: page > 1,
  } satisfies ProductListingResult;
}

async function searchActiveProducts(
  input: ProductSearchInput & {
    scopeCondition?: SQL<unknown>;
    typeCondition?: SQL<unknown>;
  } = {},
): Promise<ProductListingResult> {
  const db = getDb();
  const query = input.query?.trim();
  const productType = input.productType?.trim();
  const limit = clampLimit(input.limit);
  const page = clampPage(input.page);
  const minPrice =
    typeof input.minPrice === "number" && Number.isFinite(input.minPrice)
      ? Math.max(0, Math.floor(input.minPrice))
      : undefined;
  const maxPrice =
    typeof input.maxPrice === "number" && Number.isFinite(input.maxPrice)
      ? Math.max(0, Math.floor(input.maxPrice))
      : undefined;
  const offset = (page - 1) * limit;

  const productDocument = sql`
    setweight(to_tsvector('english', coalesce(${products.title}, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(${products.description}, '')), 'B')
  `;

  const priceInRangeCondition =
    minPrice !== undefined || maxPrice !== undefined
      ? sql`
          exists (
            select 1
            from ${productVariants}
            where ${productVariants.productId} = ${products.id}
            ${minPrice !== undefined ? sql`and ${productVariants.price} >= ${minPrice}` : sql``}
            ${maxPrice !== undefined ? sql`and ${productVariants.price} <= ${maxPrice}` : sql``}
          )
        `
      : undefined;

  const typeCondition =
    input.typeCondition ??
    (productType ? eq(products.productType, productType) : undefined);

  // One EXISTS subquery per selected attribute key — a product must match at
  // least one value within each key (OR within a key, AND across keys).
  const attributeConditions: SQL<unknown>[] = [];
  for (const [rawKey, rawValues] of Object.entries(input.attributes ?? {})) {
    const key = rawKey.trim();
    const values = rawValues
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (!key || values.length === 0) {
      continue;
    }
    attributeConditions.push(sql`
      exists (
        select 1
        from ${productAttributeValues} av
        inner join ${attributeDefinitions} ad on ad.id = av.definition_id
        where av.product_id = ${products.id}
          and ad.key = ${key}
          and av.value in (${sql.join(
            values.map((value) => sql`${value}`),
            sql`, `,
          )})
      )
    `);
  }

  const where = and(
    eq(products.status, "active"),
    isNull(products.deletedAt),
    input.scopeCondition,
    query
      ? or(
          ilike(products.title, `%${query}%`),
          ilike(products.description, `%${query}%`),
          sql`${productDocument} @@ websearch_to_tsquery('english', ${query})`,
        )
      : undefined,
    typeCondition,
    priceInRangeCondition,
    ...attributeConditions,
  );

  const minPriceOrderExpr = sql<number>`
    coalesce(
      (
        select min(${productVariants.price})
        from ${productVariants}
        where ${productVariants.productId} = ${products.id}
      ),
      2147483647
    )
  `;

  const orderByExpr =
    input.sort === "oldest"
      ? asc(products.createdAt)
      : input.sort === "price_asc"
        ? asc(minPriceOrderExpr)
        : input.sort === "price_desc"
          ? desc(minPriceOrderExpr)
          : input.sort === "title"
            ? asc(products.title)
            : desc(products.createdAt);

  const baseRows = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      description: products.description,
    })
    .from(products)
    .where(where)
    .orderBy(orderByExpr, desc(products.createdAt))
    .offset(offset)
    .limit(limit);

  const rows = await enrichProductPreviews(baseRows);

  const [countRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(products)
    .where(where);

  const total = Number(countRow?.total ?? 0);

  return {
    rows,
    total,
    page,
    pageSize: limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasNextPage: page * limit < total,
    hasPreviousPage: page > 1,
  };
}

// Short, random, human-typable barcode value. Kept intentionally tiny so the
// printed Code128 stays narrow — the barcode is a lookup key, not a description.
function randomSkuSuffix(): string {
  return crypto.randomUUID().replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
}

// Generate and persist a unique SKU for a variant that has none, so the barcode
// value is stable across reprints. Retries on the (rare) collision against the
// unique index.
async function assignSku(
  db: ReturnType<typeof getDb>,
  variantId: string,
): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = `TT-${randomSkuSuffix()}`;
    const [existing] = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.sku, candidate))
      .limit(1);
    if (existing) continue;

    await db
      .update(productVariants)
      .set({ sku: candidate, updatedAt: new Date() })
      .where(eq(productVariants.id, variantId));
    return candidate;
  }
  throw new Error("Failed to generate a unique SKU after several attempts.");
}

export const productRepository = {
  async findFeatured(limit = 6) {
    const db = getDb();

    const baseRows = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        description: products.description,
      })
      .from(products)
      .where(and(eq(products.status, "active"), isNull(products.deletedAt)))
      .orderBy(desc(products.createdAt))
      .limit(limit);

    return enrichProductPreviews(baseRows);
  },

  async findBySlug(slug: string) {
    const db = getDb();

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), isNull(products.deletedAt)))
      .limit(1);

    if (!product) {
      return null;
    }

    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, product.id));

    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.position));

    const attributes = await attributeRepository.listValuesForProduct(
      product.id,
      { storefrontOnly: true },
    );

    const category = product.categoryId
      ? ((
          await db
            .select({
              id: categories.id,
              name: categories.name,
              slug: categories.slug,
            })
            .from(categories)
            .where(eq(categories.id, product.categoryId))
            .limit(1)
        )[0] ?? null)
      : null;

    return { product, variants, images, attributes, category };
  },

  async listCheckoutVariantsByIds(variantIds: string[]) {
    if (variantIds.length === 0) {
      return [] as CheckoutVariantRow[];
    }

    const db = getDb();

    return db
      .select({
        variantId: productVariants.id,
        productId: products.id,
        productTitle: products.title,
        productStatus: products.status,
        productDeletedAt: products.deletedAt,
        variantTitle: productVariants.title,
        sku: productVariants.sku,
        price: productVariants.price,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(inArray(productVariants.id, variantIds));
  },

  async listActiveSlugs(limit = 200) {
    const db = getDb();

    const rows = await db
      .select({ slug: products.slug })
      .from(products)
      .where(and(eq(products.status, "active"), isNull(products.deletedAt)))
      .orderBy(desc(products.updatedAt), desc(products.createdAt))
      .limit(limit);

    return rows.map((row) => row.slug);
  },

  async listActiveSitemapEntries(limit = 5000) {
    const db = getDb();

    return db
      .select({
        slug: products.slug,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(and(eq(products.status, "active"), isNull(products.deletedAt)))
      .orderBy(desc(products.updatedAt), desc(products.createdAt))
      .limit(limit);
  },

  async search(input: ProductSearchInput = {}) {
    return searchActiveProducts(input);
  },

  async findByCollection(
    input: ProductSearchInput & {
      collectionId: string;
    },
  ) {
    const { collectionId: rawCollectionId, ...searchInput } = input;
    const collectionId = rawCollectionId.trim();

    if (!collectionId) {
      return createEmptyListing(searchInput);
    }

    return searchActiveProducts({
      ...searchInput,
      scopeCondition: sql`
        exists (
          select 1
          from ${collectionProducts}
          where ${collectionProducts.collectionId} = ${collectionId}
            and ${collectionProducts.productId} = ${products.id}
        )
      `,
    });
  },

  async findByCategory(
    input: ProductSearchInput & {
      categorySlug: string;
      categoryName?: string;
    },
  ) {
    const {
      categorySlug: rawCategorySlug,
      categoryName: rawCategoryName,
      ...searchInput
    } = input;
    const categorySlug = rawCategorySlug.trim();
    const categoryName = rawCategoryName?.trim();
    const slugAsName = categorySlug.replace(/-/g, " ").trim();

    if (!categorySlug && !categoryName) {
      return createEmptyListing(searchInput);
    }

    return searchActiveProducts({
      ...searchInput,
      typeCondition: or(
        // Real category relation — the canonical link.
        categorySlug || categoryName
          ? sql`
              exists (
                select 1
                from ${categories} c
                where c.id = ${products.categoryId}
                  and (
                    ${categorySlug ? sql`c.slug = ${categorySlug}` : sql`false`}
                    or ${categoryName ? sql`lower(c.name) = lower(${categoryName})` : sql`false`}
                  )
              )
            `
          : undefined,
        // Legacy fallbacks for products not yet linked via category_id.
        categorySlug ? eq(products.productType, categorySlug) : undefined,
        categoryName ? eq(products.productType, categoryName) : undefined,
        slugAsName ? ilike(products.productType, `%${slugAsName}%`) : undefined,
        categorySlug
          ? sql`${products.tags} @> ARRAY[${categorySlug}]::text[]`
          : undefined,
        categoryName
          ? sql`${products.tags} @> ARRAY[${categoryName}]::text[]`
          : undefined,
      ),
    });
  },

  async listActiveProductTypes() {
    const db = getDb();

    const rows = await db
      .selectDistinct({ productType: products.productType })
      .from(products)
      .where(
        and(
          eq(products.status, "active"),
          isNull(products.deletedAt),
          isNotNull(products.productType),
        ),
      )
      .orderBy(asc(products.productType));

    return rows
      .map((row) => row.productType)
      .filter((value): value is string => Boolean(value));
  },

  async searchFullText(input: { query: string; limit?: number }) {
    const db = getDb();
    const query = input.query.trim();

    if (!query) {
      return [] as ProductFullTextMatch[];
    }

    const limit = Math.min(Math.max(Math.floor(input.limit ?? 8), 1), 20);
    const productDocument = sql`
      setweight(to_tsvector('english', coalesce(${products.title}, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(${products.description}, '')), 'B')
    `;
    const queryExpr = sql`websearch_to_tsquery('english', ${query})`;
    const rankExpr = sql<number>`ts_rank_cd(${productDocument}, ${queryExpr})`;

    const rankedRows = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        description: products.description,
        rank: rankExpr,
      })
      .from(products)
      .where(
        and(
          eq(products.status, "active"),
          isNull(products.deletedAt),
          sql`${productDocument} @@ ${queryExpr}`,
        ),
      )
      .orderBy(desc(rankExpr), desc(products.createdAt))
      .limit(limit);

    if (rankedRows.length === 0) {
      return [] as ProductFullTextMatch[];
    }

    const rankByProductId = new Map(
      rankedRows.map((row) => [row.id, Number(row.rank)]),
    );

    const rows = await enrichProductPreviews(
      rankedRows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description,
      })),
    );

    return rows.map((row) => ({
      ...row,
      rank: rankByProductId.get(row.id) ?? 0,
    }));
  },

  async listForAdmin(
    options: { limit?: number; attributes?: Record<string, string[]> } = {},
  ) {
    await requireAdminSession();

    const db = getDb();
    const limit = options.limit ?? 30;

    // Same facet logic as the storefront search: one EXISTS per attribute key,
    // OR within a key's values, AND across keys. Admin spans every status.
    const attributeConditions: SQL<unknown>[] = [];
    for (const [rawKey, rawValues] of Object.entries(options.attributes ?? {})) {
      const key = rawKey.trim();
      const values = rawValues
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      if (!key || values.length === 0) {
        continue;
      }
      attributeConditions.push(sql`
        exists (
          select 1
          from ${productAttributeValues} av
          inner join ${attributeDefinitions} ad on ad.id = av.definition_id
          where av.product_id = ${products.id}
            and ad.key = ${key}
            and av.value in (${sql.join(
              values.map((value) => sql`${value}`),
              sql`, `,
            )})
        )
      `);
    }

    return db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        status: products.status,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        inventoryCount: sql<number>`coalesce(sum(coalesce(${inventory.quantity}, 0) - coalesce(${inventory.reservedQuantity}, 0)), 0)::int`,
      })
      .from(products)
      .leftJoin(productVariants, eq(productVariants.productId, products.id))
      .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
      .where(and(isNull(products.deletedAt), ...attributeConditions))
      .groupBy(products.id)
      .orderBy(desc(products.createdAt))
      .limit(limit);
  },

  // One row per variant for the selected products. Backfills a SKU for any
  // variant missing one so every printed label has a scannable barcode value.
  async labelsForProducts(productIds: string[]) {
    await requireAdminSession();

    if (productIds.length === 0) return [];

    const db = getDb();

    const rows = await db
      .select({
        productId: products.id,
        productTitle: products.title,
        vendor: products.vendor,
        variantId: productVariants.id,
        variantTitle: productVariants.title,
        sku: productVariants.sku,
        price: productVariants.price,
        option1: productVariants.option1,
        option2: productVariants.option2,
        option3: productVariants.option3,
      })
      .from(products)
      .innerJoin(productVariants, eq(productVariants.productId, products.id))
      .where(and(inArray(products.id, productIds), isNull(products.deletedAt)))
      .orderBy(asc(products.title), asc(productVariants.createdAt));

    const labels = [];
    for (const row of rows) {
      const sku = row.sku ?? (await assignSku(db, row.variantId));
      labels.push({ ...row, sku });
    }
    return labels;
  },

  async findByIdForAdmin(id: string) {
    await requireAdminSession();

    const db = getDb();

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      return null;
    }

    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, product.id))
      .orderBy(asc(productVariants.createdAt));

    const [primaryVariant] = variants;

    const inventoryRows =
      variants.length > 0
        ? await db
            .select()
            .from(inventory)
            .where(
              inArray(
                inventory.variantId,
                variants.map((variant) => variant.id),
              ),
            )
        : [];

    const inventoryByVariantId = new Map(
      inventoryRows.map((row) => [row.variantId, row]),
    );

    const currentInventory = primaryVariant
      ? (inventoryByVariantId.get(primaryVariant.id) ?? null)
      : null;

    const variantsWithInventory = variants.map((variant) => ({
      ...variant,
      inventory: inventoryByVariantId.get(variant.id) ?? null,
    }));

    const images = await db
      .select({
        id: productImages.id,
        productId: productImages.productId,
        variantId: productImages.variantId,
        bucket: productImages.bucket,
        path: productImages.path,
        altText: productImages.altText,
        position: productImages.position,
        createdAt: productImages.createdAt,
        updatedAt: productImages.updatedAt,
      })
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position), asc(productImages.createdAt));

    const attributes = await attributeRepository.listValuesForProduct(id);

    return {
      product,
      primaryVariant: primaryVariant ?? null,
      inventory: currentInventory,
      variants: variantsWithInventory,
      images,
      attributes,
    };
  },

  async addImageForAdmin(
    productId: string,
    input: AdminProductImageUpsertInput,
  ) {
    await requireAdminSession();

    const db = getDb();

    const [maxPositionRow] = await db
      .select({
        maxPosition: sql<number>`coalesce(max(${productImages.position}), 0)`,
      })
      .from(productImages)
      .where(eq(productImages.productId, productId));

    const nextPosition = Number(maxPositionRow?.maxPosition ?? 0) + 1;

    const [created] = await db
      .insert(productImages)
      .values({
        productId,
        variantId: input.variantId,
        bucket: input.bucket,
        path: input.path,
        altText: input.altText,
        position: nextPosition,
        updatedAt: new Date(),
      })
      .returning({ id: productImages.id });

    return created ?? null;
  },

  async updateImageForAdmin(
    productId: string,
    imageId: string,
    input: {
      altText: string | null;
      variantId: string | null;
    },
  ) {
    await requireAdminSession();

    const db = getDb();

    const [updated] = await db
      .update(productImages)
      .set({
        altText: input.altText,
        variantId: input.variantId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(productImages.id, imageId),
          eq(productImages.productId, productId),
        ),
      )
      .returning({ id: productImages.id });

    return updated ?? null;
  },

  async moveImageForAdmin(
    productId: string,
    imageId: string,
    direction: "up" | "down",
  ) {
    await requireAdminSession();

    const db = getDb();

    return db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          id: productImages.id,
          position: productImages.position,
        })
        .from(productImages)
        .where(
          and(
            eq(productImages.id, imageId),
            eq(productImages.productId, productId),
          ),
        )
        .limit(1);

      if (!current) {
        return false;
      }

      const [swapTarget] = await tx
        .select({
          id: productImages.id,
          position: productImages.position,
        })
        .from(productImages)
        .where(
          and(
            eq(productImages.productId, productId),
            direction === "up"
              ? sql`${productImages.position} < ${current.position}`
              : sql`${productImages.position} > ${current.position}`,
          ),
        )
        .orderBy(
          direction === "up"
            ? desc(productImages.position)
            : asc(productImages.position),
        )
        .limit(1);

      if (!swapTarget) {
        return true;
      }

      await tx
        .update(productImages)
        .set({ position: current.position, updatedAt: new Date() })
        .where(eq(productImages.id, swapTarget.id));

      await tx
        .update(productImages)
        .set({ position: swapTarget.position, updatedAt: new Date() })
        .where(eq(productImages.id, current.id));

      return true;
    });
  },

  async deleteImageForAdmin(productId: string, imageId: string) {
    await requireAdminSession();

    const db = getDb();

    const deletedRows = await db
      .delete(productImages)
      .where(
        and(
          eq(productImages.id, imageId),
          eq(productImages.productId, productId),
        ),
      )
      .returning({ id: productImages.id });

    return deletedRows.length > 0;
  },

  async createForAdmin(input: AdminProductUpsertInput) {
    await requireAdminSession();

    const db = getDb();

    if (input.variants.length === 0) {
      throw new Error("At least one product variant is required.");
    }

    return db.transaction(async (tx) => {
      const [createdProduct] = await tx
        .insert(products)
        .values({
          title: input.title,
          slug: input.slug,
          description: input.description,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          status: input.status,
          productType: input.productType,
          categoryId: input.categoryId,
          vendor: input.vendor,
          tags: input.tags,
          updatedAt: new Date(),
        })
        .returning({ id: products.id, slug: products.slug });

      if (!createdProduct) {
        throw new Error("Unable to create product.");
      }

      for (const variant of input.variants) {
        const [createdVariant] = await tx
          .insert(productVariants)
          .values({
            productId: createdProduct.id,
            title: variant.title,
            sku: variant.sku,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            option1: variant.option1,
            option2: variant.option2,
            option3: variant.option3,
            updatedAt: new Date(),
          })
          .returning({ id: productVariants.id });

        if (!createdVariant) {
          throw new Error("Unable to create product variant.");
        }

        await tx.insert(inventory).values({
          variantId: createdVariant.id,
          quantity: variant.quantity,
          lowStockThreshold: variant.lowStockThreshold,
          updatedAt: new Date(),
        });
      }

      await attributeRepository.setValuesForProduct(
        tx,
        createdProduct.id,
        input.attributes,
      );

      return createdProduct;
    });
  },

  async updateForAdmin(id: string, input: AdminProductUpsertInput) {
    await requireAdminSession();

    const db = getDb();

    if (input.variants.length === 0) {
      throw new Error("At least one product variant is required.");
    }

    return db.transaction(async (tx) => {
      const [updatedProduct] = await tx
        .update(products)
        .set({
          title: input.title,
          slug: input.slug,
          description: input.description,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          status: input.status,
          productType: input.productType,
          categoryId: input.categoryId,
          vendor: input.vendor,
          tags: input.tags,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning({ id: products.id, slug: products.slug });

      if (!updatedProduct) {
        return null;
      }

      const existingVariants = await tx
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(eq(productVariants.productId, id));

      const existingVariantIdSet = new Set(
        existingVariants.map((variant) => variant.id),
      );

      for (const variant of input.variants) {
        const shouldUpdateExisting =
          typeof variant.id === "string" &&
          existingVariantIdSet.has(variant.id);

        const variantId = shouldUpdateExisting
          ? await tx
              .update(productVariants)
              .set({
                title: variant.title,
                sku: variant.sku,
                price: variant.price,
                compareAtPrice: variant.compareAtPrice,
                option1: variant.option1,
                option2: variant.option2,
                option3: variant.option3,
                updatedAt: new Date(),
              })
              .where(eq(productVariants.id, variant.id!))
              .returning({ id: productVariants.id })
              .then((rows) => rows[0]?.id ?? null)
          : await tx
              .insert(productVariants)
              .values({
                productId: id,
                title: variant.title,
                sku: variant.sku,
                price: variant.price,
                compareAtPrice: variant.compareAtPrice,
                option1: variant.option1,
                option2: variant.option2,
                option3: variant.option3,
                updatedAt: new Date(),
              })
              .returning({ id: productVariants.id })
              .then((rows) => rows[0]?.id ?? null);

        if (!variantId) {
          throw new Error("Unable to upsert product variant.");
        }

        await tx
          .insert(inventory)
          .values({
            variantId,
            quantity: variant.quantity,
            lowStockThreshold: variant.lowStockThreshold,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: inventory.variantId,
            set: {
              quantity: variant.quantity,
              lowStockThreshold: variant.lowStockThreshold,
              updatedAt: new Date(),
            },
          });
      }

      // Delete variants that exist in the DB but were removed from the form.
      // FK behavior makes this safe: inventory cascades, productImages /
      // orderItems variantId are set null (order line-item snapshots stay intact).
      const submittedVariantIds = new Set(
        input.variants
          .filter(
            (variant) =>
              typeof variant.id === "string" &&
              existingVariantIdSet.has(variant.id),
          )
          .map((variant) => variant.id as string),
      );
      const variantIdsToDelete = existingVariants
        .map((variant) => variant.id)
        .filter((variantId) => !submittedVariantIds.has(variantId));
      if (variantIdsToDelete.length > 0) {
        await tx
          .delete(productVariants)
          .where(inArray(productVariants.id, variantIdsToDelete));
      }

      await attributeRepository.setValuesForProduct(
        tx,
        updatedProduct.id,
        input.attributes,
      );

      return updatedProduct;
    });
  },

  async archiveForAdmin(id: string) {
    await requireAdminSession();

    const db = getDb();

    const updatedRows = await db
      .update(products)
      .set({
        status: "archived",
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning({ id: products.id });

    return updatedRows.length > 0;
  },

  // Resolve a scanned/typed code to a sellable product for the POS. Matches a
  // product barcode first, then falls back to a variant SKU. Returns the product
  // with every variant's price + available stock so the cashier can pick one.
  async lookupForPos(code: string): Promise<PosLookupResult | null> {
    await requireAdminSession();

    const db = getDb();
    const needle = code.trim();
    if (!needle) {
      return null;
    }

    const [byBarcode] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.barcode, needle), isNull(products.deletedAt)))
      .limit(1);

    let productId = byBarcode?.id ?? null;

    if (!productId) {
      const [bySku] = await db
        .select({ id: products.id })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(and(eq(productVariants.sku, needle), isNull(products.deletedAt)))
        .limit(1);
      productId = bySku?.id ?? null;
    }

    if (!productId) {
      return null;
    }

    const [product] = await db
      .select({
        id: products.id,
        title: products.title,
        barcode: products.barcode,
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return null;
    }

    const variantRows = await db
      .select({
        variantId: productVariants.id,
        title: productVariants.title,
        sku: productVariants.sku,
        price: productVariants.price,
        availableQuantity: sql<number>`coalesce(${inventory.quantity}, 0) - coalesce(${inventory.reservedQuantity}, 0)`,
      })
      .from(productVariants)
      .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
      .where(eq(productVariants.productId, productId))
      .orderBy(asc(productVariants.createdAt));

    const [image] = await db
      .select({ bucket: productImages.bucket, path: productImages.path })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.position))
      .limit(1);

    return {
      productId: product.id,
      productTitle: product.title,
      barcode: product.barcode,
      imageUrl: image ? resolveUrl({ bucket: image.bucket, path: image.path }) : null,
      variants: variantRows.map((row) => ({
        variantId: row.variantId,
        title: row.title,
        sku: row.sku,
        price: row.price,
        availableQuantity: Number(row.availableQuantity),
      })),
    };
  },

  // List sellable products for the POS product grid. Same shape as lookupForPos
  // so a tapped tile flows through the identical "confirm then add" panel.
  // Optional title filter powers the kiosk's "search by name" box.
  async listForPos(
    input: { query?: string; limit?: number } = {},
  ): Promise<PosLookupResult[]> {
    await requireAdminSession();

    const db = getDb();
    const limit = Math.min(Math.max(input.limit ?? 40, 1), 100);
    const query = input.query?.trim();

    const productRows = await db
      .select({
        id: products.id,
        title: products.title,
        barcode: products.barcode,
      })
      .from(products)
      .where(
        and(
          eq(products.status, "active"),
          isNull(products.deletedAt),
          query ? ilike(products.title, `%${query}%`) : undefined,
        ),
      )
      .orderBy(asc(products.title))
      .limit(limit);

    if (productRows.length === 0) {
      return [];
    }

    const productIds = productRows.map((row) => row.id);

    const variantRows = await db
      .select({
        productId: productVariants.productId,
        variantId: productVariants.id,
        title: productVariants.title,
        sku: productVariants.sku,
        price: productVariants.price,
        createdAt: productVariants.createdAt,
        availableQuantity: sql<number>`coalesce(${inventory.quantity}, 0) - coalesce(${inventory.reservedQuantity}, 0)`,
      })
      .from(productVariants)
      .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
      .where(inArray(productVariants.productId, productIds))
      .orderBy(asc(productVariants.createdAt));

    const imageRows = await db
      .select({
        productId: productImages.productId,
        bucket: productImages.bucket,
        path: productImages.path,
        position: productImages.position,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.position));

    const variantsByProduct = new Map<string, PosLookupResult["variants"]>();
    for (const row of variantRows) {
      const list = variantsByProduct.get(row.productId) ?? [];
      list.push({
        variantId: row.variantId,
        title: row.title,
        sku: row.sku,
        price: row.price,
        availableQuantity: Number(row.availableQuantity),
      });
      variantsByProduct.set(row.productId, list);
    }

    // First image per product wins (rows already ordered by position).
    const imageByProduct = new Map<string, { bucket: string; path: string }>();
    for (const row of imageRows) {
      if (!imageByProduct.has(row.productId)) {
        imageByProduct.set(row.productId, {
          bucket: row.bucket,
          path: row.path,
        });
      }
    }

    return productRows
      .map((row) => {
        const image = imageByProduct.get(row.id);
        return {
          productId: row.id,
          productTitle: row.title,
          barcode: row.barcode,
          imageUrl: image ? resolveUrl(image) : null,
          variants: variantsByProduct.get(row.id) ?? [],
        };
      })
      .filter((item) => item.variants.length > 0);
  },

  // Recompute and persist a single product's barcode from the current config +
  // its attribute values. Returns the generated code.
  async regenerateBarcodeForAdmin(id: string) {
    await requireAdminSession();

    const db = getDb();
    const config = await getBarcodeConfig();

    const value = buildBarcodeValue({ config, productId: id });

    await db
      .update(products)
      .set({ barcode: value, updatedAt: new Date() })
      .where(eq(products.id, id));

    return value;
  },

  // Rebuild every non-deleted product's barcode — used after the barcode config
  // changes so existing products pick up the new format.
  async regenerateAllBarcodesForAdmin() {
    await requireAdminSession();

    const db = getDb();
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(isNull(products.deletedAt));

    for (const row of rows) {
      await this.regenerateBarcodeForAdmin(row.id);
    }

    return rows.length;
  },

  // Label data for bulk barcode printing. One row per selected product,
  // matching the single-product label: title, attribute line, price, and a
  // scannable barcode. Any product missing a barcode gets one generated and
  // persisted so every label scans.
  async barcodeLabelsForProducts(productIds: string[]) {
    await requireAdminSession();

    if (productIds.length === 0) return [];

    const db = getDb();

    const rows = await db
      .select({
        id: products.id,
        title: products.title,
        barcode: products.barcode,
      })
      .from(products)
      .where(and(inArray(products.id, productIds), isNull(products.deletedAt)))
      .orderBy(asc(products.title));

    if (rows.length === 0) return [];

    const priceRows = await db
      .select({
        productId: productVariants.productId,
        minPrice: sql<number>`min(${productVariants.price})`,
      })
      .from(productVariants)
      .where(
        inArray(
          productVariants.productId,
          rows.map((row) => row.id),
        ),
      )
      .groupBy(productVariants.productId);

    const priceByProductId = new Map(
      priceRows.map((row) => [row.productId, Number(row.minPrice)]),
    );

    const labels = [];
    for (const row of rows) {
      const barcode =
        row.barcode ?? (await this.regenerateBarcodeForAdmin(row.id));
      const attributes = await attributeRepository.listValuesForProduct(row.id);

      labels.push({
        id: row.id,
        title: row.title,
        barcode,
        price: priceByProductId.get(row.id) ?? null,
        attributeLine: attributes
          .map((entry) => entry.values.join(" · "))
          .join(" • "),
      });
    }

    return labels;
  },

  async setStatusForAdmin(id: string, status: AdminProductStatus) {
    await requireAdminSession();

    const db = getDb();

    const updatedRows = await db
      .update(products)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning({ id: products.id, slug: products.slug });

    return updatedRows[0] ?? null;
  },
};
