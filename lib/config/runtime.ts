export type RuntimeEnvironment = Record<string, string | undefined>;

const coreKeys = ["TURSO_DATABASE_URL", "APP_ENCRYPTION_SECRET", "INTERNAL_JOB_SECRET", "NEXT_PUBLIC_APP_URL"] as const;
const productionKeys = [
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
] as const;

export function missingRuntimeConfiguration(environment: RuntimeEnvironment = process.env) {
  const missing = coreKeys.filter((key) => !environment[key]?.trim()).map(String);
  const databaseUrl = environment.TURSO_DATABASE_URL?.trim() ?? "";
  if (databaseUrl && !databaseUrl.startsWith("file:") && !environment.TURSO_AUTH_TOKEN?.trim()) missing.push("TURSO_AUTH_TOKEN");
  if ((environment.APP_ENCRYPTION_SECRET?.trim().length ?? 0) < 32) missing.push("APP_ENCRYPTION_SECRET(>=32)");
  if ((environment.INTERNAL_JOB_SECRET?.trim().length ?? 0) < 32) missing.push("INTERNAL_JOB_SECRET(>=32)");
  const production = environment.CONFIG_ENV === "production" || (environment.NODE_ENV === "production" && environment.CONFIG_ENV !== "ci");
  if (production) {
    missing.push(...productionKeys.filter((key) => !environment[key]?.trim()).map(String));
    if (!(environment.NEXT_PUBLIC_APP_URL?.trim() ?? "").startsWith("https://")) missing.push("NEXT_PUBLIC_APP_URL(https)");
  }
  return [...new Set(missing)];
}

