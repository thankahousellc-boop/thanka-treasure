"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import slugify from "slugify";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { productRepository } from "@/lib/repositories/product-repository";
import { BUCKETS, storage } from "@/lib/storage";

const productFormSchema = z.object({
  title: z.string().min(3).max(180),
  slug: z.string().max(220).optional(),
  description: z.string().max(50000).optional(),
  metaTitle: z.string().max(180).optional(),
  metaDescription: z.string().max(320).optional(),
  status: z.enum(["draft", "active", "archived"]),
  productType: z.string().max(120).optional(),
  vendor: z.string().max(120).optional(),
  tags: z.string().max(400).optional(),
});

const productVariantSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(120),
  sku: z.string().max(120).optional(),
  option1: z.string().max(120).optional(),
  option2: z.string().max(120).optional(),
  option3: z.string().max(120).optional(),
  inventoryQuantity: z.string().optional(),
  lowStockThreshold: z.string().optional(),
});

const productImageMetaSchema = z.object({
  imageId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  altText: z.string().max(220).optional(),
});

const productImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const productImageSizeLimitBytes = 5 * 1024 * 1024;

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""));
}

function normalizeSlug(rawSlug: string | undefined, title: string) {
  const fromInput = rawSlug && rawSlug.length > 0 ? rawSlug : title;
  return slugify(fromInput, { lower: true, strict: true, trim: true });
}

function toMinorAmount(input: string | undefined) {
  if (!input || input.trim().length === 0) {
    return null;
  }

  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

function toWholeNumber(input: string | undefined, fallback: number) {
  if (!input || input.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(input);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsed));
}

function normalizeTags(raw: string | undefined) {
  if (!raw) {
    return [] as string[];
  }

  return raw
    .split(/[\n,]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 20);
}

function parseVariants(formData: FormData) {
  const ids = getStringList(formData, "variantId");
  const titles = getStringList(formData, "variantTitle");
  const skus = getStringList(formData, "sku");
  const prices = getStringList(formData, "price");
  const compareAtPrices = getStringList(formData, "compareAtPrice");
  const option1Values = getStringList(formData, "option1");
  const option2Values = getStringList(formData, "option2");
  const option3Values = getStringList(formData, "option3");
  const quantities = getStringList(formData, "inventoryQuantity");
  const lowStockThresholds = getStringList(formData, "lowStockThreshold");

  const rowCount = Math.max(
    titles.length,
    prices.length,
    skus.length,
    option1Values.length,
    option2Values.length,
    option3Values.length,
    quantities.length,
    lowStockThresholds.length,
    ids.length,
  );

  const variants: Array<{
    id?: string;
    title: string;
    sku: string | null;
    price: number;
    compareAtPrice: number | null;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    quantity: number;
    lowStockThreshold: number;
  }> = [];

  for (let index = 0; index < rowCount; index += 1) {
    const title = titles[index] ?? "";
    const priceRaw = prices[index] ?? "";
    const id = ids[index] ?? "";
    const sku = skus[index] ?? "";
    const option1 = option1Values[index] ?? "";
    const option2 = option2Values[index] ?? "";
    const option3 = option3Values[index] ?? "";
    const compareAtPriceRaw = compareAtPrices[index] ?? "";
    const quantityRaw = quantities[index] ?? "";
    const thresholdRaw = lowStockThresholds[index] ?? "";

    const hasAnyValue = [
      title,
      priceRaw,
      id,
      sku,
      option1,
      option2,
      option3,
      compareAtPriceRaw,
      quantityRaw,
      thresholdRaw,
    ].some((value) => value.length > 0);

    if (!hasAnyValue) {
      continue;
    }

    const parsedVariant = productVariantSchema.safeParse({
      id: id || undefined,
      title,
      sku: sku || undefined,
      option1: option1 || undefined,
      option2: option2 || undefined,
      option3: option3 || undefined,
      inventoryQuantity: quantityRaw || undefined,
      lowStockThreshold: thresholdRaw || undefined,
    });

    if (!parsedVariant.success) {
      throw new Error(`Invalid variant payload at row ${index + 1}.`);
    }

    const price = toMinorAmount(priceRaw);
    if (price === null || price <= 0) {
      throw new Error(`Variant row ${index + 1} must have a valid price.`);
    }

    const compareAtPrice = toMinorAmount(compareAtPriceRaw);
    if (compareAtPrice !== null && compareAtPrice < price) {
      throw new Error(
        `Variant row ${index + 1} compare-at price must be greater than or equal to price.`,
      );
    }

    variants.push({
      id: parsedVariant.data.id,
      title: parsedVariant.data.title,
      sku: parsedVariant.data.sku ?? null,
      price,
      compareAtPrice,
      option1: parsedVariant.data.option1 ?? null,
      option2: parsedVariant.data.option2 ?? null,
      option3: parsedVariant.data.option3 ?? null,
      quantity: toWholeNumber(parsedVariant.data.inventoryQuantity, 0),
      lowStockThreshold: toWholeNumber(parsedVariant.data.lowStockThreshold, 5),
    });
  }

  if (variants.length === 0) {
    throw new Error("At least one variant is required.");
  }

  return variants;
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

function revalidateProductPaths(productId: string, productSlug: string) {
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/products");
  revalidatePath(`/products/${productSlug}`);
}

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function parseProductForm(formData: FormData) {
  const parsed = productFormSchema.safeParse({
    title: getString(formData, "title"),
    slug: getString(formData, "slug") || undefined,
    description: getString(formData, "description") || undefined,
    metaTitle: getString(formData, "metaTitle") || undefined,
    metaDescription: getString(formData, "metaDescription") || undefined,
    status: getString(formData, "status"),
    productType: getString(formData, "productType") || undefined,
    vendor: getString(formData, "vendor") || undefined,
    tags: getString(formData, "tags") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid product form payload.");
  }

  const slug = normalizeSlug(parsed.data.slug, parsed.data.title);
  if (!slug) {
    throw new Error("Unable to generate a valid slug.");
  }

  const variants = parseVariants(formData);

  return {
    title: parsed.data.title,
    slug,
    description: parsed.data.description ?? null,
    metaTitle: parsed.data.metaTitle ?? null,
    metaDescription: parsed.data.metaDescription ?? null,
    status: parsed.data.status,
    productType: parsed.data.productType ?? null,
    vendor: parsed.data.vendor ?? null,
    tags: normalizeTags(parsed.data.tags),
    variants,
  };
}

export async function createProductAction(formData: FormData) {
  await assertAdmin();

  const payload = parseProductForm(formData);
  const created = await productRepository.createForAdmin(payload);

  revalidatePath("/admin/products");
  revalidatePath("/products");

  if (payload.status === "active") {
    revalidatePath(`/products/${payload.slug}`);
  }

  redirect(`/admin/products/${created.id}`);
}

export async function updateProductAction(
  productId: string,
  formData: FormData,
) {
  await assertAdmin();

  const existing = await productRepository.findByIdForAdmin(productId);
  if (!existing) {
    throw new Error("Product not found.");
  }

  const payload = parseProductForm(formData);
  const updated = await productRepository.updateForAdmin(productId, payload);

  if (!updated) {
    throw new Error("Failed to update product.");
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath(`/products/${existing.product.slug}`);
  revalidatePath(`/products/${updated.slug}`);

  redirect(`/admin/products/${productId}`);
}

export async function addProductImageAction(
  productId: string,
  formData: FormData,
) {
  await assertAdmin();

  const existing = await productRepository.findByIdForAdmin(productId);
  if (!existing) {
    throw new Error("Product not found.");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Product image file is required.");
  }

  if (!productImageMimeTypes.has(file.type)) {
    throw new Error("Unsupported file type. Use JPEG, PNG, or WEBP.");
  }

  if (file.size > productImageSizeLimitBytes) {
    throw new Error("Image exceeds the 5MB upload limit.");
  }

  const variantIdRaw = getString(formData, "variantId");
  const variantId = variantIdRaw || null;

  if (
    variantId &&
    !existing.variants.some((variant) => variant.id === variantId)
  ) {
    throw new Error("Variant does not belong to this product.");
  }

  const altText = getString(formData, "altText");
  const safeFileName = sanitizeFileName(file.name || "upload");
  const path = `products/${productId}/${Date.now()}-${safeFileName}`;

  const fileRef = await storage.upload(BUCKETS.PRODUCT_IMAGES, path, file, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600",
  });

  await productRepository.addImageForAdmin(productId, {
    bucket: fileRef.bucket,
    path: fileRef.path,
    altText: altText || null,
    variantId,
  });

  revalidateProductPaths(productId, existing.product.slug);
}

export async function updateProductImageMetaAction(
  productId: string,
  formData: FormData,
) {
  await assertAdmin();

  const existing = await productRepository.findByIdForAdmin(productId);
  if (!existing) {
    throw new Error("Product not found.");
  }

  const parsed = productImageMetaSchema.safeParse({
    imageId: getString(formData, "imageId"),
    variantId: getString(formData, "variantId") || undefined,
    altText: getString(formData, "altText") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid image metadata payload.");
  }

  if (
    parsed.data.variantId &&
    !existing.variants.some((variant) => variant.id === parsed.data.variantId)
  ) {
    throw new Error("Variant does not belong to this product.");
  }

  await productRepository.updateImageForAdmin(productId, parsed.data.imageId, {
    altText: parsed.data.altText ?? null,
    variantId: parsed.data.variantId ?? null,
  });

  revalidateProductPaths(productId, existing.product.slug);
}

export async function moveProductImageUpAction(
  productId: string,
  formData: FormData,
) {
  await assertAdmin();

  const existing = await productRepository.findByIdForAdmin(productId);
  if (!existing) {
    throw new Error("Product not found.");
  }

  const imageId = getString(formData, "imageId");
  if (!imageId) {
    return;
  }

  await productRepository.moveImageForAdmin(productId, imageId, "up");
  revalidateProductPaths(productId, existing.product.slug);
}

export async function moveProductImageDownAction(
  productId: string,
  formData: FormData,
) {
  await assertAdmin();

  const existing = await productRepository.findByIdForAdmin(productId);
  if (!existing) {
    throw new Error("Product not found.");
  }

  const imageId = getString(formData, "imageId");
  if (!imageId) {
    return;
  }

  await productRepository.moveImageForAdmin(productId, imageId, "down");
  revalidateProductPaths(productId, existing.product.slug);
}

export async function deleteProductImageAction(
  productId: string,
  formData: FormData,
) {
  await assertAdmin();

  const existing = await productRepository.findByIdForAdmin(productId);
  if (!existing) {
    throw new Error("Product not found.");
  }

  const imageId = getString(formData, "imageId");
  if (!imageId) {
    return;
  }

  await productRepository.deleteImageForAdmin(productId, imageId);
  revalidateProductPaths(productId, existing.product.slug);
}

export async function archiveProductAction(formData: FormData) {
  await assertAdmin();

  const id = getString(formData, "id");
  if (!id) {
    return;
  }

  const existing = await productRepository.findByIdForAdmin(id);
  const archived = await productRepository.archiveForAdmin(id);

  if (!archived) {
    return;
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");

  if (existing) {
    revalidatePath(`/products/${existing.product.slug}`);
  }
}
