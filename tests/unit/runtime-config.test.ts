import { describe, expect, it } from "vitest";
import { missingRuntimeConfiguration } from "@/lib/config/runtime";

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

  it("requires remote database auth and production provider values", () => {
    const missing = missingRuntimeConfiguration({ ...core, TURSO_DATABASE_URL: "libsql://school.turso.io", CONFIG_ENV: "production", NEXT_PUBLIC_APP_URL: "http://localhost:3000" });
    expect(missing).toContain("TURSO_AUTH_TOKEN");
    expect(missing).toContain("FIREBASE_PROJECT_ID");
    expect(missing).toContain("CLOUDINARY_API_SECRET");
    expect(missing).toContain("NEXT_PUBLIC_APP_URL(https)");
  });
});

