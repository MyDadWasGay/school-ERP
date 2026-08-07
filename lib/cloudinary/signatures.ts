import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { AppError } from "@/lib/errors/app-error";

export function createUploadSignature(input: { timestamp: number; folder: string; allowedFormats: string[] }) {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!apiSecret || !apiKey || !cloudName) throw new AppError("INTEGRATION_ERROR", "Cloudinary is not configured.", 503);
  const params = {
    timestamp: input.timestamp,
    folder: input.folder,
    type: "authenticated",
    allowed_formats: input.allowedFormats.join(","),
  };
  const signature = cloudinary.utils.api_sign_request(params, apiSecret);
  return { ...params, signature, apiKey, cloudName };
}
