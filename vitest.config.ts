import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// CLIENT_API_MIGRATION: Keep Fastify API tests in the normal Vitest gate so a
// future web or Flutter endpoint cannot be added without repository coverage.
export default defineConfig({ plugins: [react()], resolve: { alias: { "@": path.resolve(__dirname, ".") } }, test: { include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}", "features/**/tests/**/*.test.{ts,tsx}", "server/api/**/*.test.ts"], environment: "jsdom", setupFiles: ["./tests/setup.ts"], globals: true, testTimeout: 15_000 } });
