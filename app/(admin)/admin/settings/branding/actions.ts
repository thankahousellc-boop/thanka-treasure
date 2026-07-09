"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  BRANDING_CACHE_TAG,
  BRANDING_SETTINGS_KEY,
  type BrandingValue,
} from "@/lib/branding";
import { settingsRepository } from "@/lib/repositories/settings-repository";
import { BUCKETS, storage } from "@/lib/storage";

const colorRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const brandingSchema = z.object({
  brandName: z.string().min(1).max(120),
  brandTagline: z.string().max(180).optional(),
  bodyFont: z.enum(["inter", "cormorant"]),
  displayFont: z.enum(["inter", "cormorant"]),
  ink: z.string().regex(colorRegex),
  inkSoft: z.string().regex(colorRegex),
  inkMute: z.string().regex(colorRegex),
  paper: z.string().regex(colorRegex),
  paper2: z.string().regex(colorRegex),
  saffron: z.string().regex(colorRegex),
  gold: z.string().regex(colorRegex),
});

const logoMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);
const faviconMimeTypes = new Set([
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/png",
  "image/svg+xml",
]);
const logoSizeLimit = 2 * 1024 * 1024;
const faviconSizeLimit = 1 * 1024 * 1024;

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function sanitizeFileName(name: string) {
  const [base, ext = ""] = name.split(/\.(?=[^\.]+$)/);
  const safeBase = (base || "logo")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const safeExt = ext
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10);
  return safeExt ? `${safeBase || "logo"}.${safeExt}` : safeBase || "logo";
}

async function uploadLogo(file: File, label: string) {
  if (!logoMimeTypes.has(file.type)) {
    throw new Error("Logo must be JPEG, PNG, WEBP, or SVG.");
  }
  if (file.size > logoSizeLimit) {
    throw new Error("Logo must be under 2MB.");
  }
  const path = `branding/${label}/${Date.now()}-${sanitizeFileName(file.name || label)}`;
  return storage.upload(BUCKETS.SITE_ASSETS, path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
}

async function uploadFavicon(file: File) {
  if (!faviconMimeTypes.has(file.type)) {
    throw new Error("Favicon must be an ICO, PNG, or SVG file.");
  }
  if (file.size > faviconSizeLimit) {
    throw new Error("Favicon must be under 1MB.");
  }
  const path = `branding/favicon/${Date.now()}-${sanitizeFileName(file.name || "favicon")}`;
  return storage.upload(BUCKETS.SITE_ASSETS, path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
}

export async function updateBrandingAction(formData: FormData) {
  await assertAdmin();

  const parsed = brandingSchema.safeParse({
    brandName: getString(formData, "brandName"),
    brandTagline: getString(formData, "brandTagline") || undefined,
    bodyFont: getString(formData, "bodyFont"),
    displayFont: getString(formData, "displayFont"),
    ink: getString(formData, "ink"),
    inkSoft: getString(formData, "inkSoft"),
    inkMute: getString(formData, "inkMute"),
    paper: getString(formData, "paper"),
    paper2: getString(formData, "paper2"),
    saffron: getString(formData, "saffron"),
    gold: getString(formData, "gold"),
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid branding payload: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`,
    );
  }

  const data = parsed.data;

  const existing =
    (await settingsRepository.get<BrandingValue>(BRANDING_SETTINGS_KEY)) ?? {};

  let logoLight = existing.logoLight ?? null;
  let logoDark = existing.logoDark ?? null;
  let favicon = existing.favicon ?? null;

  const lightFile = formData.get("logoLight");
  if (lightFile instanceof File && lightFile.size > 0) {
    logoLight = await uploadLogo(lightFile, "light");
  }

  const darkFile = formData.get("logoDark");
  if (darkFile instanceof File && darkFile.size > 0) {
    logoDark = await uploadLogo(darkFile, "dark");
  }

  const faviconFile = formData.get("favicon");
  if (faviconFile instanceof File && faviconFile.size > 0) {
    favicon = await uploadFavicon(faviconFile);
  }

  if (getString(formData, "removeLogoLight") === "on") {
    logoLight = null;
  }
  if (getString(formData, "removeLogoDark") === "on") {
    logoDark = null;
  }
  if (getString(formData, "removeFavicon") === "on") {
    favicon = null;
  }

  const next: BrandingValue = {
    brandName: data.brandName,
    brandTagline: data.brandTagline ?? "",
    bodyFont: data.bodyFont,
    displayFont: data.displayFont,
    colors: {
      ink: data.ink,
      inkSoft: data.inkSoft,
      inkMute: data.inkMute,
      paper: data.paper,
      paper2: data.paper2,
      saffron: data.saffron,
      gold: data.gold,
    },
    logoLight,
    logoDark,
    favicon,
  };

  await settingsRepository.set(BRANDING_SETTINGS_KEY, next);

  revalidateTag(BRANDING_CACHE_TAG, "max");
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/branding");

  redirect("/admin/settings/branding?status=branding-saved");
}
