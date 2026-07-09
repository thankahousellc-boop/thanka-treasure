import { asc, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { etsyReviews } from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

type CreateReviewInput = {
  authorName: string;
  rating: number;
  body: string;
  productTitle: string | null;
  reviewedAt: Date | null;
  sortOrder: number;
  isPublished: boolean;
};

type UpdateReviewInput = Partial<CreateReviewInput>;

export const reviewsRepository = {
  /** Public storefront query — only published reviews. */
  async listPublished(limit = 12) {
    const db = getDb();

    return db
      .select({
        id: etsyReviews.id,
        authorName: etsyReviews.authorName,
        rating: etsyReviews.rating,
        body: etsyReviews.body,
        productTitle: etsyReviews.productTitle,
        reviewedAt: etsyReviews.reviewedAt,
      })
      .from(etsyReviews)
      .where(eq(etsyReviews.isPublished, true))
      // Always surface the latest reviews first. reviewedAt is the Etsy review
      // date; rows without one fall back to when they were added.
      .orderBy(
        sql`${etsyReviews.reviewedAt} desc nulls last`,
        desc(etsyReviews.createdAt),
      )
      .limit(limit);
  },

  async listForAdmin(limit = 200) {
    await requireAdminSession();

    const db = getDb();

    return db
      .select()
      .from(etsyReviews)
      .orderBy(asc(etsyReviews.sortOrder), desc(etsyReviews.createdAt))
      .limit(limit);
  },

  async getAdminStats() {
    await requireAdminSession();

    const db = getDb();

    const [totalRow, publishedRow] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)` })
        .from(etsyReviews)
        .then((rows) => rows[0]),
      db
        .select({ total: sql<number>`count(*)` })
        .from(etsyReviews)
        .where(eq(etsyReviews.isPublished, true))
        .then((rows) => rows[0]),
    ]);

    return {
      total: Number(totalRow?.total ?? 0),
      publishedCount: Number(publishedRow?.total ?? 0),
    };
  },

  async create(input: CreateReviewInput) {
    await requireAdminSession();

    const db = getDb();

    await db.insert(etsyReviews).values({
      authorName: input.authorName,
      rating: input.rating,
      body: input.body,
      productTitle: input.productTitle,
      reviewedAt: input.reviewedAt,
      sortOrder: input.sortOrder,
      isPublished: input.isPublished,
      updatedAt: new Date(),
    });
  },

  /** Bulk insert (CSV import). Returns number of rows inserted. */
  async createMany(rows: CreateReviewInput[]) {
    await requireAdminSession();

    if (rows.length === 0) return 0;

    const db = getDb();

    const now = new Date();
    const inserted = await db
      .insert(etsyReviews)
      .values(rows.map((row) => ({ ...row, updatedAt: now })))
      .returning({ id: etsyReviews.id });

    return inserted.length;
  },

  async update(id: string, input: UpdateReviewInput) {
    await requireAdminSession();

    const db = getDb();

    const updatedRows = await db
      .update(etsyReviews)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(etsyReviews.id, id))
      .returning({ id: etsyReviews.id });

    return updatedRows.length > 0;
  },

  async setPublished(id: string, isPublished: boolean) {
    await requireAdminSession();

    const db = getDb();

    const updatedRows = await db
      .update(etsyReviews)
      .set({ isPublished, updatedAt: new Date() })
      .where(eq(etsyReviews.id, id))
      .returning({ id: etsyReviews.id });

    return updatedRows.length > 0;
  },

  async remove(id: string) {
    await requireAdminSession();

    const db = getDb();

    const deletedRows = await db
      .delete(etsyReviews)
      .where(eq(etsyReviews.id, id))
      .returning({ id: etsyReviews.id });

    return deletedRows.length > 0;
  },
};
