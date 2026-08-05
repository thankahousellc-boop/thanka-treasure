import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  contactSubmissions,
  newsletterSubscribers,
  orderEvents,
  orderItems,
  orders,
  products,
  productVariants,
  variantAvailability,
} from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DashboardBadges = {
  ordersToFulfill: number;
  messages: number;
  subscribers: number;
  lowStock: number;
};

export type DashboardKpi = {
  revenueCents: number;
  paidOrderCount: number;
  averageOrderValueCents: number;
  newCustomerOrderCount: number;
  revenueDeltaPercent: number | null;
};

export type FulfillmentRow = {
  id: string;
  orderNumber: string;
  email: string;
  grandTotal: number;
  currency: string;
  createdAt: Date;
  fulfillmentStatus: string;
};

export type LowStockRow = {
  variantId: string;
  variantTitle: string;
  productTitle: string;
  productId: string | null;
  available: number;
  threshold: number;
};

export type CatalogSummary = {
  activeProducts: number;
  totalProducts: number;
  outOfStock: number;
};

export type RecentActivityRow = {
  id: string;
  description: string;
  eventType: string;
  actor: string | null;
  createdAt: Date;
  orderId: string;
  orderNumber: string;
};

export const adminDashboardRepository = {
  async getBadges(): Promise<DashboardBadges> {
    await requireAdminSession();
    const db = getDb();

    const [ordersRow, messagesRow, subsRow, lowStockRow] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)` })
        .from(orders)
        .where(
          and(
            eq(orders.paymentStatus, "paid"),
            inArray(orders.fulfillmentStatus, ["unfulfilled", "partial"]),
            isNull(orders.deletedAt),
          ),
        )
        .then((rows) => rows[0]),
      db
        .select({ total: sql<number>`count(*)` })
        .from(contactSubmissions)
        .where(eq(contactSubmissions.status, "new"))
        .then((rows) => rows[0]),
      db
        .select({ total: sql<number>`count(*)` })
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.status, "active"))
        .then((rows) => rows[0]),
      db
        .select({ total: sql<number>`count(*)` })
        .from(variantAvailability)
        .where(
          sql`${variantAvailability.availableQuantity} <= ${variantAvailability.lowStockThreshold}`,
        )
        .then((rows) => rows[0]),
    ]);

    return {
      ordersToFulfill: Number(ordersRow?.total ?? 0),
      messages: Number(messagesRow?.total ?? 0),
      subscribers: Number(subsRow?.total ?? 0),
      lowStock: Number(lowStockRow?.total ?? 0),
    };
  },

  async getCatalogSummary(): Promise<CatalogSummary> {
    await requireAdminSession();
    const db = getDb();

    const [activeRow, totalRow, outOfStockRow] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)` })
        .from(products)
        .where(
          and(eq(products.status, "active"), isNull(products.deletedAt)),
        )
        .then((rows) => rows[0]),
      db
        .select({ total: sql<number>`count(*)` })
        .from(products)
        .where(isNull(products.deletedAt))
        .then((rows) => rows[0]),
      db
        .select({ total: sql<number>`count(*)` })
        .from(variantAvailability)
        .where(sql`${variantAvailability.availableQuantity} <= 0`)
        .then((rows) => rows[0]),
    ]);

    return {
      activeProducts: Number(activeRow?.total ?? 0),
      totalProducts: Number(totalRow?.total ?? 0),
      outOfStock: Number(outOfStockRow?.total ?? 0),
    };
  },

  async getKpis(days = 30): Promise<DashboardKpi> {
    await requireAdminSession();
    const db = getDb();
    const now = new Date();
    const from = new Date(now.getTime() - days * DAY_MS);
    const previousFrom = new Date(from.getTime() - days * DAY_MS);

    const [currentRow, previousRow, repeatRow] = await Promise.all([
      db
        .select({
          revenue: sql<number>`coalesce(sum(${orders.grandTotal}), 0)`,
          orderCount: sql<number>`count(*)`,
        })
        .from(orders)
        .where(
          and(eq(orders.paymentStatus, "paid"), gte(orders.createdAt, from)),
        )
        .then((rows) => rows[0]),
      db
        .select({
          revenue: sql<number>`coalesce(sum(${orders.grandTotal}), 0)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.paymentStatus, "paid"),
            gte(orders.createdAt, previousFrom),
            lt(orders.createdAt, from),
          ),
        )
        .then((rows) => rows[0]),
      db
        .select({
          total: sql<number>`count(distinct ${orders.customerId})`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.paymentStatus, "paid"),
            gte(orders.createdAt, from),
            isNotNull(orders.customerId),
          ),
        )
        .then((rows) => rows[0]),
    ]);

    const revenue = Number(currentRow?.revenue ?? 0);
    const previous = Number(previousRow?.revenue ?? 0);
    const orderCount = Number(currentRow?.orderCount ?? 0);
    const distinctCustomers = Number(repeatRow?.total ?? 0);

    let revenueDelta: number | null = null;
    if (previous > 0) {
      revenueDelta = Math.round(((revenue - previous) / previous) * 1000) / 10;
    } else if (revenue > 0) {
      revenueDelta = null;
    }

    return {
      revenueCents: revenue,
      paidOrderCount: orderCount,
      averageOrderValueCents:
        orderCount > 0 ? Math.round(revenue / orderCount) : 0,
      newCustomerOrderCount: distinctCustomers,
      revenueDeltaPercent: revenueDelta,
    };
  },

  async getOrdersToFulfill(limit = 6): Promise<FulfillmentRow[]> {
    await requireAdminSession();
    const db = getDb();

    return db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        email: orders.email,
        grandTotal: orders.grandTotal,
        currency: orders.currency,
        createdAt: orders.createdAt,
        fulfillmentStatus: orders.fulfillmentStatus,
      })
      .from(orders)
      .where(
        and(
          eq(orders.paymentStatus, "paid"),
          inArray(orders.fulfillmentStatus, ["unfulfilled", "partial"]),
          isNull(orders.deletedAt),
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  },

  async getLowStock(limit = 6): Promise<LowStockRow[]> {
    await requireAdminSession();
    const db = getDb();

    return db
      .select({
        variantId: variantAvailability.variantId,
        variantTitle: productVariants.title,
        productTitle: sql<string>`coalesce(${productVariants.title}, '')`,
        productId: productVariants.productId,
        available: variantAvailability.availableQuantity,
        threshold: variantAvailability.lowStockThreshold,
      })
      .from(variantAvailability)
      .innerJoin(
        productVariants,
        eq(productVariants.id, variantAvailability.variantId),
      )
      .where(
        sql`${variantAvailability.availableQuantity} <= ${variantAvailability.lowStockThreshold}`,
      )
      .orderBy(variantAvailability.availableQuantity)
      .limit(limit);
  },

  async getRecentActivity(limit = 8): Promise<RecentActivityRow[]> {
    await requireAdminSession();
    const db = getDb();

    return db
      .select({
        id: orderEvents.id,
        description: orderEvents.description,
        eventType: orderEvents.eventType,
        actor: orderEvents.actor,
        createdAt: orderEvents.createdAt,
        orderId: orders.id,
        orderNumber: orders.orderNumber,
      })
      .from(orderEvents)
      .innerJoin(orders, eq(orders.id, orderEvents.orderId))
      .orderBy(desc(orderEvents.createdAt))
      .limit(limit);
  },

  async getRevenueTrend(days = 30) {
    await requireAdminSession();
    const db = getDb();
    const from = new Date(Date.now() - days * DAY_MS);

    const rows = await db
      .select({
        bucket: sql<string>`to_char(${orders.createdAt}::date, 'YYYY-MM-DD')`,
        revenue: sql<number>`coalesce(sum(${orders.grandTotal}), 0)`,
      })
      .from(orders)
      .where(
        and(eq(orders.paymentStatus, "paid"), gte(orders.createdAt, from)),
      )
      .groupBy(sql`${orders.createdAt}::date`)
      .orderBy(sql`${orders.createdAt}::date`);

    return rows.map((row) => ({
      date: row.bucket,
      revenue: Number(row.revenue),
    }));
  },

  async getTopProducts(days = 30, limit = 5) {
    await requireAdminSession();
    const db = getDb();
    const from = new Date(Date.now() - days * DAY_MS);

    return db
      .select({
        title: orderItems.productTitle,
        quantitySold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
        revenue: sql<number>`coalesce(sum(${orderItems.totalPrice}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(eq(orders.paymentStatus, "paid"), gte(orders.createdAt, from)),
      )
      .groupBy(orderItems.productTitle)
      .orderBy(desc(sql`coalesce(sum(${orderItems.totalPrice}), 0)`))
      .limit(limit);
  },
};
