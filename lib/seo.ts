import { publicEnv } from "@/lib/env";

const FALLBACK_SITE_URL = "https://thankatreasure.com";

export function getSiteUrl() {
  return publicEnv.NEXT_PUBLIC_APP_URL ?? FALLBACK_SITE_URL;
}

export function getAbsoluteUrl(pathname: string) {
  return new URL(pathname, getSiteUrl()).toString();
}

export function toPlainText(input: string) {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildMetaDescription(
  input: string | null | undefined,
  fallback: string,
  maxLength = 160,
) {
  const normalized = input ? toPlainText(input) : "";
  const base = normalized.length > 0 ? normalized : fallback;

  if (base.length <= maxLength) {
    return base;
  }

  return `${base.slice(0, Math.max(maxLength - 3, 0)).trimEnd()}...`;
}
