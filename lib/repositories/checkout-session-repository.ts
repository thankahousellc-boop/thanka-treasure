import { createHash } from "node:crypto";

import { and, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { inventory, pendingCheckoutSessions } from "@/db/schema";

export type ReservedItem = {
  variantId: string;
  quantity: number;
};

type SignatureItem = {
  variantId: string;
  quantity: number;
  frameId?: string | null;
};

type SignatureInput = {
  currency: string;
  discountCode: string | null;
  items: SignatureItem[];
};

type PendingRow = typeof pendingCheckoutSessions.$inferSelect;

// Deterministic hash of the resolved cart so a reload with the identical cart,
// currency and discount maps to the same pending session. Items are sorted so
// ordering never changes the signature.
function computeCartSignature(input: SignatureInput) {
  const normalizedItems = [...input.items]
    .map(
      (item) =>
        `${item.variantId}:${item.frameId ?? "none"}:${item.quantity}`,
    )
    .sort();

  const payload = JSON.stringify({
    currency: input.currency.toUpperCase(),
    discountCode: input.discountCode?.toUpperCase() ?? null,
    items: normalizedItems,
  });

  return createHash("sha256").update(payload).digest("hex");
}

export const checkoutSessionRepository = {
  computeCartSignature,

  // Returns the open (unpaid, unexpired) pending row for a Stripe session, or
  // null. Used to decide whether a reload can reuse the existing reservation.
  async findOpenBySessionId(stripeSessionId: string): Promise<PendingRow | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(pendingCheckoutSessions)
      .where(
        and(
          eq(
            pendingCheckoutSessions.stripeCheckoutSessionId,
            stripeSessionId,
          ),
          eq(pendingCheckoutSessions.status, "open"),
        ),
      )
      .limit(1);

    return row ?? null;
  },

  // Reserves every item and records the pending row in one transaction. If any
  // item lacks stock the whole transaction rolls back (nothing reserved) and
  // null is returned so the caller can surface an out-of-stock error.
  async createWithReservation(input: {
    stripeSessionId: string;
    cartSignature: string;
    currency: string;
    expiresAt: Date;
    items: ReservedItem[];
  }): Promise<PendingRow | null> {
    const db = getDb();

    try {
      return await db.transaction(async (tx) => {
        for (const item of input.items) {
          const reserved = await tx
            .update(inventory)
            .set({
              reservedQuantity: sql`${inventory.reservedQuantity} + ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(inventory.variantId, item.variantId),
                gte(
                  sql`${inventory.quantity} - ${inventory.reservedQuantity}`,
                  item.quantity,
                ),
              ),
            )
            .returning({ id: inventory.id });

          // No inventory row at all = untracked variant; treat as unlimited and
          // skip reserving it (matches the route's existing behaviour). A row
          // that exists but lacks stock returns zero updates → abort.
          if (reserved.length === 0) {
            const [exists] = await tx
              .select({ id: inventory.id })
              .from(inventory)
              .where(eq(inventory.variantId, item.variantId))
              .limit(1);

            if (exists) {
              throw new InsufficientStockError(item.variantId);
            }
          }
        }

        const reservedItems = input.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        }));

        const [row] = await tx
          .insert(pendingCheckoutSessions)
          .values({
            stripeCheckoutSessionId: input.stripeSessionId,
            cartSignature: input.cartSignature,
            currency: input.currency.toUpperCase(),
            reservedItems,
            status: "open",
            expiresAt: input.expiresAt,
            updatedAt: new Date(),
          })
          .returning();

        return row ?? null;
      });
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return null;
      }
      throw error;
    }
  },

  // Returns reserved stock and flips the row to `released`. Idempotent: a row
  // already released/completed returns false and touches no inventory, so the
  // replace path and the webhook can never double-release.
  async releaseByRow(rowId: string): Promise<boolean> {
    const db = getDb();

    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(pendingCheckoutSessions)
        .set({ status: "released", updatedAt: new Date() })
        .where(
          and(
            eq(pendingCheckoutSessions.id, rowId),
            eq(pendingCheckoutSessions.status, "open"),
          ),
        )
        .returning();

      if (!row) {
        return false;
      }

      const reservedItems = (row.reservedItems as ReservedItem[]) ?? [];
      for (const item of reservedItems) {
        await tx
          .update(inventory)
          .set({
            reservedQuantity: sql`greatest(${inventory.reservedQuantity} - ${item.quantity}, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(inventory.variantId, item.variantId));
      }

      return true;
    });
  },

  // Same as releaseByRow but keyed by Stripe session id (webhook path).
  async releaseBySessionId(stripeSessionId: string): Promise<boolean> {
    const row = await this.findOpenBySessionId(stripeSessionId);
    if (!row) {
      return false;
    }
    return this.releaseByRow(row.id);
  },

  // Marks the row completed on successful payment so a late `expired` webhook
  // cannot release stock that was already confirmed.
  async markCompletedBySessionId(stripeSessionId: string): Promise<void> {
    const db = getDb();
    await db
      .update(pendingCheckoutSessions)
      .set({ status: "completed", updatedAt: new Date() })
      .where(
        eq(
          pendingCheckoutSessions.stripeCheckoutSessionId,
          stripeSessionId,
        ),
      );
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
