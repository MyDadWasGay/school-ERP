export type RuntimeEnvironment = Record<string, string | undefined>;

import { resolveAppUrl } from "@/lib/config/app-url";

const coreKeys = [
  "TURSO_DATABASE_URL",
  "APP_ENCRYPTION_SECRET",
  "INTERNAL_JOB_SECRET",
] as const;
const productionKeys = [
  "API_INTERNAL_BASE_URL",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "GOOGLE_CALENDAR_CLIENT_EMAIL",
  "GOOGLE_CALENDAR_PRIVATE_KEY",
  "GOOGLE_CALENDAR_ID",
  "MOODLE_BASE_URL",
  "MOODLE_TOKEN",
  "TRACCAR_BASE_URL",
  "TRACCAR_TOKEN",
] as const;

export function missingRuntimeConfiguration(
  environment: RuntimeEnvironment = process.env,
) {
  const production =
    environment.CONFIG_ENV === "staging" ||
    environment.CONFIG_ENV === "production" ||
    (environment.NODE_ENV === "production" && environment.CONFIG_ENV !== "ci");
  const missing = coreKeys
    .filter((key) => !environment[key]?.trim())
    .map(String);
  const databaseUrl = environment.TURSO_DATABASE_URL?.trim() ?? "";
  if (
    databaseUrl &&
    !databaseUrl.startsWith("file:") &&
    !environment.TURSO_AUTH_TOKEN?.trim()
  )
    missing.push("TURSO_AUTH_TOKEN");
  if ((environment.APP_ENCRYPTION_SECRET?.trim().length ?? 0) < 32)
    missing.push("APP_ENCRYPTION_SECRET(>=32)");
  if ((environment.INTERNAL_JOB_SECRET?.trim().length ?? 0) < 32)
    missing.push("INTERNAL_JOB_SECRET(>=32)");
  const appUrl = resolveAppUrl(environment);
  if (!appUrl) missing.push("NEXT_PUBLIC_APP_URL");
  if (production) {
    missing.push(
      ...productionKeys.filter((key) => !environment[key]?.trim()).map(String),
    );
    if (!appUrl.startsWith("https://"))
      missing.push("NEXT_PUBLIC_APP_URL(https)");
  }
  return [...new Set(missing)];
}
