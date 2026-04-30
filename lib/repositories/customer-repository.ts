import { and, desc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { addresses, customers } from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

type UpsertCustomerInput = {
  email: string;
  profileId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
};

type ListForAdminInput = {
  query?: string;
  limit?: number;
};

function buildAdminFilters(input: ListForAdminInput) {
  const filters = [isNull(customers.deletedAt)];

  if (input.query && input.query.trim().length > 0) {
    const needle = `%${input.query.trim()}%`;
    filters.push(
      or(
        ilike(customers.email, needle),
        ilike(customers.firstName, needle),
        ilike(customers.lastName, needle),
      )!,
    );
  }

  return filters;
}

export const customerRepository = {
  async findByProfileId(profileId: string) {
    const db = getDb();
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.profileId, profileId))
      .limit(1);

    return customer ?? null;
  },

  async listAddressesByProfileId(profileId: string, limit = 20) {
    const db = getDb();
    const boundedLimit = Math.min(Math.max(limit, 1), 100);

    return db
      .select({
        id: addresses.id,
        type: addresses.type,
        isDefault: addresses.isDefault,
        firstName: addresses.firstName,
        lastName: addresses.lastName,
        company: addresses.company,
        addressLine1: addresses.addressLine1,
        addressLine2: addresses.addressLine2,
        city: addresses.city,
        province: addresses.province,
        postalCode: addresses.postalCode,
        countryCode: addresses.countryCode,
        phone: addresses.phone,
        createdAt: addresses.createdAt,
      })
      .from(addresses)
      .innerJoin(customers, eq(customers.id, addresses.customerId))
      .where(
        and(eq(customers.profileId, profileId), isNull(customers.deletedAt)),
      )
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt))
      .limit(boundedLimit);
  },

  async upsertByEmail(input: UpsertCustomerInput) {
    const db = getDb();

    await db
      .insert(customers)
      .values({
        email: input.email,
        profileId: input.profileId ?? null,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        phone: input.phone ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: customers.email,
        set: {
          profileId: input.profileId ?? null,
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          phone: input.phone ?? null,
          updatedAt: new Date(),
        },
      });
  },

  async listForAdmin(input: ListForAdminInput = {}) {
    await requireAdminSession();

    const db = getDb();
    const filters = buildAdminFilters(input);
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 250);

    return db
      .select({
        id: customers.id,
        email: customers.email,
        firstName: customers.firstName,
        lastName: customers.lastName,
        phone: customers.phone,
        totalOrders: customers.totalOrders,
        totalSpent: customers.totalSpent,
        acceptsMarketing: customers.acceptsMarketing,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(and(...filters))
      .orderBy(desc(customers.totalSpent), desc(customers.createdAt))
      .limit(limit);
  },

  async getAdminStats() {
    await requireAdminSession();

    const db = getDb();

    const [totalRow, repeatRow, marketingRow, highValueRow] = await Promise.all(
      [
        db
          .select({ total: sql<number>`count(*)` })
          .from(customers)
          .where(isNull(customers.deletedAt))
          .then((rows) => rows[0]),
        db
          .select({ total: sql<number>`count(*)` })
          .from(customers)
          .where(
            and(isNull(customers.deletedAt), gte(customers.totalOrders, 2)),
          )
          .then((rows) => rows[0]),
        db
          .select({ total: sql<number>`count(*)` })
          .from(customers)
          .where(
            and(
              isNull(customers.deletedAt),
              eq(customers.acceptsMarketing, true),
            ),
          )
          .then((rows) => rows[0]),
        db
          .select({ total: sql<number>`count(*)` })
          .from(customers)
          .where(
            and(isNull(customers.deletedAt), gte(customers.totalSpent, 50_000)),
          )
          .then((rows) => rows[0]),
      ],
    );

    return {
      total: Number(totalRow?.total ?? 0),
      repeatCustomers: Number(repeatRow?.total ?? 0),
      marketingOptIns: Number(marketingRow?.total ?? 0),
      highValueCustomers: Number(highValueRow?.total ?? 0),
    };
  },
};
