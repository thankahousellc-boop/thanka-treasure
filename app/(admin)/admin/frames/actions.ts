"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import slugify from "slugify";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { frameRepository } from "@/lib/repositories/frame-repository";
import { BUCKETS, storage } from "@/lib/storage";

export type FrameActionState = { ok: true } | { ok: false; error: string };

const frameImageMimeTypes = new Set(["image/png", "image/svg+xml"]);
const frameImageSizeLimit = 5 * 1024 * 1024;

const cutoutPercent = z.coerce
  .number()
  .min(0, "Cutout values must be between 0 and 100.")
  .max(100, "Cutout values must be between 0 and 100.");

const frameSchema = z
  .object({
    name: z.string().min(2).max(120),
    slug: z.string().max(180).optional(),
    description: z.string().max(2000).optional(),
    priceDelta: z.string().optional(),
    isActive: z.string().optional(),
    cutoutX: cutoutPercent,
    cutoutY: cutoutPercent,
    cutoutWidth: cutoutPercent.refine((n) => n > 0, "Cutout width must be greater than 0."),
    cutoutHeight: cutoutPercent.refine((n) => n > 0, "Cutout height must be greater than 0."),
  })
  .refine((d) => d.cutoutX + d.cutoutWidth <= 100, {
    message: "Cutout extends past the right edge of the frame.",
    path: ["cutoutWidth"],
  })
  .refine((d) => d.cutoutY + d.cutoutHeight <= 100, {
    message: "Cutout extends past the bottom edge of the frame.",
    path: ["cutoutHeight"],
  });

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function toDeltaCents(input: string | undefined) {
  if (!input || input.trim().length === 0) return 0;
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function normalizeSlug(rawSlug: string | undefined, name: string) {
  const source = rawSlug && rawSlug.length > 0 ? rawSlug : name;
  return slugify(source, { lower: true, strict: true, trim: true });
}

function sanitizeFileName(name: string) {
  const [base, ext = ""] = name.split(/\.(?=[^\.]+$)/);
  const safeBase = (base || "frame")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const safeExt = ext
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10);
  return safeExt ? `${safeBase || "frame"}.${safeExt}` : safeBase || "frame";
}

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("You don't have permission to manage frames.");
  }
}

async function uploadFrameImage(file: File) {
  if (!frameImageMimeTypes.has(file.type)) {
    throw new Error("Frame artwork must be a transparent PNG or SVG.");
  }
  if (file.size > frameImageSizeLimit) {
    throw new Error("Image exceeds the 5MB upload limit.");
  }

  const path = `frames/${Date.now()}-${sanitizeFileName(file.name || "frame")}`;
  const ref = await storage.upload(BUCKETS.SITE_ASSETS, path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  return ref;
}

function parseFrameForm(formData: FormData) {
  const parsed = frameSchema.safeParse({
    name: getString(formData, "name"),
    slug: getString(formData, "slug") || undefined,
    description: getString(formData, "description") || undefined,
    priceDelta: getString(formData, "priceDelta") || undefined,
    isActive: getString(formData, "isActive") || undefined,
    cutoutX: getString(formData, "cutoutX") || "20",
    cutoutY: getString(formData, "cutoutY") || "20",
    cutoutWidth: getString(formData, "cutoutWidth") || "60",
    cutoutHeight: getString(formData, "cutoutHeight") || "60",
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const field = first?.path.join(".") || "form";
    throw new Error(`Please check the ${field} field — ${first?.message ?? "invalid input"}.`);
  }

  const slug = normalizeSlug(parsed.data.slug, parsed.data.name);
  if (!slug) throw new Error("Unable to generate slug for frame.");

  return {
    name: parsed.data.name,
    slug,
    description: parsed.data.description ?? null,
    priceDelta: toDeltaCents(parsed.data.priceDelta),
    isActive: parsed.data.isActive === "on" || parsed.data.isActive === "true",
    cutoutX: parsed.data.cutoutX,
    cutoutY: parsed.data.cutoutY,
    cutoutWidth: parsed.data.cutoutWidth,
    cutoutHeight: parsed.data.cutoutHeight,
  };
}

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { cause?: { code?: string }; code?: string })?.cause?.code
    ?? (error as { code?: string })?.code;
  return code === "23505";
}

const KNOWN_USER_ERROR_PREFIXES = [
  "Please check the",
  "Unable to generate slug",
  "Frame artwork must be",
  "Image exceeds",
  "You don't have permission",
];

function describeError(error: unknown): string {
  console.error("[frames] save failed", error, (error as { cause?: unknown })?.cause);
  if (isUniqueViolation(error)) {
    return "A frame with this slug already exists. Pick a different name or slug.";
  }
  if (error instanceof Error && error.message) {
    if (KNOWN_USER_ERROR_PREFIXES.some((prefix) => error.message.startsWith(prefix))) {
      return error.message;
    }
  }
  return "Could not save the frame. Please try again.";
}

async function deleteStoredImage(bucket: string | null, path: string | null) {
  if (!bucket || !path) return;
  try {
    await storage.delete(bucket, [path]);
  } catch {
    // best-effort cleanup; don't surface
  }
}

export async function createFrameAction(
  _previous: FrameActionState,
  formData: FormData,
): Promise<FrameActionState> {
  let createdId: string | null = null;
  try {
    await assertAdmin();
    const data = parseFrameForm(formData);
    const file = formData.get("image");
    let imageRef: { bucket: string; path: string } | null = null;
    if (file instanceof File && file.size > 0) {
      imageRef = await uploadFrameImage(file);
    }
    createdId = await frameRepository.create({
      name: data.name,
      slug: data.slug,
      description: data.description,
      priceDelta: data.priceDelta,
      isActive: data.isActive,
      imageBucket: imageRef?.bucket ?? null,
      imagePath: imageRef?.path ?? null,
      cutoutX: data.cutoutX,
      cutoutY: data.cutoutY,
      cutoutWidth: data.cutoutWidth,
      cutoutHeight: data.cutoutHeight,
    });
    revalidatePath("/admin/frames");
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
  redirect(`/admin/frames/${createdId}?status=created`);
}

export async function updateFrameAction(
  _previous: FrameActionState,
  formData: FormData,
): Promise<FrameActionState> {
  const id = getString(formData, "frameId");
  if (!id) return { ok: false, error: "Missing frame id." };

  try {
    await assertAdmin();
    const data = parseFrameForm(formData);
    const removeImage = getString(formData, "removeImage") === "on";
    const file = formData.get("image");

    let imageRef: { bucket: string; path: string } | null = null;
    if (file instanceof File && file.size > 0) {
      imageRef = await uploadFrameImage(file);
    }

    let imageUpdate: { imageBucket: string | null; imagePath: string | null } | null = null;
    let oldImage: { bucket: string | null; path: string | null } | null = null;

    if (imageRef) {
      const existing = await frameRepository.findById(id);
      oldImage = existing
        ? { bucket: existing.imageBucket, path: existing.imagePath }
        : null;
      imageUpdate = { imageBucket: imageRef.bucket, imagePath: imageRef.path };
    } else if (removeImage) {
      const existing = await frameRepository.findById(id);
      oldImage = existing
        ? { bucket: existing.imageBucket, path: existing.imagePath }
        : null;
      imageUpdate = { imageBucket: null, imagePath: null };
    }

    await frameRepository.update(id, {
      name: data.name,
      slug: data.slug,
      description: data.description,
      priceDelta: data.priceDelta,
      isActive: data.isActive,
      cutoutX: data.cutoutX,
      cutoutY: data.cutoutY,
      cutoutWidth: data.cutoutWidth,
      cutoutHeight: data.cutoutHeight,
      ...(imageUpdate ?? {}),
    });

    if (oldImage) {
      await deleteStoredImage(oldImage.bucket, oldImage.path);
    }

    revalidatePath("/admin/frames");
    revalidatePath(`/admin/frames/${id}`);
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
  redirect(`/admin/frames/${id}?status=saved`);
}

export async function deleteFrameAction(formData: FormData) {
  await assertAdmin();
  const id = getString(formData, "id");
  if (!id) return;
  const existing = await frameRepository.findById(id).catch(() => null);
  await frameRepository.delete(id);
  if (existing) {
    await deleteStoredImage(existing.imageBucket, existing.imagePath);
  }
  revalidatePath("/admin/frames");
  redirect("/admin/frames?status=deleted");
}
