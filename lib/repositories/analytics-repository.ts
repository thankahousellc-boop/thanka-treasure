import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  blogPosts,
  contactSubmissions,
  newsletterSubscribers,
  orderItems,
  orders,
  variantAvailability,
} from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

type TopProductRow = {
  title: string;
  quantitySold: number;
  revenue: number;
};

type TopBlogPostRow = {
  title: string;
  slug: string;
  publishedAt: Date | null;
  viewCount: number;
};

type ConversionMetrics = {
  totalOrderCount: number;
  paidOrderCount: number;
  checkoutToPaidRate: number;
  paidToFulfilledRate: number;
  paidToDeliveredRate: number;
  paidToRefundedRate: number;
};

function toPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 1000) / 10;
}

export const analyticsRepository = {
  async getOverview(days = 30) {
    await requireAdminSession();

    const db = getDb();
    const now = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      paidOrdersRow,
      blogOverviewRow,
      messagesRow,
      subscribersRow,
      lowStockRow,
      topProducts,
      conversionRow,
      topBlogPosts,
    ] = await Promise.all([
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
          publishedPostCount: sql<number>`count(*)`,
          totalViews: sql<number>`coalesce(sum(${blogPosts.viewCount}), 0)`,
          publishedInWindowCount: sql<number>`count(*) filter (where ${blogPosts.publishedAt} >= ${from})`,
        })
        .from(blogPosts)
        .where(
          and(
            eq(blogPosts.status, "published"),
            lte(blogPosts.publishedAt, now),
          ),
        )
        .then((rows) => rows[0]),
      db
        .select({ total: sql<number>`count(*)` })
        .from(contactSubmissions)
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
      db
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
        .limit(5),
      db
        .select({
          totalOrders: sql<number>`count(*)`,
          paidOrders: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'paid')`,
          refundedOrders: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'refunded')`,
          fulfilledOrders: sql<number>`count(*) filter (where ${orders.fulfillmentStatus} = 'fulfilled' or ${orders.status} in ('shipped', 'delivered'))`,
          deliveredOrders: sql<number>`count(*) filter (where ${orders.status} = 'delivered')`,
        })
        .from(orders)
        .where(gte(orders.createdAt, from))
        .then((rows) => rows[0]),
      db
        .select({
          title: blogPosts.title,
          slug: blogPosts.slug,
          publishedAt: blogPosts.publishedAt,
          viewCount: blogPosts.viewCount,
        })
        .from(blogPosts)
        .where(
          and(
            eq(blogPosts.status, "published"),
            lte(blogPosts.publishedAt, now),
          ),
        )
        .orderBy(desc(blogPosts.viewCount), desc(blogPosts.publishedAt))
        .limit(5),
    ]);

    const revenue = Number(paidOrdersRow?.revenue ?? 0);
    const orderCount = Number(paidOrdersRow?.orderCount ?? 0);
    const totalOrderCount = Number(conversionRow?.totalOrders ?? 0);
    const paidOrderCount = Number(conversionRow?.paidOrders ?? 0);
    const refundedOrderCount = Number(conversionRow?.refundedOrders ?? 0);
    const fulfilledOrderCount = Number(conversionRow?.fulfilledOrders ?? 0);
    const deliveredOrderCount = Number(conversionRow?.deliveredOrders ?? 0);

    const conversion: ConversionMetrics = {
      totalOrderCount,
      paidOrderCount,
      checkoutToPaidRate: toPercent(paidOrderCount, totalOrderCount),
      paidToFulfilledRate: toPercent(fulfilledOrderCount, paidOrderCount),
      paidToDeliveredRate: toPercent(deliveredOrderCount, paidOrderCount),
      paidToRefundedRate: toPercent(refundedOrderCount, paidOrderCount),
    };

    const publishedPostCount = Number(blogOverviewRow?.publishedPostCount ?? 0);
    const totalBlogViews = Number(blogOverviewRow?.totalViews ?? 0);

    return {
      windowDays: days,
      revenue,
      orderCount,
      averageOrderValue: orderCount > 0 ? Math.round(revenue / orderCount) : 0,
      publishedPostCount,
      messageCount: Number(messagesRow?.total ?? 0),
      activeSubscriberCount: Number(subscribersRow?.total ?? 0),
      lowStockVariantCount: Number(lowStockRow?.total ?? 0),
      topProducts: topProducts.map(
        (row): TopProductRow => ({
          title: row.title,
          quantitySold: Number(row.quantitySold),
          revenue: Number(row.revenue),
        }),
      ),
      conversion,
      blog: {
        totalViews: totalBlogViews,
        averageViewsPerPost:
          publishedPostCount > 0
            ? Math.round((totalBlogViews / publishedPostCount) * 10) / 10
            : 0,
        publishedInWindowCount: Number(
          blogOverviewRow?.publishedInWindowCount ?? 0,
        ),
        topPosts: topBlogPosts.map(
          (row): TopBlogPostRow => ({
            title: row.title,
            slug: row.slug,
            publishedAt: row.publishedAt,
            viewCount: Number(row.viewCount),
          }),
        ),
      },
    };
  },
};
