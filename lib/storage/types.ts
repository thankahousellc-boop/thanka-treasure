export type FileRef = {
  bucket: string;
  path: string;
};

export type StorageUploadInput = File | Blob | Buffer | ArrayBuffer;

export interface StorageProvider {
  upload(
    bucket: string,
    path: string,
    file: StorageUploadInput,
    opts?: {
      contentType?: string;
      cacheControl?: string;
      upsert?: boolean;
    },
  ): Promise<FileRef>;
  download(bucket: string, path: string): Promise<Blob>;
  delete(bucket: string, paths: string[]): Promise<void>;
  getPublicUrl(bucket: string, path: string): string;
  createSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number,
  ): Promise<string>;
  list(
    bucket: string,
    prefix?: string,
  ): Promise<{ name: string; path: string }[]>;
  move(bucket: string, fromPath: string, toPath: string): Promise<void>;
  copy(bucket: string, fromPath: string, toPath: string): Promise<void>;
}
