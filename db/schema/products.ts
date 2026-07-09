import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("draft"),
    productType: text("product_type"),
    // Real category relation. Drives storefront category facets/URLs and the
    // "Category" spec. `productType` is kept as a free-text descriptor only.
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    vendor: text("vendor"),
    tags: text("tags").array().notNull().default([]),
    // Generated, scannable code (Code128) for the in-store POS. Composed from
    // configured attributes — see lib/barcode.
    barcode: text("barcode"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("products_slug_unique").on(table.slug),
    uniqueIndex("products_barcode_unique").on(table.barcode),
    index("products_status_idx").on(table.status),
    index("products_category_id_idx").on(table.categoryId),
  ],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    sku: text("sku"),
    price: integer("price").notNull(),
    compareAtPrice: integer("compare_at_price"),
    weight: integer("weight"),
    option1: text("option1"),
    option2: text("option2"),
    option3: text("option3"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("product_variants_sku_unique").on(table.sku),
    index("product_variants_product_id_idx").on(table.productId),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    bucket: text("bucket").notNull(),
    path: text("path").notNull(),
    altText: text("alt_text"),
    position: integer("position").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("product_images_product_id_idx").on(table.productId)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    parentId: uuid("parent_id"),
    position: integer("position").notNull().default(0),
    description: text("description"),
    imageBucket: text("image_bucket"),
    imagePath: text("image_path"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("categories_slug_unique").on(table.slug)],
);

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    imageBucket: text("image_bucket"),
    imagePath: text("image_path"),
    type: text("type").notNull().default("manual"),
    conditions: jsonb("conditions").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("collections_slug_unique").on(table.slug)],
);

export const collectionProducts = pgTable(
  "collection_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("collection_products_unique").on(
      table.collectionId,
      table.productId,
    ),
  ],
);

export const frames = pgTable(
  "frames",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    priceDelta: integer("price_delta").notNull().default(0),
    imageBucket: text("image_bucket"),
    imagePath: text("image_path"),
    cutoutX: real("cutout_x").notNull().default(20),
    cutoutY: real("cutout_y").notNull().default(20),
    cutoutWidth: real("cutout_width").notNull().default(60),
    cutoutHeight: real("cutout_height").notNull().default(60),
    position: integer("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("frames_slug_unique").on(table.slug),
    index("frames_active_idx").on(table.isActive),
  ],
);

export const productFrames = pgTable(
  "product_frames",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    frameId: uuid("frame_id")
      .notNull()
      .references(() => frames.id, { onDelete: "cascade" }),
    isDefault: boolean("is_default").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("product_frames_unique").on(table.productId, table.frameId),
    index("product_frames_product_id_idx").on(table.productId),
  ],
);

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    reservedQuantity: integer("reserved_quantity").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("inventory_variant_id_unique").on(table.variantId)],
);
