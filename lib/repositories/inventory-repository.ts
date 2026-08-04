import { and, asc, eq, gte, ilike, inArray, isNull, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { inventory, productImages, products, productVariants } from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";
import { resolveUrl } from "@/lib/storage/resolve-url";

function normalizeInventoryValue(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export const inventoryRepository = {
  async listVariantInventoryForAdmin(input?: {
    query?: string;
    limit?: number;
  }) {
    await requireAdminSession();

    const db = getDb();
    const query = input?.query?.trim();
    const limit = Math.min(Math.max(input?.limit ?? 250, 1), 500);

    const quantityExpr = sql<number>`coalesce(${inventory.quantity}, 0)`;
    const reservedQuantityExpr = sql<number>`coalesce(${inventory.reservedQuantity}, 0)`;
    const lowStockThresholdExpr = sql<number>`coalesce(${inventory.lowStockThreshold}, 5)`;
    const availableQuantityExpr = sql<number>`coalesce(${inventory.quantity}, 0) - coalesce(${inventory.reservedQuantity}, 0)`;

    const rows = await db
      .select({
        productId: products.id,
        productTitle: products.title,
        productSlug: products.slug,
        productStatus: products.status,
        variantId: productVariants.id,
        variantTitle: productVariants.title,
        sku: productVariants.sku,
        quantity: quantityExpr,
        reservedQuantity: reservedQuantityExpr,
        lowStockThreshold: lowStockThresholdExpr,
        availableQuantity: availableQuantityExpr,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
      .where(
        and(
          isNull(products.deletedAt),
          query
            ? or(
                ilike(products.title, `%${query}%`),
                ilike(products.slug, `%${query}%`),
                ilike(productVariants.title, `%${query}%`),
                ilike(productVariants.sku, `%${query}%`),
              )
            : undefined,
        ),
      )
      .orderBy(
        asc(availableQuantityExpr),
        asc(lowStockThresholdExpr),
        asc(products.title),
        asc(productVariants.title),
      )
      .limit(limit);

    const productIds = [...new Set(rows.map((row) => row.productId))];
    const imageRows = productIds.length
      ? await db
          .select({
            productId: productImages.productId,
            variantId: productImages.variantId,
            bucket: productImages.bucket,
            path: productImages.path,
            position: productImages.position,
          })
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
          .orderBy(asc(productImages.position))
      : [];

    // First image per product (fallback) and per variant (preferred).
    const productImage = new Map<string, { bucket: string; path: string }>();
    const variantImage = new Map<string, { bucket: string; path: string }>();
    for (const img of imageRows) {
      const ref = { bucket: img.bucket, path: img.path };
      if (!productImage.has(img.productId)) productImage.set(img.productId, ref);
      if (img.variantId && !variantImage.has(img.variantId)) {
        variantImage.set(img.variantId, ref);
      }
    }

    return rows.map((row) => {
      const ref = variantImage.get(row.variantId) ?? productImage.get(row.productId) ?? null;
      return { ...row, imageUrl: resolveUrl(ref) };
    });
  },

  async upsertVariantInventoryForAdmin(input: {
    variantId: string;
    quantity: number;
    lowStockThreshold: number;
  }) {
    await requireAdminSession();

    const db = getDb();

    const quantity = normalizeInventoryValue(input.quantity);
    const lowStockThreshold = normalizeInventoryValue(input.lowStockThreshold);

    const [updated] = await db
      .insert(inventory)
      .values({
        variantId: input.variantId,
        quantity,
        lowStockThreshold,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: inventory.variantId,
        set: {
          quantity,
          lowStockThreshold,
          updatedAt: new Date(),
        },
      })
      .returning({ variantId: inventory.variantId });

    return updated ?? null;
  },

  async findByVariantId(variantId: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(inventory)
      .where(eq(inventory.variantId, variantId))
      .limit(1);

    return row ?? null;
  },

  /**
   * Deducts sold stock from `quantity`.
   *
   * Deliberately not guarded on a live reservation: a hold can lapse while the
   * shopper is on the payment step, and refusing the deduction there would sell
   * the item without ever reducing stock. The reservation rows are settled
   * separately by `reservationRepository.confirmSession`.
   *
   * A deduction that would go below zero still applies, and reports `oversold`
   * so the caller can record it. A visible negative is recoverable; a silent
   * skip is not.
   */
  async confirm(variantId: string, quantity: number) {
    const db = getDb();

    const [row] = await db
      .update(inventory)
      .set({
        quantity: sql`${inventory.quantity} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.variantId, variantId))
      .returning({ quantity: inventory.quantity });

    if (!row) {
      // No inventory row = untracked variant. Nothing to deduct.
      return { ok: true, oversold: false };
    }

    return { ok: true, oversold: Number(row.quantity) < 0 };
  },

  // Single-step deduction for an in-store (POS) sale: there is no prior
  // reservation, so this decrements `quantity` directly, guarded by stock that
  // is not held by a live checkout. Returns false when stock is insufficient.
  //
  // The guard computes live holds inline rather than reading
  // `variant_availability`: the UPDATE takes a row lock on the inventory row,
  // which serialises this against concurrent POS sales. A view cannot be locked.
  async decrementForSale(variantId: string, quantity: number) {
    const db = getDb();

    const updatedRows = await db
      .update(inventory)
      .set({
        quantity: sql`${inventory.quantity} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventory.variantId, variantId),
          gte(
            sql`${inventory.quantity} - (
              select coalesce(sum(cr.quantity), 0)
              from checkout_reservations cr
              where cr.variant_id = ${inventory.variantId}
                and cr.status = 'open'
                and cr.expires_at > now()
            )`,
            quantity,
          ),
        ),
      )
      .returning({ id: inventory.id });

    return updatedRows.length > 0;
  },
};
