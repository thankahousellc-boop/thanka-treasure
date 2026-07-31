import { unstable_cache } from "next/cache";
import { cache } from "react";

import { settingsRepository } from "@/lib/repositories/settings-repository";
import { resolveUrl } from "@/lib/storage/resolve-url";

export const BRANDING_CACHE_TAG = "settings:branding";

export const BRANDING_SETTINGS_KEY = "branding";

export type BrandingFontKey = "inter" | "cormorant";

export type BrandingValue = {
  brandName?: string;
  brandTagline?: string;
  logoLight?: { bucket: string; path: string } | null;
  logoDark?: { bucket: string; path: string } | null;
  favicon?: { bucket: string; path: string } | null;
  colors?: {
    ink?: string;
    inkSoft?: string;
    inkMute?: string;
    paper?: string;
    paper2?: string;
    saffron?: string;
    gold?: string;
  };
  bodyFont?: BrandingFontKey;
  displayFont?: BrandingFontKey;
};

export type Branding = {
  brandName: string;
  brandTagline: string;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  colors: Required<NonNullable<BrandingValue["colors"]>>;
  bodyFont: BrandingFontKey;
  displayFont: BrandingFontKey;
};

const DEFAULT_BRANDING: Branding = {
  brandName: "Thanka Treasure",
  brandTagline: "Sacred Art · Est. 1978",
  logoLightUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  colors: {
    ink: "#5c1f2a",
    inkSoft: "#7a2e3a",
    inkMute: "#a07880",
    paper: "#fcfaf8",
    paper2: "#f5edeb",
    saffron: "#c9772d",
    gold: "#b58a4a",
  },
  bodyFont: "inter",
  displayFont: "cormorant",
};

const loadBranding = unstable_cache(
  async (): Promise<Branding> => {
    let raw: BrandingValue | null = null;
    try {
      raw = await settingsRepository.get<BrandingValue>(BRANDING_SETTINGS_KEY);
    } catch {
      raw = null;
    }

    return {
      brandName: raw?.brandName?.trim() || DEFAULT_BRANDING.brandName,
      brandTagline: raw?.brandTagline?.trim() ?? DEFAULT_BRANDING.brandTagline,
      logoLightUrl: raw?.logoLight ? resolveUrl(raw.logoLight) : null,
      logoDarkUrl: raw?.logoDark ? resolveUrl(raw.logoDark) : null,
      faviconUrl: raw?.favicon ? resolveUrl(raw.favicon) : null,
      colors: {
        ...DEFAULT_BRANDING.colors,
        ...(raw?.colors ?? {}),
      },
      bodyFont: raw?.bodyFont ?? DEFAULT_BRANDING.bodyFont,
      displayFont: raw?.displayFont ?? DEFAULT_BRANDING.displayFont,
    };
  },
  ["branding"],
  { tags: [BRANDING_CACHE_TAG], revalidate: 3600 },
);

export const getBranding = cache(loadBranding);

export function brandingToCssVariables(branding: Branding): string {
  const c = branding.colors;
  return [
    `--color-ink:${c.ink}`,
    `--color-ink-soft:${c.inkSoft}`,
    `--color-ink-mute:${c.inkMute}`,
    `--color-paper:${c.paper}`,
    `--color-paper-2:${c.paper2}`,
    `--color-saffron:${c.saffron}`,
    `--color-gold:${c.gold}`,
    `--color-bg-primary:${c.paper}`,
    `--color-bg-secondary:${c.paper2}`,
    `--color-bg-accent:${c.ink}`,
    `--color-text-primary:${c.ink}`,
    `--color-text-secondary:${c.inkSoft}`,
    `--color-text-on-accent:${c.paper}`,
    `--color-link:${c.inkSoft}`,
    `--color-link-hover:${c.ink}`,
  ].join(";");
}
