import { loadEnvConfig } from "@next/env";

/** Load the same .env.local/.env precedence that Next.js uses for CLI jobs. */
export function loadDatabaseEnv() {
  loadEnvConfig(process.cwd());
}
