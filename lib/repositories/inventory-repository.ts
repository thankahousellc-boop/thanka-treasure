import { and, asc, desc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { inventory, products, productVariants } from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

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

    return db
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

  async reserve(variantId: string, quantity: number) {
    const db = getDb();

    const updatedRows = await db
      .update(inventory)
      .set({
        reservedQuantity: sql`${inventory.reservedQuantity} + ${quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventory.variantId, variantId),
          gte(
            sql`${inventory.quantity} - ${inventory.reservedQuantity}`,
            quantity,
          ),
        ),
      )
      .returning({ id: inventory.id });

    return updatedRows.length > 0;
  },

  async confirm(variantId: string, quantity: number) {
    const db = getDb();

    const updatedRows = await db
      .update(inventory)
      .set({
        quantity: sql`${inventory.quantity} - ${quantity}`,
        reservedQuantity: sql`greatest(${inventory.reservedQuantity} - ${quantity}, 0)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventory.variantId, variantId),
          gte(inventory.reservedQuantity, quantity),
        ),
      )
      .returning({ id: inventory.id });

    return updatedRows.length > 0;
  },

  async release(variantId: string, quantity: number) {
    const db = getDb();

    const updatedRows = await db
      .update(inventory)
      .set({
        reservedQuantity: sql`greatest(${inventory.reservedQuantity} - ${quantity}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.variantId, variantId))
      .returning({ id: inventory.id });

    return updatedRows.length > 0;
  },
};
