"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import slugify from "slugify";

import { auth } from "@/lib/auth";
import { productRepository } from "@/lib/repositories/product-repository";
import { BUCKETS, storage } from "@/lib/storage";

const MAX_CSV_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 1000;
const MAX_IMAGE_FETCH_TIMEOUT_MS = 15000;
const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_STATUSES = new Set(["draft", "active", "archived"]);

type RowReportStatus = "created" | "skipped" | "failed";

export type ImportRowReport = {
  rowNumber: number;
  slug: string;
  title: string;
  status: RowReportStatus;
  message: string;
  imagesUploaded: number;
  imagesFailed: string[];
};

export type ImportResult = {
  ok: boolean;
  totalRows: number;
  productGroups: number;
  created: number;
  skipped: number;
  failed: number;
  reports: ImportRowReport[];
  fatalError?: string;
};

type ParsedRow = {
  rowNumber: number;
  title: string;
  slug: string;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  status: "draft" | "active" | "archived";
  productType: string | null;
  vendor: string | null;
  tags: string[];
  variantTitle: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  inventoryQuantity: number;
  lowStockThreshold: number;
  images: string[];
  imageAltTexts: string[];
};

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function trimOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlug(rawSlug: string | null, title: string) {
  const source = rawSlug && rawSlug.length > 0 ? rawSlug : title;
  return slugify(source, { lower: true, strict: true, trim: true });
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 20);
}

function parseImageList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[|;\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseMoneyToMinor(raw: string): number | null {
  if (raw.length === 0) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function parseWhole(raw: string, fallback: number): number {
  if (raw.length === 0) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function sanitizeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1) : "";
  const safeBase =
    base
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "upload";
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

function mimeToExtension(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

function parseRow(raw: Record<string, unknown>, rowNumber: number): ParsedRow {
  const title = trimOrEmpty(raw.title);
  if (!title) {
    throw new Error(`Row ${rowNumber}: "title" is required.`);
  }
  if (title.length > 180) {
    throw new Error(`Row ${rowNumber}: "title" exceeds 180 characters.`);
  }

  const slug = normalizeSlug(trimOrNull(raw.slug), title);
  if (!slug) {
    throw new Error(`Row ${rowNumber}: unable to generate slug from title.`);
  }

  const statusRaw = trimOrEmpty(raw.status).toLowerCase() || "draft";
  if (!ALLOWED_STATUSES.has(statusRaw)) {
    throw new Error(
      `Row ${rowNumber}: invalid status "${statusRaw}". Use draft, active, or archived.`,
    );
  }

  const variantTitle = trimOrEmpty(raw.variantTitle) || "Default";
  if (variantTitle.length > 120) {
    throw new Error(`Row ${rowNumber}: "variantTitle" exceeds 120 characters.`);
  }

  const priceRaw = trimOrEmpty(raw.price);
  const price = parseMoneyToMinor(priceRaw);
  if (price === null || price <= 0) {
    throw new Error(`Row ${rowNumber}: "price" must be a positive number.`);
  }

  const compareAtPriceRaw = trimOrEmpty(raw.compareAtPrice);
  const compareAtPrice = compareAtPriceRaw
    ? parseMoneyToMinor(compareAtPriceRaw)
    : null;
  if (compareAtPriceRaw && (compareAtPrice === null || compareAtPrice < price)) {
    throw new Error(
      `Row ${rowNumber}: "compareAtPrice" must be greater than or equal to price.`,
    );
  }

  const images = parseImageList(trimOrNull(raw.images));
  const imageAltTexts = parseImageList(trimOrNull(raw.imageAltText));

  return {
    rowNumber,
    title,
    slug,
    description: trimOrNull(raw.description),
    metaTitle: trimOrNull(raw.metaTitle),
    metaDescription: trimOrNull(raw.metaDescription),
    status: statusRaw as "draft" | "active" | "archived",
    productType: trimOrNull(raw.productType),
    vendor: trimOrNull(raw.vendor),
    tags: parseTags(trimOrNull(raw.tags)),
    variantTitle,
    sku: trimOrNull(raw.sku),
    price,
    compareAtPrice,
    option1: trimOrNull(raw.option1),
    option2: trimOrNull(raw.option2),
    option3: trimOrNull(raw.option3),
    inventoryQuantity: parseWhole(trimOrEmpty(raw.inventoryQuantity), 0),
    lowStockThreshold: parseWhole(trimOrEmpty(raw.lowStockThreshold), 5),
    images,
    imageAltTexts,
  };
}

type ResolvedImage = {
  source: string;
  blob: Blob;
  contentType: string;
};

async function resolveImageFromUrl(url: string): Promise<ResolvedImage> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    MAX_IMAGE_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = (
      response.headers.get("content-type") ?? ""
    ).split(";")[0].trim().toLowerCase();
    if (!ALLOWED_IMAGE_MIMES.has(contentType)) {
      throw new Error(`unsupported content-type "${contentType || "unknown"}"`);
    }

    const lengthHeader = response.headers.get("content-length");
    if (lengthHeader && Number(lengthHeader) > MAX_IMAGE_BYTES) {
      throw new Error("exceeds 5MB limit");
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("exceeds 5MB limit");
    }

    return {
      source: url,
      blob: new Blob([buffer], { type: contentType }),
      contentType,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function resolveImageFromLocal(
  name: string,
  uploaded: Map<string, File>,
): ResolvedImage {
  const file = uploaded.get(name) ?? uploaded.get(name.toLowerCase());
  if (!file) {
    throw new Error(`local file "${name}" not found in upload`);
  }
  const contentType = (file.type || "").toLowerCase();
  if (!ALLOWED_IMAGE_MIMES.has(contentType)) {
    throw new Error(`unsupported file type "${contentType || "unknown"}"`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("exceeds 5MB limit");
  }
  return { source: name, blob: file, contentType };
}

async function uploadImageToProduct(
  productId: string,
  imageRef: string,
  altText: string | null,
  uploaded: Map<string, File>,
) {
  const isUrl = /^https?:\/\//i.test(imageRef);
  const resolved = isUrl
    ? await resolveImageFromUrl(imageRef)
    : resolveImageFromLocal(imageRef, uploaded);

  const filenameFromSource = isUrl
    ? (() => {
        try {
          const url = new URL(resolved.source);
          const last = url.pathname.split("/").filter(Boolean).pop() ?? "image";
          return last.includes(".")
            ? last
            : `${last}.${mimeToExtension(resolved.contentType)}`;
        } catch {
          return `image.${mimeToExtension(resolved.contentType)}`;
        }
      })()
    : resolved.source;

  const safeName = sanitizeFileName(filenameFromSource);
  const path = `products/${productId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safeName}`;

  const fileRef = await storage.upload(
    BUCKETS.PRODUCT_IMAGES,
    path,
    resolved.blob,
    {
      contentType: resolved.contentType,
      upsert: false,
      cacheControl: "3600",
    },
  );

  await productRepository.addImageForAdmin(productId, {
    bucket: fileRef.bucket,
    path: fileRef.path,
    altText,
    variantId: null,
  });
}

export async function bulkImportProductsAction(
  formData: FormData,
): Promise<ImportResult> {
  await assertAdmin();

  const csvFile = formData.get("csv");
  if (!(csvFile instanceof File) || csvFile.size === 0) {
    return {
      ok: false,
      totalRows: 0,
      productGroups: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      reports: [],
      fatalError: "Please attach a CSV file.",
    };
  }
  if (csvFile.size > MAX_CSV_BYTES) {
    return {
      ok: false,
      totalRows: 0,
      productGroups: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      reports: [],
      fatalError: "CSV file exceeds the 2MB limit.",
    };
  }

  const uploaded = new Map<string, File>();
  for (const entry of formData.getAll("images")) {
    if (entry instanceof File && entry.size > 0) {
      uploaded.set(entry.name, entry);
      uploaded.set(entry.name.toLowerCase(), entry);
    }
  }

  const csvText = await csvFile.text();
  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    return {
      ok: false,
      totalRows: 0,
      productGroups: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      reports: [],
      fatalError: `CSV parse error at row ${
        (first.row ?? 0) + 1
      }: ${first.message}`,
    };
  }

  if (parsed.data.length === 0) {
    return {
      ok: false,
      totalRows: 0,
      productGroups: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      reports: [],
      fatalError: "CSV contains no data rows.",
    };
  }

  if (parsed.data.length > MAX_ROWS) {
    return {
      ok: false,
      totalRows: parsed.data.length,
      productGroups: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      reports: [],
      fatalError: `CSV exceeds the ${MAX_ROWS}-row limit.`,
    };
  }

  const reports: ImportRowReport[] = [];
  const groups = new Map<string, ParsedRow[]>();

  for (let i = 0; i < parsed.data.length; i += 1) {
    const rowNumber = i + 2;
    try {
      const row = parseRow(parsed.data[i], rowNumber);
      const list = groups.get(row.slug);
      if (list) {
        list.push(row);
      } else {
        groups.set(row.slug, [row]);
      }
    } catch (error) {
      reports.push({
        rowNumber,
        slug: "",
        title: trimOrEmpty(parsed.data[i]?.title) || "(unknown)",
        status: "failed",
        message: error instanceof Error ? error.message : "Invalid row.",
        imagesUploaded: 0,
        imagesFailed: [],
      });
    }
  }

  let created = 0;
  let skipped = 0;
  let failed = reports.filter((r) => r.status === "failed").length;

  for (const [slug, rows] of groups) {
    const head = rows[0];

    const existing = await productRepository.findBySlug(slug);
    if (existing) {
      skipped += 1;
      reports.push({
        rowNumber: head.rowNumber,
        slug,
        title: head.title,
        status: "skipped",
        message: `Slug "${slug}" already exists — row skipped.`,
        imagesUploaded: 0,
        imagesFailed: [],
      });
      continue;
    }

    const variants = rows.map((row) => ({
      title: row.variantTitle,
      sku: row.sku,
      price: row.price,
      compareAtPrice: row.compareAtPrice,
      option1: row.option1,
      option2: row.option2,
      option3: row.option3,
      quantity: row.inventoryQuantity,
      lowStockThreshold: row.lowStockThreshold,
    }));

    let productId: string;
    try {
      const createdProduct = await productRepository.createForAdmin({
        title: head.title,
        slug,
        description: head.description,
        metaTitle: head.metaTitle,
        metaDescription: head.metaDescription,
        status: head.status,
        productType: head.productType,
        categoryId: null,
        vendor: head.vendor,
        tags: head.tags,
        variants,
        attributes: [],
      });
      productId = createdProduct.id;
    } catch (error) {
      failed += 1;
      reports.push({
        rowNumber: head.rowNumber,
        slug,
        title: head.title,
        status: "failed",
        message:
          error instanceof Error
            ? `Create failed: ${error.message}`
            : "Create failed.",
        imagesUploaded: 0,
        imagesFailed: [],
      });
      continue;
    }

    let imagesUploaded = 0;
    const imagesFailed: string[] = [];
    for (const row of rows) {
      for (let idx = 0; idx < row.images.length; idx += 1) {
        const ref = row.images[idx];
        const alt = row.imageAltTexts[idx] ?? null;
        try {
          await uploadImageToProduct(productId, ref, alt, uploaded);
          imagesUploaded += 1;
        } catch (error) {
          imagesFailed.push(
            `${ref} (${
              error instanceof Error ? error.message : "upload failed"
            })`,
          );
        }
      }
    }

    created += 1;
    reports.push({
      rowNumber: head.rowNumber,
      slug,
      title: head.title,
      status: "created",
      message:
        rows.length > 1
          ? `Created with ${rows.length} variants.`
          : "Created.",
      imagesUploaded,
      imagesFailed,
    });
  }

  reports.sort((a, b) => a.rowNumber - b.rowNumber);

  if (created > 0) {
    revalidatePath("/admin/products");
    revalidatePath("/products");
  }

  return {
    ok: failed === 0,
    totalRows: parsed.data.length,
    productGroups: groups.size,
    created,
    skipped,
    failed,
    reports,
  };
}
