import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

export const settingsRepository = {
  async get<T = unknown>(key: string): Promise<T | null> {
    const db = getDb();
    const [setting] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);

    return (setting?.value as T | undefined) ?? null;
  },

  async set(key: string, value: unknown) {
    await requireAdminSession();

    const db = getDb();

    await db
      .insert(siteSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: {
          value,
          updatedAt: new Date(),
        },
      });
  },
};
