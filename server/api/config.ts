import { AppError } from "../../lib/errors/app-error";

export function readCorsOrigins(
  value = process.env.API_CORS_ORIGINS ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000",
) {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of origins) {
    if (origin === "*") {
      throw new AppError(
        "CONFIGURATION_ERROR",
        "API_CORS_ORIGINS must contain explicit HTTP(S) origins without paths.",
        503,
      );
    }
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new AppError(
        "CONFIGURATION_ERROR",
        "API_CORS_ORIGINS contains an invalid origin.",
        503,
      );
    }
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.origin !== origin
    ) {
      throw new AppError(
        "CONFIGURATION_ERROR",
        "API_CORS_ORIGINS must contain explicit HTTP(S) origins without paths.",
        503,
      );
    }
  }
  return origins;
}
