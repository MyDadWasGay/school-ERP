import { describe, expect, it } from "vitest";
import { missingApiRuntimeConfiguration, missingRuntimeConfiguration } from "@/lib/config/runtime";

const core = {
  TURSO_DATABASE_URL: "file:test.db",
  APP_ENCRYPTION_SECRET: "a".repeat(32),
  INTERNAL_JOB_SECRET: "b".repeat(32),
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
};

describe("runtime configuration", () => {
  it("accepts a local development configuration", () => {
    expect(missingRuntimeConfiguration(core)).toEqual([]);
  });

  it("accepts a Vercel preview deployment without an explicit app URL", () => {
    expect(missingRuntimeConfiguration({
      TURSO_DATABASE_URL: "file:test.db",
      APP_ENCRYPTION_SECRET: "a".repeat(32),
      INTERNAL_JOB_SECRET: "b".repeat(32),
      VERCEL_ENV: "preview",
      VERCEL_URL: "school-erp-preview.vercel.app",
    })).toEqual([]);
  });

  it("requires remote database auth and released production providers", () => {
    const missing = missingRuntimeConfiguration({
      ...core,
      TURSO_DATABASE_URL: "libsql://school.turso.io",
      CONFIG_ENV: "production",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      API_INTERNAL_BASE_URL: "https://api.school-erp.example.com",
      FIREBASE_PROJECT_ID: "school-erp",
      FIREBASE_CLIENT_EMAIL: "firebase-admin@example.com",
      FIREBASE_PRIVATE_KEY: "private-key",
      NEXT_PUBLIC_FIREBASE_API_KEY: "public-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "school-erp.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "school-erp",
      NEXT_PUBLIC_FIREBASE_APP_ID: "app-id",
      CLOUDINARY_CLOUD_NAME: "school-erp",
      CLOUDINARY_API_KEY: "cloudinary-key",
      CLOUDINARY_API_SECRET: "cloudinary-secret",
    });
    expect(missing).toContain("TURSO_AUTH_TOKEN");
    expect(missing).toContain("NEXT_PUBLIC_APP_URL(https)");
    expect(missing).not.toContain("RESEND_API_KEY");
  });

  it("requires a complete optional adapter when one of its values is supplied", () => {
    const missing = missingRuntimeConfiguration({
      ...core,
      CONFIG_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://school-erp.example.com",
      API_INTERNAL_BASE_URL: "https://api.school-erp.example.com",
      FIREBASE_PROJECT_ID: "school-erp",
      FIREBASE_CLIENT_EMAIL: "firebase-admin@example.com",
      FIREBASE_PRIVATE_KEY: "private-key",
      NEXT_PUBLIC_FIREBASE_API_KEY: "public-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "school-erp.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "school-erp",
      NEXT_PUBLIC_FIREBASE_APP_ID: "app-id",
      CLOUDINARY_CLOUD_NAME: "school-erp",
      CLOUDINARY_API_KEY: "cloudinary-key",
      CLOUDINARY_API_SECRET: "cloudinary-secret",
      RESEND_FROM_EMAIL: "School ERP <no-reply@example.com>",
    });
    expect(missing).toContain("RESEND_API_KEY");
  });

  it("keeps API readiness independent from Vercel-only web variables", () => {
    expect(missingApiRuntimeConfiguration({
      TURSO_DATABASE_URL: "libsql://school.turso.io",
      TURSO_AUTH_TOKEN: "turso-token",
      APP_ENCRYPTION_SECRET: "a".repeat(32),
      INTERNAL_JOB_SECRET: "b".repeat(32),
      CONFIG_ENV: "production",
      FIREBASE_PROJECT_ID: "school-erp",
      FIREBASE_CLIENT_EMAIL: "firebase-admin@example.com",
      FIREBASE_PRIVATE_KEY: "private-key",
      CLOUDINARY_CLOUD_NAME: "school-erp",
      CLOUDINARY_API_KEY: "cloudinary-key",
      CLOUDINARY_API_SECRET: "cloudinary-secret",
    })).toEqual([]);
  });
});
