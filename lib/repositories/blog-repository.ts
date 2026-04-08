import { and, asc, desc, eq, ilike, inArray, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  blogCategories,
  blogPostCategories,
  blogPosts,
  blogPostTags,
  blogTags,
} from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

type ListPublishedInput = {
  query?: string;
  category?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
};

type BlogListPublishedRow = typeof blogPosts.$inferSelect;

type BlogListPublishedPageResult = {
  rows: BlogListPublishedRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type BlogFullTextMatch = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  featuredImageBucket: string | null;
  featuredImagePath: string | null;
  featuredImageAlt: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  rank: number;
};

export type BlogTaxonomyOption = {
  slug: string;
  name: string;
  count: number;
};

export type BlogAdminCategoryOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  postCount: number;
};

export type BlogAdminTagOption = {
  id: string;
  name: string;
  slug: string;
  postCount: number;
};

function clampPage(input: number | undefined) {
  if (!Number.isFinite(input)) {
    return 1;
  }

  return Math.max(1, Math.floor(input ?? 1));
}

function clampPageSize(input: number | undefined) {
  if (!Number.isFinite(input)) {
    return 12;
  }

  return Math.min(Math.max(Math.floor(input ?? 12), 1), 24);
}

function dedupeIds(ids: string[] | undefined) {
  return [...new Set((ids ?? []).filter((id) => id.length > 0))];
}

export const blogRepository = {
  async listPublished(input: ListPublishedInput = {}) {
    const result = await this.listPublishedPage(input);
    return result.rows;
  },

  async listPublishedPage(
    input: ListPublishedInput = {},
  ): Promise<BlogListPublishedPageResult> {
    const db = getDb();
    const query = input.query?.trim();
    const category = input.category?.trim();
    const tag = input.tag?.trim();
    const page = clampPage(input.page);
    const pageSize = clampPageSize(input.pageSize);
    const offset = (page - 1) * pageSize;
    const now = new Date();

    const categoryCondition = category
      ? sql`
          exists (
            select 1
            from ${blogPostCategories}
            inner join ${blogCategories}
              on ${blogCategories.id} = ${blogPostCategories.categoryId}
            where ${blogPostCategories.postId} = ${blogPosts.id}
              and ${blogCategories.slug} = ${category}
          )
        `
      : undefined;

    const tagCondition = tag
      ? sql`
          exists (
            select 1
            from ${blogPostTags}
            inner join ${blogTags}
              on ${blogTags.id} = ${blogPostTags.tagId}
            where ${blogPostTags.postId} = ${blogPosts.id}
              and ${blogTags.slug} = ${tag}
          )
        `
      : undefined;

    const where = and(
      eq(blogPosts.status, "published"),
      lte(blogPosts.publishedAt, now),
      query
        ? or(
            ilike(blogPosts.title, `%${query}%`),
            ilike(blogPosts.excerpt, `%${query}%`),
          )
        : undefined,
      categoryCondition,
      tagCondition,
    );

    const rows = await db
      .select()
      .from(blogPosts)
      .where(where)
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [countRow] = await db
      .select({ total: sql<number>`count(*)` })
      .from(blogPosts)
      .where(where);

    const total = Number(countRow?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      rows,
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
    };
  },

  async listPublishedTaxonomyOptions() {
    const db = getDb();
    const now = new Date();

    const [categoryRows, tagRows] = await Promise.all([
      db
        .select({
          slug: blogCategories.slug,
          name: blogCategories.name,
          count: sql<number>`count(distinct ${blogPostCategories.postId})`,
        })
        .from(blogCategories)
        .innerJoin(
          blogPostCategories,
          eq(blogPostCategories.categoryId, blogCategories.id),
        )
        .innerJoin(blogPosts, eq(blogPosts.id, blogPostCategories.postId))
        .where(
          and(
            eq(blogPosts.status, "published"),
            lte(blogPosts.publishedAt, now),
          ),
        )
        .groupBy(blogCategories.id, blogCategories.slug, blogCategories.name)
        .orderBy(asc(blogCategories.position), asc(blogCategories.name)),
      db
        .select({
          slug: blogTags.slug,
          name: blogTags.name,
          count: sql<number>`count(distinct ${blogPostTags.postId})`,
        })
        .from(blogTags)
        .innerJoin(blogPostTags, eq(blogPostTags.tagId, blogTags.id))
        .innerJoin(blogPosts, eq(blogPosts.id, blogPostTags.postId))
        .where(
          and(
            eq(blogPosts.status, "published"),
            lte(blogPosts.publishedAt, now),
          ),
        )
        .groupBy(blogTags.id, blogTags.slug, blogTags.name)
        .orderBy(asc(blogTags.name)),
    ]);

    return {
      categories: categoryRows.map(
        (row): BlogTaxonomyOption => ({
          slug: row.slug,
          name: row.name,
          count: Number(row.count),
        }),
      ),
      tags: tagRows.map(
        (row): BlogTaxonomyOption => ({
          slug: row.slug,
          name: row.name,
          count: Number(row.count),
        }),
      ),
    };
  },

  async findBySlug(slug: string) {
    const db = getDb();
    const now = new Date();

    const [post] = await db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.slug, slug),
          eq(blogPosts.status, "published"),
          lte(blogPosts.publishedAt, now),
        ),
      )
      .limit(1);

    return post ?? null;
  },

  async listPublishedSlugs(limit = 200) {
    const db = getDb();
    const now = new Date();

    const rows = await db
      .select({ slug: blogPosts.slug })
      .from(blogPosts)
      .where(
        and(eq(blogPosts.status, "published"), lte(blogPosts.publishedAt, now)),
      )
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.updatedAt))
      .limit(limit);

    return rows.map((row) => row.slug);
  },

  async listPublishedSitemapEntries(limit = 5000) {
    const db = getDb();
    const now = new Date();

    return db
      .select({
        slug: blogPosts.slug,
        publishedAt: blogPosts.publishedAt,
        updatedAt: blogPosts.updatedAt,
      })
      .from(blogPosts)
      .where(
        and(eq(blogPosts.status, "published"), lte(blogPosts.publishedAt, now)),
      )
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.updatedAt))
      .limit(limit);
  },

  async incrementViews(postId: string) {
    const db = getDb();

    await db
      .update(blogPosts)
      .set({
        viewCount: sql`${blogPosts.viewCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, postId));
  },

  async publishDuePosts(now = new Date()) {
    const db = getDb();

    return db
      .update(blogPosts)
      .set({ status: "published", publishedAt: now, updatedAt: now })
      .where(
        and(eq(blogPosts.status, "scheduled"), lte(blogPosts.scheduledAt, now)),
      )
      .returning({ id: blogPosts.id, slug: blogPosts.slug });
  },

  async listForAdmin(limit = 25) {
    await requireAdminSession();

    const db = getDb();

    return db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        status: blogPosts.status,
        publishedAt: blogPosts.publishedAt,
        createdAt: blogPosts.createdAt,
        viewCount: blogPosts.viewCount,
      })
      .from(blogPosts)
      .orderBy(desc(blogPosts.createdAt))
      .limit(limit);
  },

  async listCategoriesForAdmin(limit = 200) {
    await requireAdminSession();

    const db = getDb();

    const rows = await db
      .select({
        id: blogCategories.id,
        name: blogCategories.name,
        slug: blogCategories.slug,
        description: blogCategories.description,
        position: blogCategories.position,
        postCount: sql<number>`count(distinct ${blogPostCategories.postId})`,
      })
      .from(blogCategories)
      .leftJoin(
        blogPostCategories,
        eq(blogPostCategories.categoryId, blogCategories.id),
      )
      .groupBy(
        blogCategories.id,
        blogCategories.name,
        blogCategories.slug,
        blogCategories.description,
        blogCategories.position,
      )
      .orderBy(asc(blogCategories.position), asc(blogCategories.name))
      .limit(limit);

    return rows.map(
      (row): BlogAdminCategoryOption => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        position: row.position,
        postCount: Number(row.postCount),
      }),
    );
  },

  async listTagsForAdmin(limit = 300) {
    await requireAdminSession();

    const db = getDb();

    const rows = await db
      .select({
        id: blogTags.id,
        name: blogTags.name,
        slug: blogTags.slug,
        postCount: sql<number>`count(distinct ${blogPostTags.postId})`,
      })
      .from(blogTags)
      .leftJoin(blogPostTags, eq(blogPostTags.tagId, blogTags.id))
      .groupBy(blogTags.id, blogTags.name, blogTags.slug)
      .orderBy(asc(blogTags.name))
      .limit(limit);

    return rows.map(
      (row): BlogAdminTagOption => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        postCount: Number(row.postCount),
      }),
    );
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
      .insert(blogCategories)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        position: input.position,
        updatedAt: new Date(),
      })
      .returning({ id: blogCategories.id });

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
      .update(blogCategories)
      .set({
        name: input.name,
        slug: input.slug,
        description: input.description,
        position: input.position,
        updatedAt: new Date(),
      })
      .where(eq(blogCategories.id, id))
      .returning({ id: blogCategories.id });

    return updated ?? null;
  },

  async createTagForAdmin(input: { name: string; slug: string }) {
    await requireAdminSession();

    const db = getDb();

    const [created] = await db
      .insert(blogTags)
      .values({
        name: input.name,
        slug: input.slug,
        updatedAt: new Date(),
      })
      .returning({ id: blogTags.id });

    return created ?? null;
  },

  async updateTagForAdmin(id: string, input: { name: string; slug: string }) {
    await requireAdminSession();

    const db = getDb();

    const [updated] = await db
      .update(blogTags)
      .set({
        name: input.name,
        slug: input.slug,
        updatedAt: new Date(),
      })
      .where(eq(blogTags.id, id))
      .returning({ id: blogTags.id });

    return updated ?? null;
  },

  async findByIdForAdmin(id: string) {
    await requireAdminSession();

    const db = getDb();

    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    return post ?? null;
  },

  async findByIdWithTaxonomyForAdmin(id: string) {
    const db = getDb();

    const post = await this.findByIdForAdmin(id);
    if (!post) {
      return null;
    }

    const [categoryRows, tagRows] = await Promise.all([
      db
        .select({ categoryId: blogPostCategories.categoryId })
        .from(blogPostCategories)
        .where(eq(blogPostCategories.postId, id)),
      db
        .select({ tagId: blogPostTags.tagId })
        .from(blogPostTags)
        .where(eq(blogPostTags.postId, id)),
    ]);

    return {
      post,
      categoryIds: categoryRows.map((row) => row.categoryId),
      tagIds: tagRows.map((row) => row.tagId),
    };
  },

  async createForAdmin(input: {
    title: string;
    slug: string;
    content: string;
    excerpt: string | null;
    featuredImageBucket: string | null;
    featuredImagePath: string | null;
    featuredImageAlt: string | null;
    status: "draft" | "published" | "scheduled";
    scheduledAt: Date | null;
    publishedAt: Date | null;
    authorId: string | null;
    categoryIds?: string[];
    tagIds?: string[];
  }) {
    await requireAdminSession();

    const db = getDb();

    const categoryIds = dedupeIds(input.categoryIds);
    const tagIds = dedupeIds(input.tagIds);

    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(blogPosts)
        .values({
          title: input.title,
          slug: input.slug,
          content: input.content,
          excerpt: input.excerpt,
          featuredImageBucket: input.featuredImageBucket,
          featuredImagePath: input.featuredImagePath,
          featuredImageAlt: input.featuredImageAlt,
          status: input.status,
          scheduledAt: input.scheduledAt,
          publishedAt: input.publishedAt,
          authorId: input.authorId,
          updatedAt: new Date(),
        })
        .returning({ id: blogPosts.id, slug: blogPosts.slug });

      if (!created) {
        return null;
      }

      if (categoryIds.length > 0) {
        await tx.insert(blogPostCategories).values(
          categoryIds.map((categoryId) => ({
            postId: created.id,
            categoryId,
            updatedAt: new Date(),
          })),
        );
      }

      if (tagIds.length > 0) {
        await tx.insert(blogPostTags).values(
          tagIds.map((tagId) => ({
            postId: created.id,
            tagId,
            updatedAt: new Date(),
          })),
        );
      }

      return created;
    });
  },

  async updateForAdmin(
    id: string,
    input: {
      title: string;
      slug: string;
      content: string;
      excerpt: string | null;
      featuredImageBucket: string | null;
      featuredImagePath: string | null;
      featuredImageAlt: string | null;
      status: "draft" | "published" | "scheduled";
      scheduledAt: Date | null;
      publishedAt: Date | null;
      categoryIds?: string[];
      tagIds?: string[];
    },
  ) {
    await requireAdminSession();

    const db = getDb();

    const categoryIds = dedupeIds(input.categoryIds);
    const tagIds = dedupeIds(input.tagIds);

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(blogPosts)
        .set({
          title: input.title,
          slug: input.slug,
          content: input.content,
          excerpt: input.excerpt,
          featuredImageBucket: input.featuredImageBucket,
          featuredImagePath: input.featuredImagePath,
          featuredImageAlt: input.featuredImageAlt,
          status: input.status,
          scheduledAt: input.scheduledAt,
          publishedAt: input.publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(blogPosts.id, id))
        .returning({ id: blogPosts.id, slug: blogPosts.slug });

      if (!updated) {
        return null;
      }

      await tx
        .delete(blogPostCategories)
        .where(eq(blogPostCategories.postId, id));
      await tx.delete(blogPostTags).where(eq(blogPostTags.postId, id));

      if (categoryIds.length > 0) {
        await tx.insert(blogPostCategories).values(
          categoryIds.map((categoryId) => ({
            postId: id,
            categoryId,
            updatedAt: new Date(),
          })),
        );
      }

      if (tagIds.length > 0) {
        await tx.insert(blogPostTags).values(
          tagIds.map((tagId) => ({
            postId: id,
            tagId,
            updatedAt: new Date(),
          })),
        );
      }

      return updated;
    });
  },

  async findRelated(postId: string, limit = 3) {
    const db = getDb();
    const now = new Date();

    const [categoryRows, tagRows] = await Promise.all([
      db
        .select({ id: blogPostCategories.categoryId })
        .from(blogPostCategories)
        .where(eq(blogPostCategories.postId, postId)),
      db
        .select({ id: blogPostTags.tagId })
        .from(blogPostTags)
        .where(eq(blogPostTags.postId, postId)),
    ]);

    const categoryIds = categoryRows.map((row) => row.id);
    const tagIds = tagRows.map((row) => row.id);

    const relevanceByPostId = new Map<string, number>();

    if (categoryIds.length > 0) {
      const categoryMatches = await db
        .select({ postId: blogPostCategories.postId })
        .from(blogPostCategories)
        .where(
          and(
            inArray(blogPostCategories.categoryId, categoryIds),
            sql`${blogPostCategories.postId} <> ${postId}`,
          ),
        );

      for (const match of categoryMatches) {
        relevanceByPostId.set(
          match.postId,
          (relevanceByPostId.get(match.postId) ?? 0) + 2,
        );
      }
    }

    if (tagIds.length > 0) {
      const tagMatches = await db
        .select({ postId: blogPostTags.postId })
        .from(blogPostTags)
        .where(
          and(
            inArray(blogPostTags.tagId, tagIds),
            sql`${blogPostTags.postId} <> ${postId}`,
          ),
        );

      for (const match of tagMatches) {
        relevanceByPostId.set(
          match.postId,
          (relevanceByPostId.get(match.postId) ?? 0) + 1,
        );
      }
    }

    const candidateIds = [...relevanceByPostId.keys()];

    if (candidateIds.length === 0) {
      return db
        .select({
          id: blogPosts.id,
          slug: blogPosts.slug,
          title: blogPosts.title,
          excerpt: blogPosts.excerpt,
          content: blogPosts.content,
          featuredImageBucket: blogPosts.featuredImageBucket,
          featuredImagePath: blogPosts.featuredImagePath,
          featuredImageAlt: blogPosts.featuredImageAlt,
          publishedAt: blogPosts.publishedAt,
          createdAt: blogPosts.createdAt,
        })
        .from(blogPosts)
        .where(
          and(
            eq(blogPosts.status, "published"),
            lte(blogPosts.publishedAt, now),
            sql`${blogPosts.id} <> ${postId}`,
          ),
        )
        .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt))
        .limit(limit);
    }

    const relatedRows = await db
      .select({
        id: blogPosts.id,
        slug: blogPosts.slug,
        title: blogPosts.title,
        excerpt: blogPosts.excerpt,
        content: blogPosts.content,
        featuredImageBucket: blogPosts.featuredImageBucket,
        featuredImagePath: blogPosts.featuredImagePath,
        featuredImageAlt: blogPosts.featuredImageAlt,
        publishedAt: blogPosts.publishedAt,
        createdAt: blogPosts.createdAt,
      })
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.status, "published"),
          lte(blogPosts.publishedAt, now),
          inArray(blogPosts.id, candidateIds),
        ),
      );

    return relatedRows
      .sort((a, b) => {
        const scoreDelta =
          (relevanceByPostId.get(b.id) ?? 0) -
          (relevanceByPostId.get(a.id) ?? 0);
        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        const aTime = (a.publishedAt ?? a.createdAt).getTime();
        const bTime = (b.publishedAt ?? b.createdAt).getTime();
        return bTime - aTime;
      })
      .slice(0, limit);
  },

  async searchPublishedFullText(input: { query: string; limit?: number }) {
    const db = getDb();
    const query = input.query.trim();

    if (!query) {
      return [] as BlogFullTextMatch[];
    }

    const limit = Math.min(Math.max(Math.floor(input.limit ?? 8), 1), 20);
    const now = new Date();
    const documentExpr = sql`
      setweight(to_tsvector('english', coalesce(${blogPosts.title}, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(${blogPosts.excerpt}, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(${blogPosts.content}, '')), 'C')
    `;
    const queryExpr = sql`websearch_to_tsquery('english', ${query})`;
    const rankExpr = sql<number>`ts_rank_cd(${documentExpr}, ${queryExpr})`;

    const rows = await db
      .select({
        id: blogPosts.id,
        slug: blogPosts.slug,
        title: blogPosts.title,
        excerpt: blogPosts.excerpt,
        content: blogPosts.content,
        featuredImageBucket: blogPosts.featuredImageBucket,
        featuredImagePath: blogPosts.featuredImagePath,
        featuredImageAlt: blogPosts.featuredImageAlt,
        publishedAt: blogPosts.publishedAt,
        createdAt: blogPosts.createdAt,
        rank: rankExpr,
      })
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.status, "published"),
          lte(blogPosts.publishedAt, now),
          sql`${documentExpr} @@ ${queryExpr}`,
        ),
      )
      .orderBy(desc(rankExpr), desc(blogPosts.publishedAt), desc(blogPosts.id))
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      rank: Number(row.rank),
    }));
  },
};
