"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import slugify from "slugify";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { blogRepository } from "@/lib/repositories/blog-repository";
import { toPlainText } from "@/lib/seo";
import { BUCKETS, storage } from "@/lib/storage";

const blogFormSchema = z.object({
  title: z.string().min(3).max(180),
  slug: z.string().max(220).optional(),
  excerpt: z.string().max(300).optional(),
  content: z.string().min(1),
  featuredImageAlt: z.string().max(220).optional(),
  removeFeaturedImage: z.enum(["1"]).optional(),
  status: z.enum(["draft", "published", "scheduled"]),
  scheduledAt: z.string().optional(),
  categoryIds: z.array(z.string().uuid()).max(20),
  tagIds: z.array(z.string().uuid()).max(40),
});

const blogImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const blogImageSizeLimitBytes = 5 * 1024 * 1024;

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getIdList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

function normalizeSlug(rawSlug: string | undefined, title: string) {
  const fromInput = rawSlug && rawSlug.length > 0 ? rawSlug : title;
  return slugify(fromInput, { lower: true, strict: true, trim: true });
}

function sanitizeFileName(name: string) {
  const [basename, extension = ""] = name.split(/\.(?=[^\.]+$)/);
  const safeBase = basename
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  const safeExtension = extension
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10);
  const normalizedBase = safeBase.length > 0 ? safeBase : "upload";

  return safeExtension ? `${normalizedBase}.${safeExtension}` : normalizedBase;
}

function countContentCharacters(content: string) {
  return toPlainText(content).replace(/\s+/g, " ").trim().length;
}

function toScheduledDate(rawDate: string | undefined) {
  if (!rawDate) {
    return null;
  }

  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }

  return session;
}

function parseBlogForm(formData: FormData) {
  const parsed = blogFormSchema.safeParse({
    title: getString(formData, "title"),
    slug: getString(formData, "slug") || undefined,
    excerpt: getString(formData, "excerpt") || undefined,
    content: getString(formData, "content"),
    featuredImageAlt: getString(formData, "featuredImageAlt") || undefined,
    removeFeaturedImage:
      getString(formData, "removeFeaturedImage") || undefined,
    status: getString(formData, "status"),
    scheduledAt: getString(formData, "scheduledAt") || undefined,
    categoryIds: uniqueIds(getIdList(formData, "categoryIds")),
    tagIds: uniqueIds(getIdList(formData, "tagIds")),
  });

  if (!parsed.success) {
    throw new Error("Invalid blog post form payload.");
  }

  const slug = normalizeSlug(parsed.data.slug, parsed.data.title);
  if (!slug) {
    throw new Error("Unable to generate a valid slug.");
  }

  if (countContentCharacters(parsed.data.content) < 10) {
    throw new Error(
      "Blog content must include at least 10 characters of text.",
    );
  }

  const scheduledAt =
    parsed.data.status === "scheduled"
      ? toScheduledDate(parsed.data.scheduledAt)
      : null;

  if (parsed.data.status === "scheduled" && !scheduledAt) {
    throw new Error("Scheduled posts require a valid scheduled date.");
  }

  return {
    title: parsed.data.title,
    slug,
    excerpt: parsed.data.excerpt ?? null,
    content: parsed.data.content,
    featuredImageAlt: parsed.data.featuredImageAlt ?? null,
    removeFeaturedImage: parsed.data.removeFeaturedImage === "1",
    status: parsed.data.status,
    scheduledAt,
    categoryIds: parsed.data.categoryIds,
    tagIds: parsed.data.tagIds,
  };
}

async function uploadFeaturedImage(file: File, entityId: string) {
  if (!blogImageMimeTypes.has(file.type)) {
    throw new Error("Unsupported featured image type. Use JPEG, PNG, or WEBP.");
  }

  if (file.size > blogImageSizeLimitBytes) {
    throw new Error("Featured image exceeds the 5MB upload limit.");
  }

  const safeFileName = sanitizeFileName(file.name || "upload");
  const path = `blog/${entityId}/${Date.now()}-${safeFileName}`;

  return storage.upload(BUCKETS.BLOG_IMAGES, path, file, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600",
  });
}

async function filterExistingTaxonomyIds(
  categoryIds: string[],
  tagIds: string[],
) {
  const [categories, tags] = await Promise.all([
    blogRepository.listCategoriesForAdmin(),
    blogRepository.listTagsForAdmin(),
  ]);

  const categorySet = new Set(categories.map((item) => item.id));
  const tagSet = new Set(tags.map((item) => item.id));

  return {
    categoryIds: categoryIds.filter((id) => categorySet.has(id)),
    tagIds: tagIds.filter((id) => tagSet.has(id)),
  };
}

function revalidateBlogPaths(slugs: string[]) {
  revalidatePath("/admin/blog");
  revalidatePath("/admin/blog/categories");
  revalidatePath("/blogs");

  for (const slug of slugs) {
    revalidatePath(`/blogs/${slug}`);
  }
}

export async function createBlogPostAction(formData: FormData) {
  const session = await assertAdmin();
  const payload = parseBlogForm(formData);
  const featuredImageFile = formData.get("featuredImage");

  const uploadedFeaturedImage =
    featuredImageFile instanceof File && featuredImageFile.size > 0
      ? await uploadFeaturedImage(featuredImageFile, payload.slug)
      : null;

  const taxonomy = await filterExistingTaxonomyIds(
    payload.categoryIds,
    payload.tagIds,
  );

  const publishedAt = payload.status === "published" ? new Date() : null;

  const created = await blogRepository.createForAdmin({
    title: payload.title,
    slug: payload.slug,
    excerpt: payload.excerpt,
    content: payload.content,
    status: payload.status,
    scheduledAt: payload.scheduledAt,
    publishedAt,
    featuredImageBucket: uploadedFeaturedImage?.bucket ?? null,
    featuredImagePath: uploadedFeaturedImage?.path ?? null,
    featuredImageAlt:
      uploadedFeaturedImage?.bucket && uploadedFeaturedImage?.path
        ? payload.featuredImageAlt
        : null,
    authorId: session.user!.id,
    categoryIds: taxonomy.categoryIds,
    tagIds: taxonomy.tagIds,
  });

  if (!created) {
    throw new Error("Failed to create blog post.");
  }

  const publishedSlugs = payload.status === "published" ? [created.slug] : [];
  revalidateBlogPaths(publishedSlugs);

  redirect(`/admin/blog/${created.id}`);
}

export async function updateBlogPostAction(postId: string, formData: FormData) {
  await assertAdmin();

  const existing = await blogRepository.findByIdForAdmin(postId);
  if (!existing) {
    throw new Error("Blog post not found.");
  }

  const payload = parseBlogForm(formData);
  const featuredImageFile = formData.get("featuredImage");
  const uploadedFeaturedImage =
    featuredImageFile instanceof File && featuredImageFile.size > 0
      ? await uploadFeaturedImage(featuredImageFile, postId)
      : null;

  const taxonomy = await filterExistingTaxonomyIds(
    payload.categoryIds,
    payload.tagIds,
  );

  const publishedAt =
    payload.status === "published"
      ? (existing.publishedAt ?? new Date())
      : null;

  const shouldClearFeaturedImage = payload.removeFeaturedImage;
  const featuredImageBucket = shouldClearFeaturedImage
    ? null
    : (uploadedFeaturedImage?.bucket ?? existing.featuredImageBucket);
  const featuredImagePath = shouldClearFeaturedImage
    ? null
    : (uploadedFeaturedImage?.path ?? existing.featuredImagePath);
  const featuredImageAlt = featuredImageBucket
    ? payload.featuredImageAlt
    : null;

  const updated = await blogRepository.updateForAdmin(postId, {
    title: payload.title,
    slug: payload.slug,
    excerpt: payload.excerpt,
    content: payload.content,
    status: payload.status,
    scheduledAt: payload.scheduledAt,
    publishedAt,
    featuredImageBucket,
    featuredImagePath,
    featuredImageAlt,
    categoryIds: taxonomy.categoryIds,
    tagIds: taxonomy.tagIds,
  });

  if (!updated) {
    throw new Error("Failed to update blog post.");
  }

  const publishedSlugs = [existing.slug];
  if (payload.status === "published") {
    publishedSlugs.push(updated.slug);
  }

  revalidateBlogPaths(uniqueIds(publishedSlugs));

  redirect(`/admin/blog/${updated.id}`);
}
