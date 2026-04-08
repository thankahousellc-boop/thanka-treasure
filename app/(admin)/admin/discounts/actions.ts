"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { discountRepository } from "@/lib/repositories/discount-repository";

type DiscountType = "percentage" | "fixed_amount" | "free_shipping";
type DiscountApplyMode = "code" | "automatic";

function toDiscountType(value: FormDataEntryValue | null): DiscountType | null {
  if (
    value === "percentage" ||
    value === "fixed_amount" ||
    value === "free_shipping"
  ) {
    return value;
  }

  return null;
}

function toDiscountApplyMode(
  value: FormDataEntryValue | null,
): DiscountApplyMode {
  return value === "automatic" ? "automatic" : "code";
}

function toPositiveInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const integer = Math.round(parsed);
  return integer > 0 ? integer : null;
}

function toOptionalMinorAmount(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

function toOptionalDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

export async function createDiscountAction(formData: FormData) {
  await assertAdmin();

  const code = formData.get("code");
  const type = toDiscountType(formData.get("type"));
  const applyMode = toDiscountApplyMode(formData.get("applyMode"));
  const priority = toPositiveInteger(formData.get("priority")) ?? undefined;
  const valueInput = formData.get("value");
  const minimumOrderAmount = toOptionalMinorAmount(
    formData.get("minimumOrderAmount"),
  );
  const usageLimit = toPositiveInteger(formData.get("usageLimit"));
  const startsAt = toOptionalDate(formData.get("startsAt"));
  const endsAt = toOptionalDate(formData.get("endsAt"));
  const isActive = formData.get("isActive") === "on";

  if (typeof code !== "string" || !type) {
    return;
  }

  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return;
  }

  let value: number;
  if (type === "percentage") {
    const parsedPercent = toPositiveInteger(valueInput);
    if (!parsedPercent) {
      return;
    }

    value = Math.min(parsedPercent, 100);
  } else if (type === "fixed_amount") {
    const parsedAmount = toOptionalMinorAmount(valueInput);
    if (!parsedAmount) {
      return;
    }

    value = parsedAmount;
  } else {
    value = 0;
  }

  if (endsAt && startsAt && endsAt < startsAt) {
    return;
  }

  await discountRepository.createForAdmin({
    code: normalizedCode,
    type,
    value,
    minimumOrderAmount,
    usageLimit,
    startsAt,
    endsAt,
    isActive,
    appliesTo: {
      mode: applyMode,
      priority,
    },
  });

  revalidatePath("/admin/discounts");
  revalidatePath("/admin/discounts/new");
}

export async function toggleDiscountStatusAction(formData: FormData) {
  await assertAdmin();

  const id = formData.get("id");
  const nextState = formData.get("nextState");

  if (typeof id !== "string" || typeof nextState !== "string") {
    return;
  }

  await discountRepository.setActiveStatus(id, nextState === "active");
  revalidatePath("/admin/discounts");
}
