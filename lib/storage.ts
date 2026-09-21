import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

// S3-compatible adapter. Reads standard env vars (STORAGE_BUCKET,
// STORAGE_REGION, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, and optionally
// STORAGE_ENDPOINT for non-AWS S3-compatible providers like Cloudflare R2)
// — never hardcode credentials. The bucket must allow public s3:GetObject
// on its objects so uploaded images are directly viewable in the app.
class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor() {
    const bucket = process.env.STORAGE_BUCKET;
    const region = process.env.STORAGE_REGION;
    const accessKeyId = process.env.STORAGE_ACCESS_KEY;
    const secretAccessKey = process.env.STORAGE_SECRET_KEY;
    const endpoint = process.env.STORAGE_ENDPOINT || undefined;

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "S3StorageAdapter requires STORAGE_BUCKET, STORAGE_REGION, STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY."
      );
    }

    this.bucket = bucket;
    this.client = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.publicBaseUrl = endpoint
      ? `${endpoint.replace(/\/$/, "")}/${bucket}`
      : `https://${bucket}.s3.${region}.amazonaws.com`;
  }

  async uploadFile(
    file: Buffer,
    opts: { filename: string; contentType: string; folder: string }
  ): Promise<UploadResult> {
    const ext = path.extname(opts.filename) || "";
    const key = `${opts.folder}/${randomUUID()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: opts.contentType,
      })
    );

    return { url: `${this.publicBaseUrl}/${key}`, key };
  }
}

export function getStorageAdapter(): StorageAdapter {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "s3") return new S3StorageAdapter();
  return new LocalDiskStorageAdapter();
}
