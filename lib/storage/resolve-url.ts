import { storage } from "@/lib/storage";
import type { FileRef } from "./types";

export function resolveUrl(ref: FileRef | null | undefined): string | null {
  if (!ref) {
    return null;
  }

  return storage.getPublicUrl(ref.bucket, ref.path);
}
