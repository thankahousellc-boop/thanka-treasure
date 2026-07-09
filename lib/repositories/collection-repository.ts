import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  categories,
  collectionProducts,
  collections,
  products,
} from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

export const collectionRepository = {
  async findBySlug(slug: string) {
    const db = getDb();

    const [collection] = await db
      .select({
        id: collections.id,
        title: collections.title,
        slug: collections.slug,
        description: collections.description,
        imageBucket: collections.imageBucket,
        imagePath: collections.imagePath,
        type: collections.type,
        updatedAt: collections.updatedAt,
        createdAt: collections.createdAt,
      })
      .from(collections)
      .where(eq(collections.slug, slug))
      .limit(1);

    return collection ?? null;
  },

  async listSlugs(limit = 250) {
    const db = getDb();

    const rows = await db
      .select({ slug: collections.slug })
      .from(collections)
      .orderBy(desc(collections.updatedAt), desc(collections.createdAt))
      .limit(limit);

    return rows.map((row) => row.slug);
  },

  async findCategoryBySlug(slug: string) {
    const db = getDb();

    const [category] = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        imageBucket: categories.imageBucket,
        imagePath: categories.imagePath,
        position: categories.position,
        updatedAt: categories.updatedAt,
        createdAt: categories.createdAt,
      })
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    return category ?? null;
  },

  async listCategorySlugs(limit = 250) {
    const db = getDb();

    const rows = await db
      .select({ slug: categories.slug })
      .from(categories)
      .orderBy(asc(categories.position), asc(categories.name))
      .limit(limit);

    return rows.map((row) => row.slug);
  },

  async listCategoriesForAdmin(limit = 200) {
    await requireAdminSession();

    const db = getDb();

    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        position: categories.position,
        imageBucket: categories.imageBucket,
        imagePath: categories.imagePath,
        productCount: sql<number>`count(distinct ${products.id})`,
      })
      .from(categories)
      .leftJoin(
        products,
        and(
          isNull(products.deletedAt),
          eq(products.categoryId, categories.id),
        ),
      )
      .groupBy(
        categories.id,
        categories.name,
        categories.slug,
        categories.description,
        categories.position,
        categories.imageBucket,
        categories.imagePath,
      )
      .orderBy(asc(categories.position), asc(categories.name))
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      productCount: Number(row.productCount),
    }));
  },

  async listCollectionsForAdmin(limit = 200) {
    await requireAdminSession();

    const db = getDb();

    const rows = await db
      .select({
        id: collections.id,
        title: collections.title,
        slug: collections.slug,
        description: collections.description,
        type: collections.type,
        imageBucket: collections.imageBucket,
        imagePath: collections.imagePath,
        updatedAt: collections.updatedAt,
        createdAt: collections.createdAt,
        productCount: sql<number>`count(distinct ${collectionProducts.productId})`,
      })
      .from(collections)
      .leftJoin(
        collectionProducts,
        eq(collectionProducts.collectionId, collections.id),
      )
      .groupBy(
        collections.id,
        collections.title,
        collections.slug,
        collections.description,
        collections.type,
        collections.imageBucket,
        collections.imagePath,
        collections.updatedAt,
        collections.createdAt,
      )
      .orderBy(asc(collections.title))
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      productCount: Number(row.productCount),
    }));
  },

  async listCollectionProductLinksForAdmin(collectionIds: string[]) {
    await requireAdminSession();

    const db = getDb();

    if (collectionIds.length === 0) {
      return [] as Array<{
        collectionId: string;
        productId: string;
        position: number;
      }>;
    }

    return db
      .select({
        collectionId: collectionProducts.collectionId,
        productId: collectionProducts.productId,
        position: collectionProducts.position,
      })
      .from(collectionProducts)
      .where(inArray(collectionProducts.collectionId, collectionIds))
      .orderBy(
        asc(collectionProducts.collectionId),
        asc(collectionProducts.position),
        asc(collectionProducts.createdAt),
      );
  },

  async listProductsForCollectionAdmin(limit = 300) {
    await requireAdminSession();

    const db = getDb();

    return db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        status: products.status,
      })
      .from(products)
      .where(isNull(products.deletedAt))
      .orderBy(desc(products.createdAt))
      .limit(limit);
  },

  async createCategoryForAdmin(input: {
    name: string;
    slug: string;
    description: string | null;
    position: number;
  }) {
    await requireAdminSession();

    const db = getDb();

    const [created] = await db
      .insert(categories)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        position: input.position,
        updatedAt: new Date(),
      })
      .returning({ id: categories.id });

    return created ?? null;
  },

  async updateCategoryForAdmin(
    id: string,
    input: {
      name: string;
      slug: string;
      description: string | null;
      position: number;
    },
  ) {
    await requireAdminSession();

    const db = getDb();

    const [updated] = await db
      .update(categories)
      .set({
        name: input.name,
        slug: input.slug,
        description: input.description,
        position: input.position,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning({ id: categories.id });

    return updated ?? null;
  },

  async createCollectionForAdmin(input: {
    title: string;
    slug: string;
    description: string | null;
    type: "manual" | "automated";
  }) {
    await requireAdminSession();

    const db = getDb();

    const [created] = await db
      .insert(collections)
      .values({
        title: input.title,
        slug: input.slug,
        description: input.description,
        type: input.type,
        conditions: {},
        updatedAt: new Date(),
      })
      .returning({ id: collections.id });

    return created ?? null;
  },

  async updateCollectionForAdmin(
    id: string,
    input: {
      title: string;
      slug: string;
      description: string | null;
      type: "manual" | "automated";
    },
  ) {
    await requireAdminSession();

    const db = getDb();

    const [updated] = await db
      .update(collections)
      .set({
        title: input.title,
        slug: input.slug,
        description: input.description,
        type: input.type,
        updatedAt: new Date(),
      })
      .where(eq(collections.id, id))
      .returning({ id: collections.id, slug: collections.slug });

    return updated ?? null;
  },

  async setCollectionProductsForAdmin(
    collectionId: string,
    productIds: string[],
  ) {
    await requireAdminSession();

    const db = getDb();

    return db.transaction(async (tx) => {
      const [collection] = await tx
        .select({ id: collections.id })
        .from(collections)
        .where(eq(collections.id, collectionId))
        .limit(1);

      if (!collection) {
        return false;
      }

      const dedupedIds = Array.from(
        new Set(
          productIds.map((id) => id.trim()).filter((id) => id.length > 0),
        ),
      );

      const validProductIds =
        dedupedIds.length > 0
          ? await tx
              .select({ id: products.id })
              .from(products)
              .where(
                and(
                  inArray(products.id, dedupedIds),
                  isNull(products.deletedAt),
                ),
              )
          : [];

      await tx
        .delete(collectionProducts)
        .where(eq(collectionProducts.collectionId, collectionId));

      if (validProductIds.length > 0) {
        await tx.insert(collectionProducts).values(
          validProductIds.map((product, index) => ({
            collectionId,
            productId: product.id,
            position: index,
            updatedAt: new Date(),
          })),
        );
      }

      return true;
    });
  },
};
