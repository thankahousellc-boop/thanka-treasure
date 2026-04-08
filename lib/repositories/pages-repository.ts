import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { staticPages } from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

const PUBLISHED_PAGE_STATUSES = ["published", "active"];

type AdminStaticPageStatus = "draft" | "published" | "active";

type AdminStaticPageUpsertInput = {
  title: string;
  slug: string;
  content: string | null;
  status: AdminStaticPageStatus;
  metaTitle: string | null;
  metaDescription: string | null;
};

export const pagesRepository = {
  async findBySlug(slug: string) {
    const db = getDb();

    const [page] = await db
      .select()
      .from(staticPages)
      .where(
        and(
          eq(staticPages.slug, slug),
          inArray(staticPages.status, PUBLISHED_PAGE_STATUSES),
        ),
      )
      .limit(1);

    return page ?? null;
  },

  async listPublishedSlugs(limit = 250) {
    const db = getDb();

    const rows = await db
      .select({ slug: staticPages.slug })
      .from(staticPages)
      .where(inArray(staticPages.status, PUBLISHED_PAGE_STATUSES))
      .orderBy(desc(staticPages.updatedAt), desc(staticPages.createdAt))
      .limit(limit);

    return rows.map((row) => row.slug);
  },

  async listForAdmin(limit = 100) {
    await requireAdminSession();

    const db = getDb();

    return db
      .select({
        id: staticPages.id,
        title: staticPages.title,
        slug: staticPages.slug,
        status: staticPages.status,
        updatedAt: staticPages.updatedAt,
        createdAt: staticPages.createdAt,
      })
      .from(staticPages)
      .orderBy(desc(staticPages.updatedAt), desc(staticPages.createdAt))
      .limit(limit);
  },

  async findByIdForAdmin(id: string) {
    await requireAdminSession();

    const db = getDb();

    const [page] = await db
      .select()
      .from(staticPages)
      .where(eq(staticPages.id, id))
      .limit(1);

    return page ?? null;
  },

  async createForAdmin(input: AdminStaticPageUpsertInput) {
    await requireAdminSession();

    const db = getDb();

    const [created] = await db
      .insert(staticPages)
      .values({
        title: input.title,
        slug: input.slug,
        content: input.content,
        status: input.status,
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        updatedAt: new Date(),
      })
      .returning({ id: staticPages.id, slug: staticPages.slug });

    return created ?? null;
  },

  async updateForAdmin(id: string, input: AdminStaticPageUpsertInput) {
    await requireAdminSession();

    const db = getDb();

    const [updated] = await db
      .update(staticPages)
      .set({
        title: input.title,
        slug: input.slug,
        content: input.content,
        status: input.status,
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        updatedAt: new Date(),
      })
      .where(eq(staticPages.id, id))
      .returning({ id: staticPages.id, slug: staticPages.slug });

    return updated ?? null;
  },
};
