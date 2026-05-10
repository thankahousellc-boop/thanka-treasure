import { unstable_cache } from "next/cache";
import { cache } from "react";

import { settingsRepository } from "@/lib/repositories/settings-repository";

export const STORE_CONTACT_KEY = "store_contact";
export const STOREFRONT_KEY = "storefront";

export const STORE_CONTACT_CACHE_TAG = "settings:store_contact";
export const STOREFRONT_CACHE_TAG = "settings:storefront";

export type StoreContactValue = {
  supportEmail?: string;
  secondaryEmail?: string;
  phone?: string;
  whatsapp?: string;
  addressLine1?: string;
  addressLine2?: string;
  instagram?: string;
  facebook?: string;
};

export type StoreContact = Required<{
  [K in keyof StoreContactValue]: string;
}>;

export type AnnouncementMessage = {
  text: string;
  highlight?: string;
};

export type StorefrontValue = {
  announcementMessages?: AnnouncementMessage[];
};

export type Storefront = {
  announcementMessages: AnnouncementMessage[];
};

const DEFAULT_STORE_CONTACT: StoreContact = {
  supportEmail: "hello@thankatreasure.com",
  secondaryEmail: "",
  phone: "+977 1 4480 220",
  whatsapp: "+9779800000000",
  addressLine1: "Boudhanath, Kathmandu",
  addressLine2: "",
  instagram: "",
  facebook: "",
};

const DEFAULT_STOREFRONT: Storefront = {
  announcementMessages: [
    { text: "Free worldwide shipping over", highlight: "$500" },
    { text: "Each piece blessed at Boudhanath Stupa" },
    { text: "Lifetime authenticity guarantee" },
  ],
};

const loadStoreContact = unstable_cache(
  async (): Promise<StoreContact> => {
    let raw: StoreContactValue | null = null;
    try {
      raw = await settingsRepository.get<StoreContactValue>(STORE_CONTACT_KEY);
    } catch {
      raw = null;
    }

    return {
      supportEmail: raw?.supportEmail?.trim() || DEFAULT_STORE_CONTACT.supportEmail,
      secondaryEmail: raw?.secondaryEmail?.trim() ?? DEFAULT_STORE_CONTACT.secondaryEmail,
      phone: raw?.phone?.trim() || DEFAULT_STORE_CONTACT.phone,
      whatsapp: raw?.whatsapp?.trim() || DEFAULT_STORE_CONTACT.whatsapp,
      addressLine1: raw?.addressLine1?.trim() || DEFAULT_STORE_CONTACT.addressLine1,
      addressLine2: raw?.addressLine2?.trim() ?? DEFAULT_STORE_CONTACT.addressLine2,
      instagram: raw?.instagram?.trim() ?? DEFAULT_STORE_CONTACT.instagram,
      facebook: raw?.facebook?.trim() ?? DEFAULT_STORE_CONTACT.facebook,
    };
  },
  ["store_contact"],
  { tags: [STORE_CONTACT_CACHE_TAG], revalidate: 3600 },
);

export const getStoreContact = cache(loadStoreContact);

const loadStorefront = unstable_cache(
  async (): Promise<Storefront> => {
    let raw: StorefrontValue | null = null;
    try {
      raw = await settingsRepository.get<StorefrontValue>(STOREFRONT_KEY);
    } catch {
      raw = null;
    }

    const messages = (raw?.announcementMessages ?? [])
      .map((entry) => ({
        text: entry?.text?.trim() ?? "",
        highlight: entry?.highlight?.trim() || undefined,
      }))
      .filter((entry) => entry.text.length > 0);

    return {
      announcementMessages:
        messages.length > 0 ? messages : DEFAULT_STOREFRONT.announcementMessages,
    };
  },
  ["storefront"],
  { tags: [STOREFRONT_CACHE_TAG], revalidate: 3600 },
);

export const getStorefront = cache(loadStorefront);

export function normalizeWhatsAppNumber(value: string) {
  return value.replace(/[^\d]/g, "");
}
