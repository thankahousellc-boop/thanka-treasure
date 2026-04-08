import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { discounts } from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

type DiscountType = "percentage" | "fixed_amount" | "free_shipping";
type DiscountApplyMode = "code" | "automatic";

type DiscountAppliesTo = {
  mode: DiscountApplyMode;
  priority?: number;
};

type CreateDiscountInput = {
  code: string;
  type: DiscountType;
  value: number;
  minimumOrderAmount: number | null;
  usageLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  appliesTo: DiscountAppliesTo;
};

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function readAppliesTo(input: unknown): DiscountAppliesTo {
  if (!input || typeof input !== "object") {
    return { mode: "code" };
  }

  const record = input as Record<string, unknown>;
  const mode: DiscountApplyMode =
    record.mode === "automatic" ? "automatic" : "code";
  const priority =
    typeof record.priority === "number" && Number.isFinite(record.priority)
      ? record.priority
      : undefined;

  return {
    mode,
    priority,
  };
}

function calculateAmountOff(
  discount: {
    type: string;
    value: number;
  },
  subtotal: number,
) {
  if (discount.type === "percentage") {
    if (discount.value <= 0) {
      return 0;
    }

    const boundedPercent = Math.min(discount.value, 100);
    return Math.floor((subtotal * boundedPercent) / 100);
  }

  if (discount.type === "fixed_amount") {
    if (discount.value <= 0) {
      return 0;
    }

    return Math.min(discount.value, subtotal);
  }

  if (discount.type === "free_shipping") {
    return 0;
  }

  return 0;
}

export const discountRepository = {
  async findActiveByCode(code: string, now = new Date()) {
    const db = getDb();
    const normalizedCode = normalizeCode(code);

    if (!normalizedCode) {
      return null;
    }

    const [discount] = await db
      .select()
      .from(discounts)
      .where(
        and(
          eq(discounts.code, normalizedCode),
          eq(discounts.isActive, true),
          or(isNull(discounts.startsAt), lte(discounts.startsAt, now)),
          or(isNull(discounts.endsAt), gte(discounts.endsAt, now)),
        ),
      )
      .limit(1);

    return discount ?? null;
  },

  async listForAdmin(limit = 100) {
    await requireAdminSession();

    const db = getDb();

    return db
      .select({
        id: discounts.id,
        code: discounts.code,
        type: discounts.type,
        value: discounts.value,
        minimumOrderAmount: discounts.minimumOrderAmount,
        usageLimit: discounts.usageLimit,
        usageCount: discounts.usageCount,
        startsAt: discounts.startsAt,
        endsAt: discounts.endsAt,
        isActive: discounts.isActive,
        appliesTo: discounts.appliesTo,
        createdAt: discounts.createdAt,
      })
      .from(discounts)
      .orderBy(desc(discounts.createdAt))
      .limit(limit);
  },

  async getAdminStats() {
    await requireAdminSession();

    const db = getDb();

    const [totalRow, activeRow, exhaustedRow] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)` })
        .from(discounts)
        .then((rows) => rows[0]),
      db
        .select({ total: sql<number>`count(*)` })
        .from(discounts)
        .where(eq(discounts.isActive, true))
        .then((rows) => rows[0]),
      db
        .select({ total: sql<number>`count(*)` })
        .from(discounts)
        .where(
          sql`${discounts.usageLimit} is not null and ${discounts.usageCount} >= ${discounts.usageLimit}`,
        )
        .then((rows) => rows[0]),
    ]);

    return {
      total: Number(totalRow?.total ?? 0),
      active: Number(activeRow?.total ?? 0),
      exhausted: Number(exhaustedRow?.total ?? 0),
    };
  },

  async createForAdmin(input: CreateDiscountInput) {
    await requireAdminSession();

    const db = getDb();

    const [created] = await db
      .insert(discounts)
      .values({
        code: normalizeCode(input.code),
        type: input.type,
        value: input.value,
        minimumOrderAmount: input.minimumOrderAmount,
        usageLimit: input.usageLimit,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        isActive: input.isActive,
        appliesTo: input.appliesTo,
        updatedAt: new Date(),
      })
      .returning({ id: discounts.id });

    return created ?? null;
  },

  async setActiveStatus(id: string, isActive: boolean) {
    await requireAdminSession();

    const db = getDb();

    const updatedRows = await db
      .update(discounts)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(discounts.id, id))
      .returning({ id: discounts.id });

    return updatedRows.length > 0;
  },

  async validateForCheckout(
    code: string,
    subtotal: number,
    now = new Date(),
    mode: DiscountApplyMode = "code",
  ) {
    const discount = await this.findActiveByCode(code, now);
    if (!discount) {
      return null;
    }

    const appliesTo = readAppliesTo(discount.appliesTo);
    if (appliesTo.mode !== mode) {
      return null;
    }

    if (
      discount.usageLimit !== null &&
      discount.usageCount >= discount.usageLimit
    ) {
      return null;
    }

    if (
      discount.minimumOrderAmount !== null &&
      subtotal < discount.minimumOrderAmount
    ) {
      return null;
    }

    const amountOff = calculateAmountOff(discount, subtotal);
    if (discount.type !== "free_shipping" && amountOff <= 0) {
      return null;
    }

    return {
      discount,
      amountOff,
      appliesTo,
    };
  },

  async findBestAutomaticForCheckout(subtotal: number, now = new Date()) {
    const db = getDb();

    const rows = await db
      .select()
      .from(discounts)
      .where(
        and(
          eq(discounts.isActive, true),
          or(isNull(discounts.startsAt), lte(discounts.startsAt, now)),
          or(isNull(discounts.endsAt), gte(discounts.endsAt, now)),
          sql`${discounts.usageLimit} is null or ${discounts.usageCount} < ${discounts.usageLimit}`,
        ),
      );

    const candidates = rows
      .map((discount) => {
        const appliesTo = readAppliesTo(discount.appliesTo);
        if (appliesTo.mode !== "automatic") {
          return null;
        }

        if (
          discount.minimumOrderAmount !== null &&
          subtotal < discount.minimumOrderAmount
        ) {
          return null;
        }

        const amountOff = calculateAmountOff(discount, subtotal);
        if (discount.type !== "free_shipping" && amountOff <= 0) {
          return null;
        }

        return {
          discount,
          amountOff,
          appliesTo,
        };
      })
      .filter(
        (
          candidate,
        ): candidate is {
          discount: (typeof rows)[number];
          amountOff: number;
          appliesTo: DiscountAppliesTo;
        } => candidate !== null,
      )
      .sort((a, b) => {
        if (b.amountOff !== a.amountOff) {
          return b.amountOff - a.amountOff;
        }

        const aPriority = a.appliesTo.priority ?? 0;
        const bPriority = b.appliesTo.priority ?? 0;
        if (bPriority !== aPriority) {
          return bPriority - aPriority;
        }

        return a.discount.code.localeCompare(b.discount.code);
      });

    return candidates[0] ?? null;
  },

  async incrementUsage(discountId: string) {
    const db = getDb();

    await db
      .update(discounts)
      .set({
        usageCount: sql`${discounts.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(discounts.id, discountId));
  },
};
