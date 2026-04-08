import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./profiles";

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    content: text("content").notNull(),
    excerpt: text("excerpt"),
    featuredImageBucket: text("featured_image_bucket"),
    featuredImagePath: text("featured_image_path"),
    featuredImageAlt: text("featured_image_alt"),
    authorId: uuid("author_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    viewCount: integer("view_count").notNull().default(0),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    ogImageBucket: text("og_image_bucket"),
    ogImagePath: text("og_image_path"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("blog_posts_slug_unique").on(table.slug),
    index("blog_posts_status_published_idx").on(
      table.status,
      table.publishedAt,
    ),
  ],
);

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("blog_categories_slug_unique").on(table.slug)],
);

export const blogPostCategories = pgTable(
  "blog_post_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => blogCategories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("blog_post_categories_unique").on(
      table.postId,
      table.categoryId,
    ),
  ],
);

export const blogTags = pgTable(
  "blog_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("blog_tags_slug_unique").on(table.slug)],
);

export const blogPostTags = pgTable(
  "blog_post_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => blogTags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("blog_post_tags_unique").on(table.postId, table.tagId),
  ],
);

export const staticPages = pgTable(
  "static_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    content: text("content"),
    status: text("status").notNull().default("draft"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("static_pages_slug_unique").on(table.slug)],
);

export const siteSettings = pgTable(
  "site_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    value: jsonb("value").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("site_settings_key_unique").on(table.key)],
);
