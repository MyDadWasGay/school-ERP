import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const target = process.env.CONFIG_TARGET?.trim() || "web";
if (!["web", "api"].includes(target)) {
  console.error(`Configuration validation failed: CONFIG_TARGET must be web or api, received ${target}.`);
  process.exit(1);
}

function resolveAppUrl(environment) {
  const configuredUrl = environment.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  if (environment.VERCEL_ENV === "preview") {
    const vercelUrl = environment.VERCEL_URL?.trim();
    if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, "")}`;
  }
  return "";
}

const required = [
  "TURSO_DATABASE_URL",
  "APP_ENCRYPTION_SECRET",
  "INTERNAL_JOB_SECRET",
];
const missing = required.filter((name) => !process.env[name]?.trim());
if (
  process.env.TURSO_DATABASE_URL?.trim() &&
  !process.env.TURSO_DATABASE_URL.trim().startsWith("file:") &&
  !process.env.TURSO_AUTH_TOKEN?.trim()
)
  missing.push("TURSO_AUTH_TOKEN");
const tooShort = ["APP_ENCRYPTION_SECRET", "INTERNAL_JOB_SECRET"].filter(
  (name) => (process.env[name]?.trim().length ?? 0) < 32,
);
const appUrl = resolveAppUrl(process.env);
const requiredWebProviderKeys = [
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
];
const requiredApiProviderKeys = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];
const optionalProviderGroups = [
  ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
  ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
  ["GOOGLE_CALENDAR_CLIENT_EMAIL", "GOOGLE_CALENDAR_PRIVATE_KEY", "GOOGLE_CALENDAR_ID"],
  ["MOODLE_BASE_URL", "MOODLE_TOKEN"],
  ["TRACCAR_BASE_URL", "TRACCAR_TOKEN"],
];
if (["staging", "production"].includes(process.env.CONFIG_ENV ?? "")) {
  const requiredProviderKeys = target === "api" ? requiredApiProviderKeys : requiredWebProviderKeys;
  missing.push(...requiredProviderKeys.filter((name) => !process.env[name]?.trim()));
  for (const group of optionalProviderGroups) {
    if (group.some((name) => process.env[name]?.trim()))
      missing.push(...group.filter((name) => !process.env[name]?.trim()));
  }
}
if (target !== "api" && !appUrl) {
  missing.push("NEXT_PUBLIC_APP_URL");
} else if (
  target !== "api" &&
  ["staging", "production"].includes(process.env.CONFIG_ENV ?? "") &&
  !appUrl.startsWith("https://")
) {
  missing.push("NEXT_PUBLIC_APP_URL(https)");
}
if (tooShort.length)
  missing.push(...tooShort.map((name) => `${name}(>=32 characters)`));
if (missing.length) {
  console.error(`Configuration validation failed: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(
    `Configuration validation passed for ${process.env.CONFIG_ENV ?? "development"} (${target}).`,
  );
}
