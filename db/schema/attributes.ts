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

import { products } from "./products";

// Admin-defined product attributes (a.k.a. metafields / specifications). The set
// is fully data-driven so the platform can be reused for a different business
// without code changes — e.g. a thanka shop defines Artist, Size, Gold, Brocade,
// Year while another shop defines its own.
export const attributeDefinitions = pgTable(
  "attribute_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Human label shown in admin + storefront, e.g. "Artist Name".
    name: text("name").notNull(),
    // Stable slug used in URLs and barcode config, e.g. "artist-name".
    key: text("key").notNull(),
    // text | number | boolean | select | multi_select
    type: text("type").notNull().default("text"),
    // Allowed values for select / multi_select types. Empty for other types.
    options: jsonb("options").notNull().default([]),
    // Optional unit suffix for display, e.g. "cm".
    unit: text("unit"),
    // Show as a storefront facet (filterable sidebar entry).
    isFilterable: boolean("is_filterable").notNull().default(false),
    // Render in the storefront product specification list.
    showOnStorefront: boolean("show_on_storefront").notNull().default(true),
    // Force a value when editing a product.
    isRequired: boolean("is_required").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("attribute_definitions_key_unique").on(table.key),
    index("attribute_definitions_position_idx").on(table.position),
  ],
);

// One row per (product, definition, value). A multi_select attribute stores one
// row per selected value; all other types store a single row.
export const productAttributeValues = pgTable(
  "product_attribute_values",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    definitionId: uuid("definition_id")
      .notNull()
      .references(() => attributeDefinitions.id, { onDelete: "cascade" }),
    // Canonical text representation of the value (works for every type).
    value: text("value").notNull(),
    // Parsed numeric form, populated only for `number` definitions so the value
    // can drive range filters and numeric sorts.
    valueNumber: real("value_number"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("product_attribute_values_product_id_idx").on(table.productId),
    index("product_attribute_values_definition_id_idx").on(table.definitionId),
    uniqueIndex("product_attribute_values_unique").on(
      table.productId,
      table.definitionId,
      table.value,
    ),
  ],
);
