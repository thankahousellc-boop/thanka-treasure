"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { settingsRepository } from "@/lib/repositories/settings-repository";
import {
  STORE_CONTACT_CACHE_TAG,
  STORE_CONTACT_KEY,
  STOREFRONT_CACHE_TAG,
  STOREFRONT_KEY,
  type StoreContactValue,
  type StorefrontValue,
} from "@/lib/site-settings";

const optionalEmail = z
  .string()
  .trim()
  .max(180)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine((value) => !value || z.string().email().safeParse(value).success, {
    message: "Must be a valid email address.",
  });

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const storeContactSchema = z.object({
  supportEmail: optionalEmail,
  secondaryEmail: optionalEmail,
  phone: optionalString(60),
  whatsapp: optionalString(40),
  addressLine1: optionalString(160),
  addressLine2: optionalString(160),
  instagram: optionalString(180),
  facebook: optionalString(180),
});

const announcementSchema = z.object({
  text: z.string().trim().min(1).max(120),
  highlight: optionalString(40),
});

const storefrontSchema = z.object({
  announcementMessages: z.array(announcementSchema).max(5),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function describeIssues(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`)
    .join(", ");
}

export async function updateStoreContactAction(formData: FormData) {
  await assertAdmin();

  const parsed = storeContactSchema.safeParse({
    supportEmail: getString(formData, "supportEmail"),
    secondaryEmail: getString(formData, "secondaryEmail"),
    phone: getString(formData, "phone"),
    whatsapp: getString(formData, "whatsapp"),
    addressLine1: getString(formData, "addressLine1"),
    addressLine2: getString(formData, "addressLine2"),
    instagram: getString(formData, "instagram"),
    facebook: getString(formData, "facebook"),
  });

  if (!parsed.success) {
    throw new Error(`Invalid contact details: ${describeIssues(parsed.error)}`);
  }

  const next: StoreContactValue = parsed.data;

  await settingsRepository.set(STORE_CONTACT_KEY, next);

  revalidateTag(STORE_CONTACT_CACHE_TAG, "max");
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}

export async function updateStorefrontAction(formData: FormData) {
  await assertAdmin();

  const messages: Array<{ text: string; highlight?: string }> = [];
  for (let index = 0; index < 5; index += 1) {
    const text = getString(formData, `messageText_${index}`);
    if (!text.trim()) continue;
    const highlight = getString(formData, `messageHighlight_${index}`);
    messages.push({
      text,
      highlight: highlight.trim() ? highlight : undefined,
    });
  }

  const parsed = storefrontSchema.safeParse({ announcementMessages: messages });

  if (!parsed.success) {
    throw new Error(
      `Invalid storefront settings: ${describeIssues(parsed.error)}`,
    );
  }

  const next: StorefrontValue = parsed.data;

  await settingsRepository.set(STOREFRONT_KEY, next);

  revalidateTag(STOREFRONT_CACHE_TAG, "max");
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}
