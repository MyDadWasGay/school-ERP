import { v2 as cloudinary } from "cloudinary";
import { AppError } from "@/lib/errors/app-error";
import { createUploadSignature } from "./signatures";
import { allowedFormatsFor } from "./policy";

function safeFolderSegment(value: string) {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(value)) {
    throw new AppError("VALIDATION_ERROR", "Upload folder identifier is invalid.", 422);
  }
  return value;
}

export function getSignedUploadParams(organizationId: string, entityType: string, entityId: string, resourceType: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  return createUploadSignature({
    timestamp,
    folder: `school-erp/${safeFolderSegment(organizationId)}/${safeFolderSegment(entityType)}/${safeFolderSegment(entityId)}`,
    allowedFormats: allowedFormatsFor(resourceType),
  });
}

export async function verifyCloudinaryAsset(input: {
  publicId: string;
  resourceType: "image" | "raw" | "video";
  secureUrl: string;
  version?: number;
}) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new AppError("PROVIDER_NOT_CONFIGURED", "Cloudinary is not configured.", 503);
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  try {
    const asset = await cloudinary.api.resource(input.publicId, {
      resource_type: input.resourceType,
      type: "authenticated",
    }) as {
      public_id: string;
      secure_url: string;
      resource_type: "image" | "raw" | "video";
      format?: string;
      bytes?: number;
      width?: number;
      height?: number;
      version?: number;
      original_filename?: string;
    };
    if (
      asset.public_id !== input.publicId
      || asset.resource_type !== input.resourceType
      || asset.secure_url !== input.secureUrl
      || (input.version !== undefined && asset.version !== input.version)
    ) {
      throw new AppError("VALIDATION_ERROR", "Cloudinary metadata does not match the uploaded asset.", 422);
    }
    return asset;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("INTEGRATION_ERROR", "Unable to verify the uploaded Cloudinary asset.", 502);
  }
}
