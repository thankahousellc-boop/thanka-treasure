"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import slugify from "slugify";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { pagesRepository } from "@/lib/repositories/pages-repository";

const staticPageFormSchema = z.object({
  title: z.string().min(3).max(180),
  slug: z.string().max(220).optional(),
  content: z.string().max(30000).optional(),
  status: z.enum(["draft", "published", "active"]),
  metaTitle: z.string().max(180).optional(),
  metaDescription: z.string().max(320).optional(),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlug(rawSlug: string | undefined, title: string) {
  const fromInput = rawSlug && rawSlug.length > 0 ? rawSlug : title;
  return slugify(fromInput, { lower: true, strict: true, trim: true });
}

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function parseStaticPageForm(formData: FormData) {
  const parsed = staticPageFormSchema.safeParse({
    title: getString(formData, "title"),
    slug: getString(formData, "slug") || undefined,
    content: getString(formData, "content") || undefined,
    status: getString(formData, "status"),
    metaTitle: getString(formData, "metaTitle") || undefined,
    metaDescription: getString(formData, "metaDescription") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid static page form payload.");
  }

  const slug = normalizeSlug(parsed.data.slug, parsed.data.title);
  if (!slug) {
    throw new Error("Unable to generate a valid slug.");
  }

  return {
    title: parsed.data.title,
    slug,
    content: parsed.data.content ?? null,
    status: parsed.data.status,
    metaTitle: parsed.data.metaTitle ?? null,
    metaDescription: parsed.data.metaDescription ?? null,
  };
}

export async function createStaticPageAction(formData: FormData) {
  await assertAdmin();

  const payload = parseStaticPageForm(formData);
  const created = await pagesRepository.createForAdmin(payload);

  if (!created) {
    throw new Error("Failed to create static page.");
  }

  revalidatePath("/admin/pages");
  revalidatePath(`/pages/${payload.slug}`);

  redirect(`/admin/pages/${created.id}?status=page-created`);
}

export async function updateStaticPageAction(
  pageId: string,
  formData: FormData,
) {
  await assertAdmin();

  const existing = await pagesRepository.findByIdForAdmin(pageId);
  if (!existing) {
    throw new Error("Static page not found.");
  }

  const payload = parseStaticPageForm(formData);
  const updated = await pagesRepository.updateForAdmin(pageId, payload);

  if (!updated) {
    throw new Error("Failed to update static page.");
  }

  revalidatePath("/admin/pages");
  revalidatePath(`/pages/${existing.slug}`);
  revalidatePath(`/pages/${updated.slug}`);

  redirect(`/admin/pages/${pageId}?status=page-saved`);
}
