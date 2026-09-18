import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Storage adapter abstraction. Production should point this at an
 * S3-compatible bucket (AWS S3, Cloudflare R2, DigitalOcean Spaces) via
 * env vars; for local development it falls back to writing under
 * /public/uploads so the app runs with zero cloud credentials.
 *
 * Swap the implementation of `uploadFile` when wiring real S3 — nothing
 * else in the app should need to change since callers only see this
 * interface (garment images, condition-report photos, documents, etc).
 */

export interface UploadResult {
  url: string;
  key: string;
}

export interface StorageAdapter {
  uploadFile(file: Buffer, opts: { filename: string; contentType: string; folder: string }): Promise<UploadResult>;
}

class LocalDiskStorageAdapter implements StorageAdapter {
  async uploadFile(
    file: Buffer,
    opts: { filename: string; contentType: string; folder: string }
  ): Promise<UploadResult> {
    const ext = path.extname(opts.filename) || "";
    const key = `${opts.folder}/${randomUUID()}${ext}`;
    const fullPath = path.join(process.cwd(), "public", "uploads", key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file);
    return { url: `/uploads/${key}`, key };
  }
}

// Placeholder for a future S3-compatible adapter. Reads standard env vars
// (STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY)
// when present — never hardcode credentials.
class S3StorageAdapter implements StorageAdapter {
  async uploadFile(): Promise<UploadResult> {
    throw new Error(
      "S3StorageAdapter not yet implemented — set STORAGE_DRIVER=local until credentials are configured."
    );
  }
}

export function getStorageAdapter(): StorageAdapter {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "s3") return new S3StorageAdapter();
  return new LocalDiskStorageAdapter();
}
