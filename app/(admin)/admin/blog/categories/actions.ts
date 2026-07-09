"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import slugify from "slugify";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { blogRepository } from "@/lib/repositories/blog-repository";

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  slug: z.string().max(160).optional(),
  description: z.string().max(1000).optional(),
  position: z.number().int().min(0).max(9999),
});

const tagSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  slug: z.string().max(160).optional(),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlug(rawSlug: string | undefined, name: string) {
  const source = rawSlug && rawSlug.length > 0 ? rawSlug : name;
  return slugify(source, { lower: true, strict: true, trim: true });
}

function parsePosition(raw: string) {
  if (!raw) {
    return 0;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.floor(parsed));
}

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function parseCategory(formData: FormData, requireId: boolean) {
  const parsed = categorySchema.safeParse({
    id: getString(formData, "id") || undefined,
    name: getString(formData, "name"),
    slug: getString(formData, "slug") || undefined,
    description: getString(formData, "description") || undefined,
    position: parsePosition(getString(formData, "position")),
  });

  if (!parsed.success) {
    throw new Error("Invalid category form payload.");
  }

  if (requireId && !parsed.data.id) {
    throw new Error("Category id is required.");
  }

  const slug = normalizeSlug(parsed.data.slug, parsed.data.name);
  if (!slug) {
    throw new Error("Unable to generate a valid category slug.");
  }

  return {
    id: parsed.data.id,
    name: parsed.data.name,
    slug,
    description: parsed.data.description ?? null,
    position: parsed.data.position,
  };
}

function parseTag(formData: FormData, requireId: boolean) {
  const parsed = tagSchema.safeParse({
    id: getString(formData, "id") || undefined,
    name: getString(formData, "name"),
    slug: getString(formData, "slug") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid tag form payload.");
  }

  if (requireId && !parsed.data.id) {
    throw new Error("Tag id is required.");
  }

  const slug = normalizeSlug(parsed.data.slug, parsed.data.name);
  if (!slug) {
    throw new Error("Unable to generate a valid tag slug.");
  }

  return {
    id: parsed.data.id,
    name: parsed.data.name,
    slug,
  };
}

function revalidateBlogAdminPaths() {
  revalidatePath("/admin/blog");
  revalidatePath("/admin/blog/categories");
  revalidatePath("/blogs");
}

export async function createCategoryAction(formData: FormData) {
  await assertAdmin();

  const payload = parseCategory(formData, false);
  const created = await blogRepository.createCategoryForAdmin(payload);

  if (!created) {
    throw new Error("Failed to create category.");
  }

  revalidateBlogAdminPaths();
  redirect("/admin/blog/categories?status=category-created");
}

export async function updateCategoryAction(formData: FormData) {
  await assertAdmin();

  const payload = parseCategory(formData, true);
  const updated = await blogRepository.updateCategoryForAdmin(payload.id!, {
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    position: payload.position,
  });

  if (!updated) {
    throw new Error("Failed to update category.");
  }

  revalidateBlogAdminPaths();
  redirect("/admin/blog/categories?status=category-saved");
}

export async function createTagAction(formData: FormData) {
  await assertAdmin();

  const payload = parseTag(formData, false);
  const created = await blogRepository.createTagForAdmin(payload);

  if (!created) {
    throw new Error("Failed to create tag.");
  }

  revalidateBlogAdminPaths();
  redirect("/admin/blog/categories?status=tag-created");
}

export async function updateTagAction(formData: FormData) {
  await assertAdmin();

  const payload = parseTag(formData, true);
  const updated = await blogRepository.updateTagForAdmin(payload.id!, {
    name: payload.name,
    slug: payload.slug,
  });

  if (!updated) {
    throw new Error("Failed to update tag.");
  }

  revalidateBlogAdminPaths();
  redirect("/admin/blog/categories?status=tag-saved");
}
