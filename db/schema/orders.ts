import {
  boolean,
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
import { productVariants } from "./products";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    totalOrders: integer("total_orders").notNull().default(0),
    totalSpent: integer("total_spent").notNull().default(0),
    notes: text("notes"),
    acceptsMarketing: boolean("accepts_marketing").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("customers_email_unique").on(table.email),
    uniqueIndex("customers_profile_id_unique").on(table.profileId),
  ],
);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("shipping"),
    isDefault: boolean("is_default").notNull().default(false),
    firstName: text("first_name"),
    lastName: text("last_name"),
    company: text("company"),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    province: text("province"),
    postalCode: text("postal_code"),
    countryCode: text("country_code").notNull(),
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("addresses_customer_id_idx").on(table.customerId)],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: text("order_number").notNull(),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    status: text("status").notNull().default("pending"),
    paymentStatus: text("payment_status").notNull().default("pending"),
    fulfillmentStatus: text("fulfillment_status")
      .notNull()
      .default("unfulfilled"),
    // Sales channel: "online" (website Stripe checkout) or "in_store" (POS).
    source: text("source").notNull().default("online"),
    // Recorded for in-store sales: cash | card | other.
    paymentMethod: text("payment_method"),
    currency: text("currency").notNull().default("USD"),
    subtotal: integer("subtotal").notNull(),
    taxTotal: integer("tax_total").notNull().default(0),
    shippingTotal: integer("shipping_total").notNull().default(0),
    discountTotal: integer("discount_total").notNull().default(0),
    grandTotal: integer("grand_total").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    shippingAddress: jsonb("shipping_address"),
    billingAddress: jsonb("billing_address"),
    notes: text("notes"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("orders_order_number_unique").on(table.orderNumber),
    uniqueIndex("orders_stripe_checkout_session_id_unique").on(
      table.stripeCheckoutSessionId,
    ),
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_status_idx").on(table.status),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    productTitle: text("product_title").notNull(),
    variantTitle: text("variant_title"),
    sku: text("sku"),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    totalPrice: integer("total_price").notNull(),
    frameSnapshot: jsonb("frame_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)],
);

// Tracks the inventory reserved by a live (unpaid) Stripe Checkout session so a
// reload of /checkout reuses the same session instead of reserving stock again.
// `status` is the single source of truth for whether the reservation is still
// held — it makes release idempotent across the replace path and the webhook.
export const pendingCheckoutSessions = pgTable(
  "pending_checkout_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").notNull(),
    // Deterministic hash of the resolved cart (variant+frame+qty), currency and
    // discount. A reload with the same signature reuses the session.
    cartSignature: text("cart_signature").notNull(),
    currency: text("currency").notNull(),
    // [{ variantId, quantity }] — exactly what was reserved, so release is exact.
    reservedItems: jsonb("reserved_items").notNull().default([]),
    // open = reservation held, released = returned to stock, completed = paid.
    status: text("status").notNull().default("open"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("pending_checkout_sessions_stripe_session_id_unique").on(
      table.stripeCheckoutSessionId,
    ),
    index("pending_checkout_sessions_status_idx").on(table.status),
  ],
);

export const discounts = pgTable(
  "discounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    type: text("type").notNull(),
    value: integer("value").notNull(),
    minimumOrderAmount: integer("minimum_order_amount"),
    usageLimit: integer("usage_limit"),
    usageCount: integer("usage_count").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    appliesTo: jsonb("applies_to").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("discounts_code_unique").on(table.code)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    description: text("description").notNull(),
    actor: text("actor"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("order_events_order_id_idx").on(table.orderId)],
);
