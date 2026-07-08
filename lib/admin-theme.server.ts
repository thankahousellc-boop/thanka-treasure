import "server-only";

import { cookies } from "next/headers";

import { ADMIN_THEME_COOKIE, type AdminTheme } from "./admin-theme";

/**
 * Reads the persisted admin theme from the request cookie.
 * Returns null when unset so the layout can defer to the OS preference
 * (resolved client-side by the no-flash script).
 */
export async function getAdminTheme(): Promise<AdminTheme | null> {
  const store = await cookies();
  const value = store.get(ADMIN_THEME_COOKIE)?.value;
  return value === "dark" || value === "light" ? value : null;
}
