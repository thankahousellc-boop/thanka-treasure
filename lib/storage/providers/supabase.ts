import { createClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";

import type { FileRef, StorageProvider, StorageUploadInput } from "../types";

export class SupabaseStorageProvider implements StorageProvider {
  private _client: ReturnType<typeof createClient> | null = null;

  private get client() {
    if (!this._client) {
      if (
        !publicEnv.NEXT_PUBLIC_SUPABASE_URL ||
        !serverEnv.SUPABASE_SERVICE_ROLE_KEY
      ) {
        throw new Error("Supabase storage configuration is missing.");
      }
      this._client = createClient(
        publicEnv.NEXT_PUBLIC_SUPABASE_URL,
        serverEnv.SUPABASE_SERVICE_ROLE_KEY,
      );
    }
    return this._client;
  }

  private get projectUrl() {
    if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
    }
    return publicEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
  }

  async upload(
    bucket: string,
    path: string,
    file: StorageUploadInput,
    opts?: {
      contentType?: string;
      cacheControl?: string;
      upsert?: boolean;
    },
  ): Promise<FileRef> {
    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, file, {
        contentType: opts?.contentType,
        cacheControl: opts?.cacheControl,
        upsert: opts?.upsert ?? false,
      });

    if (error) {
      throw error;
    }

    return { bucket, path };
  }

  async download(bucket: string, path: string): Promise<Blob> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .download(path);

    if (error) {
      throw error;
    }

    return data;
  }

  async delete(bucket: string, paths: string[]): Promise<void> {
    const { error } = await this.client.storage.from(bucket).remove(paths);

    if (error) {
      throw error;
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    const encodedPath = path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `${this.projectUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
  }

  async createSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number,
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  }

  async list(bucket: string, prefix?: string) {
    const { data, error } = await this.client.storage.from(bucket).list(prefix);

    if (error) {
      throw error;
    }

    return (data ?? []).map((entry) => ({
      name: entry.name,
      path: prefix ? `${prefix}/${entry.name}` : entry.name,
    }));
  }

  async move(bucket: string, fromPath: string, toPath: string): Promise<void> {
    const { error } = await this.client.storage
      .from(bucket)
      .move(fromPath, toPath);

    if (error) {
      throw error;
    }
  }

  async copy(bucket: string, fromPath: string, toPath: string): Promise<void> {
    const { error } = await this.client.storage
      .from(bucket)
      .copy(fromPath, toPath);

    if (error) {
      throw error;
    }
  }
}
