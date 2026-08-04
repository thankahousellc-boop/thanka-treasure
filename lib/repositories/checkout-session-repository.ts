import { createHash } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { pendingCheckoutSessions } from "@/db/schema";
import { reservationRepository } from "@/lib/repositories/reservation-repository";

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

  // Records the pending session and holds stock for it. Stock holding lives in
  // the reservation repository; this repository owns session identity only.
  // Returns null when any item lacks stock, with nothing reserved.
  async createSession(input: {
    stripeSessionId: string;
    cartSignature: string;
    currency: string;
    expiresAt: Date;
    items: ReservedItem[];
  }): Promise<PendingRow | null> {
    const reserved = await reservationRepository.createForSession({
      stripeSessionId: input.stripeSessionId,
      items: input.items,
    });

    if (!reserved) {
      return null;
    }

    const db = getDb();
    const [row] = await db
      .insert(pendingCheckoutSessions)
      .values({
        stripeCheckoutSessionId: input.stripeSessionId,
        cartSignature: input.cartSignature,
        currency: input.currency.toUpperCase(),
        // Superseded by checkout_reservations; written as [] until the column
        // is dropped in the follow-up migration.
        reservedItems: [],
        status: "open",
        expiresAt: input.expiresAt,
        updatedAt: new Date(),
      })
      .returning();

    if (!row) {
      await reservationRepository.releaseSession(input.stripeSessionId);
      return null;
    }

    return row;
  },

  // Flips the session row to `released` and returns its stock early. Idempotent:
  // a row already released or completed returns false and touches nothing, so
  // the replace path, the beacon, and the webhook can never conflict.
  async releaseByRow(rowId: string): Promise<boolean> {
    const db = getDb();

    const [row] = await db
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

    await reservationRepository.releaseSession(row.stripeCheckoutSessionId);
    return true;
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
  // cannot release stock that was already sold.
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

    await reservationRepository.confirmSession(stripeSessionId);
  },
};
