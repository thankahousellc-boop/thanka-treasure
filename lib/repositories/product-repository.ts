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
  collectionProducts,
  inventory,
  productImages,
  products,
  productVariants,
} from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

type ProductSearchInput = {
  query?: string;
  productType?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "oldest" | "title" | "price_asc" | "price_desc";
  limit?: number;
  page?: number;
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
  vendor: string | null;
  tags: string[];
  variants: AdminProductVariantUpsertInput[];
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

    return { product, variants, images };
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

  async listForAdmin(limit = 30) {
    await requireAdminSession();

    const db = getDb();

    return db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        status: products.status,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(isNull(products.deletedAt))
      .orderBy(desc(products.createdAt))
      .limit(limit);
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

    return {
      product,
      primaryVariant: primaryVariant ?? null,
      inventory: currentInventory,
      variants: variantsWithInventory,
      images,
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
