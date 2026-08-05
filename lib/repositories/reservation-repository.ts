import { and, eq, gt, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { checkoutReservations } from "@/db/schema/orders";
import {
  RESERVATION_STATUS,
  RESERVATION_TTL_MS,
} from "@/lib/checkout/reservation-config";

export type ReservationItem = {
  variantId: string;
  quantity: number;
};

export const reservationRepository = {
  /**
   * Holds every item for one checkout session, or nothing at all.
   *
   * A view cannot be locked, so availability is not read from
   * `variant_availability` here: two concurrent checkouts would both see the
   * last unit as free. Each item takes a `FOR UPDATE` lock on its `inventory`
   * row first, which serialises every reservation attempt for that variant.
   * Items are locked in sorted variantId order so two multi-item carts can
   * never deadlock by taking the same locks in opposite order.
   *
   * A variant with no `inventory` row is untracked stock and is treated as
   * unlimited, matching the behaviour this replaces.
   */
  async createForSession(input: {
    stripeSessionId: string;
    items: ReservationItem[];
    ttlMs?: number;
  }): Promise<boolean> {
    const db = getDb();
    const ttlMs = input.ttlMs ?? RESERVATION_TTL_MS;
    const expiresAt = new Date(Date.now() + ttlMs);

    const ordered = [...input.items].sort((a, b) =>
      a.variantId.localeCompare(b.variantId),
    );

    try {
      await db.transaction(async (tx) => {
        for (const item of ordered) {
          const locked = await tx.execute<{ quantity: number }>(
            sql`select quantity from inventory where variant_id = ${item.variantId} for update`,
          );

          // No inventory row = untracked variant, unlimited stock. Skip it.
          if (locked.length === 0) {
            continue;
          }

          const reservedRows = await tx.execute<{ reserved: number }>(
            sql`select coalesce(sum(quantity), 0)::int as reserved
                from ${checkoutReservations}
                where variant_id = ${item.variantId}
                  and status = ${RESERVATION_STATUS.OPEN}
                  and expires_at > now()`,
          );

          const quantity = Number(locked[0]?.quantity ?? 0);
          const reserved = Number(reservedRows[0]?.reserved ?? 0);

          if (quantity - reserved < item.quantity) {
            throw new InsufficientStockError(item.variantId);
          }

          await tx.insert(checkoutReservations).values({
            stripeSessionId: input.stripeSessionId,
            variantId: item.variantId,
            quantity: item.quantity,
            status: RESERVATION_STATUS.OPEN,
            expiresAt,
          });
        }
      });

      return true;
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return false;
      }
      throw error;
    }
  },

  /** Pushes the hold forward. Returns 0 when the session has no live rows. */
  async extendSession(
    stripeSessionId: string,
    ttlMs = RESERVATION_TTL_MS,
  ): Promise<number> {
    const db = getDb();
    const expiresAt = new Date(Date.now() + ttlMs);

    const rows = await db
      .update(checkoutReservations)
      .set({ expiresAt, updatedAt: new Date() })
      .where(
        and(
          eq(checkoutReservations.stripeSessionId, stripeSessionId),
          eq(checkoutReservations.status, RESERVATION_STATUS.OPEN),
        ),
      )
      .returning({ id: checkoutReservations.id });

    return rows.length;
  },

  /** Returns stock early. Idempotent: already-settled rows are untouched. */
  async releaseSession(stripeSessionId: string): Promise<number> {
    const db = getDb();

    const rows = await db
      .update(checkoutReservations)
      .set({ status: RESERVATION_STATUS.RELEASED, updatedAt: new Date() })
      .where(
        and(
          eq(checkoutReservations.stripeSessionId, stripeSessionId),
          eq(checkoutReservations.status, RESERVATION_STATUS.OPEN),
        ),
      )
      .returning({ id: checkoutReservations.id });

    return rows.length;
  },

  /**
   * Marks a paid session's rows confirmed so a late `expired` webhook cannot
   * release stock that has already been sold. Idempotent.
   */
  async confirmSession(stripeSessionId: string): Promise<number> {
    const db = getDb();

    const rows = await db
      .update(checkoutReservations)
      .set({ status: RESERVATION_STATUS.CONFIRMED, updatedAt: new Date() })
      .where(
        and(
          eq(checkoutReservations.stripeSessionId, stripeSessionId),
          eq(checkoutReservations.status, RESERVATION_STATUS.OPEN),
        ),
      )
      .returning({ id: checkoutReservations.id });

    return rows.length;
  },

  /** Batched live sums. Variants with no live hold are absent from the map. */
  async getReservedForVariants(
    variantIds: string[],
  ): Promise<Map<string, number>> {
    if (variantIds.length === 0) {
      return new Map();
    }

    const db = getDb();

    const rows = await db
      .select({
        variantId: checkoutReservations.variantId,
        reserved: sql<number>`coalesce(sum(${checkoutReservations.quantity}), 0)::int`,
      })
      .from(checkoutReservations)
      .where(
        and(
          inArray(checkoutReservations.variantId, variantIds),
          eq(checkoutReservations.status, RESERVATION_STATUS.OPEN),
          gt(checkoutReservations.expiresAt, new Date()),
        ),
      )
      .groupBy(checkoutReservations.variantId);

    return new Map(rows.map((row) => [row.variantId, Number(row.reserved)]));
  },
};

class InsufficientStockError extends Error {
  variantId: string;

  constructor(variantId: string) {
    super(`Insufficient stock for variant ${variantId}.`);
    this.name = "InsufficientStockError";
    this.variantId = variantId;
  }
}
