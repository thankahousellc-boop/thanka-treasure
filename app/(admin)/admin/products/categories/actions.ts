"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import slugify from "slugify";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { collectionRepository } from "@/lib/repositories/collection-repository";

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  slug: z.string().max(160).optional(),
  description: z.string().max(1000).optional(),
  position: z.number().int().min(0).max(9999),
});

const collectionSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2).max(140),
  slug: z.string().max(180).optional(),
  description: z.string().max(1200).optional(),
  type: z.enum(["manual", "automated"]),
  previousSlug: z.string().max(180).optional(),
});

const collectionProductsSchema = z.object({
  collectionId: z.string().uuid(),
  collectionSlug: z.string().min(1).max(180),
  productIds: z.array(z.string().uuid()).max(500),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
}

function normalizeSlug(rawSlug: string | undefined, source: string) {
  const slugSource = rawSlug && rawSlug.length > 0 ? rawSlug : source;
  return slugify(slugSource, { lower: true, strict: true, trim: true });
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

function revalidateProductTaxonomyPaths(
  collectionSlug?: string | null,
  previousCollectionSlug?: string | null,
) {
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/categories");
  revalidatePath("/products");
  revalidatePath("/collections");

  if (previousCollectionSlug) {
    revalidatePath(`/collections/${previousCollectionSlug}`);
  }

  if (collectionSlug) {
    revalidatePath(`/collections/${collectionSlug}`);
  }
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

function parseCollection(formData: FormData, requireId: boolean) {
  const parsed = collectionSchema.safeParse({
    id: getString(formData, "id") || undefined,
    title: getString(formData, "title"),
    slug: getString(formData, "slug") || undefined,
    description: getString(formData, "description") || undefined,
    type: getString(formData, "type"),
    previousSlug: getString(formData, "oldSlug") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid collection form payload.");
  }

  if (requireId && !parsed.data.id) {
    throw new Error("Collection id is required.");
  }

  const slug = normalizeSlug(parsed.data.slug, parsed.data.title);
  if (!slug) {
    throw new Error("Unable to generate a valid collection slug.");
  }

  return {
    id: parsed.data.id,
    title: parsed.data.title,
    slug,
    description: parsed.data.description ?? null,
    type: parsed.data.type,
    previousSlug: parsed.data.previousSlug ?? null,
  };
}

function parseCollectionProducts(formData: FormData) {
  const parsed = collectionProductsSchema.safeParse({
    collectionId: getString(formData, "collectionId"),
    collectionSlug: getString(formData, "collectionSlug"),
    productIds: getStringList(formData, "productIds"),
  });

  if (!parsed.success) {
    throw new Error("Invalid collection product assignment payload.");
  }

  return parsed.data;
}

export async function createProductCategoryAction(formData: FormData) {
  await assertAdmin();

  const payload = parseCategory(formData, false);
  const created = await collectionRepository.createCategoryForAdmin(payload);

  if (!created) {
    throw new Error("Failed to create product category.");
  }

  revalidateProductTaxonomyPaths();
  redirect("/admin/products/categories");
}

export async function updateProductCategoryAction(formData: FormData) {
  await assertAdmin();

  const payload = parseCategory(formData, true);
  const updated = await collectionRepository.updateCategoryForAdmin(
    payload.id!,
    {
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      position: payload.position,
    },
  );

  if (!updated) {
    throw new Error("Failed to update product category.");
  }

  revalidateProductTaxonomyPaths();
  redirect("/admin/products/categories");
}

export async function createProductCollectionAction(formData: FormData) {
  await assertAdmin();

  const payload = parseCollection(formData, false);
  const created = await collectionRepository.createCollectionForAdmin({
    title: payload.title,
    slug: payload.slug,
    description: payload.description,
    type: payload.type,
  });

  if (!created) {
    throw new Error("Failed to create collection.");
  }

  revalidateProductTaxonomyPaths(payload.slug);
  redirect("/admin/products/categories");
}

export async function updateProductCollectionAction(formData: FormData) {
  await assertAdmin();

  const payload = parseCollection(formData, true);
  const updated = await collectionRepository.updateCollectionForAdmin(
    payload.id!,
    {
      title: payload.title,
      slug: payload.slug,
      description: payload.description,
      type: payload.type,
    },
  );

  if (!updated) {
    throw new Error("Failed to update collection.");
  }

  revalidateProductTaxonomyPaths(updated.slug, payload.previousSlug);
  redirect("/admin/products/categories");
}

export async function updateCollectionProductsAction(formData: FormData) {
  await assertAdmin();

  const payload = parseCollectionProducts(formData);
  const updated = await collectionRepository.setCollectionProductsForAdmin(
    payload.collectionId,
    payload.productIds,
  );

  if (!updated) {
    throw new Error("Failed to update collection products.");
  }

  revalidateProductTaxonomyPaths(payload.collectionSlug);
  redirect("/admin/products/categories");
}
