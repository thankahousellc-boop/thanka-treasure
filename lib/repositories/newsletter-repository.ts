import { and, desc, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

type SubscribeInput = {
  email: string;
  source: "footer" | "popup" | "checkout" | "manual";
};

type SubscriberStatus = "active" | "unsubscribed";

export const newsletterRepository = {
  async subscribe(input: SubscribeInput) {
    const db = getDb();

    await db
      .insert(newsletterSubscribers)
      .values({
        email: input.email,
        source: input.source,
        status: "active",
        unsubscribedAt: null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: newsletterSubscribers.email,
        set: {
          source: input.source,
          status: "active",
          unsubscribedAt: null,
          updatedAt: new Date(),
        },
      });
  },

  async listForAdmin(limit = 250) {
    await requireAdminSession();

    const db = getDb();

    return db
      .select({
        id: newsletterSubscribers.id,
        email: newsletterSubscribers.email,
        status: newsletterSubscribers.status,
        source: newsletterSubscribers.source,
        subscribedAt: newsletterSubscribers.subscribedAt,
        unsubscribedAt: newsletterSubscribers.unsubscribedAt,
      })
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.subscribedAt))
      .limit(limit);
  },

  async setStatusByEmail(email: string, status: SubscriberStatus) {
    await requireAdminSession();

    const db = getDb();

    const updatedRows = await db
      .update(newsletterSubscribers)
      .set({
        status,
        unsubscribedAt: status === "unsubscribed" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(newsletterSubscribers.email, email))
      .returning({ id: newsletterSubscribers.id });

    return updatedRows.length > 0;
  },

  async listForExport(limit = 10_000) {
    await requireAdminSession();

    const db = getDb();

    return db
      .select({
        email: newsletterSubscribers.email,
        status: newsletterSubscribers.status,
        source: newsletterSubscribers.source,
        subscribedAt: newsletterSubscribers.subscribedAt,
        unsubscribedAt: newsletterSubscribers.unsubscribedAt,
      })
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.subscribedAt))
      .limit(limit);
  },

  async listActive(limit = 10_000) {
    const db = getDb();

    return db
      .select({
        id: newsletterSubscribers.id,
        email: newsletterSubscribers.email,
        subscribedAt: newsletterSubscribers.subscribedAt,
      })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.status, "active"))
      .orderBy(desc(newsletterSubscribers.subscribedAt))
      .limit(limit);
  },

  async getAdminStats() {
    await requireAdminSession();

    const db = getDb();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalRow, activeRow, recentRow] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)` })
        .from(newsletterSubscribers)
        .then((rows) => rows[0]),
      db
        .select({ total: sql<number>`count(*)` })
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.status, "active"))
        .then((rows) => rows[0]),
      db
        .select({ total: sql<number>`count(*)` })
        .from(newsletterSubscribers)
        .where(
          and(
            eq(newsletterSubscribers.status, "active"),
            gte(newsletterSubscribers.subscribedAt, thirtyDaysAgo),
          ),
        )
        .then((rows) => rows[0]),
    ]);

    return {
      total: Number(totalRow?.total ?? 0),
      activeCount: Number(activeRow?.total ?? 0),
      newLast30Days: Number(recentRow?.total ?? 0),
    };
  },
};
