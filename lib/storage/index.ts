import { SupabaseStorageProvider } from "./providers/supabase";
import type { StorageProvider } from "./types";

export const storage: StorageProvider = new SupabaseStorageProvider();

export { BUCKETS } from "./buckets";
export { resolveUrl } from "./resolve-url";
export type { StorageProvider, FileRef } from "./types";
