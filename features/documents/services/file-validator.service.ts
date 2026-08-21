import crypto from "node:crypto";
import path from "node:path";
import { AppError } from "@/lib/errors/app-error";

export type MagicTypeInfo = {
  mime: string;
  extension: string;
};

export const SUPPORTED_FILE_TYPES: Record<string, { mime: string; extensions: string[] }> = {
  pdf: { mime: "application/pdf", extensions: ["pdf"] },
  jpeg: { mime: "image/jpeg", extensions: ["jpg", "jpeg"] },
  png: { mime: "image/png", extensions: ["png"] },
  webp: { mime: "image/webp", extensions: ["webp"] },
};

/**
 * Detect file signature from buffer magic bytes
 */
export function detectMagicBytes(buffer: Buffer): MagicTypeInfo | null {
  if (buffer.length < 4) return null;

  // PDF: %PDF (0x25, 0x50, 0x44, 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { mime: "application/pdf", extension: "pdf" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", extension: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: "image/png", extension: "png" };
  }

  // WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return { mime: "image/webp", extension: "webp" };
  }

  return null;
}

/**
 * Sanitize filename to prevent directory traversal and injection attacks
 */
export function sanitizeFilename(originalFilename: string): string {
  if (!originalFilename || typeof originalFilename !== "string") {
    return `document_${Date.now()}`;
  }
  // Strip paths
  const basename = path.basename(originalFilename);
  // Remove null bytes, control chars, dangerous characters
  const clean = basename
    .replace(/\0/g, "")
    .replace(/[\\/:\*\?"<>\|]/g, "_")
    .replace(/\.\.+/g, ".")
    .trim();

  return clean.length > 0 && clean !== "." ? clean.slice(0, 150) : `document_${Date.now()}`;
}

/**
 * Compute SHA-256 hash of a buffer
 */
export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export type FileValidationResult = {
  valid: boolean;
  sanitizedFilename: string;
  mimeType: string;
  fileExtension: string;
  fileSizeBytes: number;
  fileHash: string;
};

/**
 * Validate uploaded document against document type configuration
 */
export function validateUploadedFile(
  buffer: Buffer,
  claimedFilename: string,
  claimedMimeType?: string,
  options?: {
    allowedTypes?: string[]; // e.g. ["pdf", "jpg", "jpeg", "png", "webp"]
    maxSizeBytes?: number;
  },
): FileValidationResult {
  const maxBytes = options?.maxSizeBytes ?? 15_728_640; // 15MB default
  if (buffer.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Uploaded file cannot be empty.", 422);
  }
  if (buffer.length > maxBytes) {
    throw new AppError(
      "VALIDATION_ERROR",
      `File size (${(buffer.length / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of ${(maxBytes / (1024 * 1024)).toFixed(1)} MB.`,
      422,
    );
  }

  const sanitized = sanitizeFilename(claimedFilename);
  const extMatch = sanitized.match(/\.([a-zA-Z0-9]+)$/);
  const claimedExt = extMatch ? extMatch[1].toLowerCase() : "";

  const magic = detectMagicBytes(buffer);
  if (!magic) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Unsupported file format. Please upload a valid PDF, JPEG, PNG, or WebP document.",
      422,
    );
  }

  // Cross-check extension against magic byte inspection
  const isExtCompatible =
    (magic.extension === "pdf" && claimedExt === "pdf") ||
    (magic.extension === "jpg" && ["jpg", "jpeg"].includes(claimedExt)) ||
    (magic.extension === "png" && claimedExt === "png") ||
    (magic.extension === "webp" && claimedExt === "webp");

  if (!isExtCompatible && claimedExt) {
    throw new AppError(
      "VALIDATION_ERROR",
      `File extension (.${claimedExt}) does not match actual file content signature (${magic.mime}).`,
      422,
    );
  }

  // Check allowlist
  if (options?.allowedTypes && options.allowedTypes.length > 0) {
    const normalizedAllowed = options.allowedTypes.map((t) => t.toLowerCase().replace(/^\./, ""));
    const allowed =
      normalizedAllowed.includes(magic.extension) ||
      (magic.extension === "jpg" && normalizedAllowed.includes("jpeg")) ||
      (magic.extension === "jpg" && normalizedAllowed.includes("jpg"));

    if (!allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Document format ${magic.extension.toUpperCase()} is not allowed for this document type. Allowed: ${normalizedAllowed.join(", ").toUpperCase()}`,
        422,
      );
    }
  }

  const fileHash = computeFileHash(buffer);

  return {
    valid: true,
    sanitizedFilename: sanitized,
    mimeType: magic.mime,
    fileExtension: magic.extension,
    fileSizeBytes: buffer.length,
    fileHash,
  };
}
