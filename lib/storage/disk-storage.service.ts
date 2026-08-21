import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import type {
  DocumentStorageProvider,
  SignedUrlOptions,
  StorageUploadOptions,
  StoredObjectMetadata,
} from "./document-storage.interface";

export class PrivateDiskStorageProvider implements DocumentStorageProvider {
  private readonly baseDir: string;
  private readonly signingSecret: string;

  constructor(baseDir?: string, signingSecret?: string) {
    this.baseDir = path.resolve(
      process.cwd(),
      baseDir || process.env.STORAGE_ROOT_DIR || ".storage/documents",
    );
    this.signingSecret =
      signingSecret ||
      process.env.STORAGE_SIGNING_SECRET ||
      process.env.SESSION_SECRET ||
      "school-erp-secure-storage-signing-key-production-default";
  }

  private resolveSafePath(key: string): string {
    const sanitizedKey = key.replace(/\\/g, "/").replace(/^\/+/, "");
    if (sanitizedKey.includes("..") || /[\0<>:"|?*]/.test(sanitizedKey)) {
      throw new AppError("VALIDATION_ERROR", "Invalid storage path key.", 422);
    }
    const targetPath = path.resolve(this.baseDir, sanitizedKey);
    if (!targetPath.startsWith(this.baseDir)) {
      throw new AppError("SECURITY_ERROR", "Path traversal detected.", 403);
    }
    return targetPath;
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array,
    options?: StorageUploadOptions,
  ): Promise<StoredObjectMetadata> {
    const filePath = this.resolveSafePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);

    const hash = crypto.createHash("sha256").update(data).digest("hex");
    const stat = await fs.stat(filePath);

    return {
      key,
      sizeBytes: stat.size,
      contentType: options?.contentType,
      lastModified: stat.mtime,
      sha256Hash: hash,
    };
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.resolveSafePath(key);
    try {
      return await fs.readFile(filePath);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        throw new AppError("NOT_FOUND", "Document file not found in storage.", 404);
      }
      throw err;
    }
  }

  async delete(key: string): Promise<boolean> {
    const filePath = this.resolveSafePath(key);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (err: any) {
      if (err.code === "ENOENT") return false;
      throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolveSafePath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async generateSignedToken(
    key: string,
    options?: SignedUrlOptions,
  ): Promise<{ token: string; expiresAt: Date }> {
    const expiresIn = options?.expiresInSeconds ?? 900; // 15 minutes default
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const expUnix = Math.floor(expiresAt.getTime() / 1000);
    const disposition = options?.disposition ?? "inline";
    const filename = options?.downloadFilename ?? "";

    const payload = JSON.stringify({
      k: key,
      exp: expUnix,
      d: disposition,
      f: filename,
    });

    const b64Payload = Buffer.from(payload).toString("base64url");
    const signature = crypto
      .createHmac("sha256", this.signingSecret)
      .update(b64Payload)
      .digest("base64url");

    const token = `${b64Payload}.${signature}`;
    return { token, expiresAt };
  }

  async verifySignedToken(
    token: string,
  ): Promise<{ key: string; disposition: "inline" | "attachment"; filename?: string; valid: boolean }> {
    try {
      const parts = token.split(".");
      if (parts.length !== 2) {
        return { key: "", disposition: "inline", valid: false };
      }
      const [b64Payload, signature] = parts;
      const expectedSignature = crypto
        .createHmac("sha256", this.signingSecret)
        .update(b64Payload)
        .digest("base64url");

      if (signature !== expectedSignature) {
        return { key: "", disposition: "inline", valid: false };
      }

      const payload = JSON.parse(
        Buffer.from(b64Payload, "base64url").toString("utf8"),
      );
      const nowUnix = Math.floor(Date.now() / 1000);

      if (typeof payload.exp !== "number" || payload.exp < nowUnix) {
        return { key: "", disposition: "inline", valid: false };
      }

      return {
        key: payload.k,
        disposition: payload.d === "attachment" ? "attachment" : "inline",
        filename: payload.f || undefined,
        valid: true,
      };
    } catch {
      return { key: "", disposition: "inline", valid: false };
    }
  }

  async getMetadata(key: string): Promise<StoredObjectMetadata | null> {
    const filePath = this.resolveSafePath(key);
    try {
      const stat = await fs.stat(filePath);
      const data = await fs.readFile(filePath);
      const hash = crypto.createHash("sha256").update(data).digest("hex");
      return {
        key,
        sizeBytes: stat.size,
        lastModified: stat.mtime,
        sha256Hash: hash,
      };
    } catch {
      return null;
    }
  }
}
