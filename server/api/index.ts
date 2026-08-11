import { loadEnvConfig } from "@next/env";
import { buildApi } from "./app";

// Local API development uses the same root .env.local contract as Next.js.
// Render and other deployments already provide process.env through their
// secret manager, so this is a no-op there when no local env file exists.
loadEnvConfig(process.cwd());

/**
 * CLIENT_API_MIGRATION:
 * Render supplies PORT. Binding to 0.0.0.0 is required for the public Fastify
 * backend used by both web and Flutter; do not hard-code localhost or turn
 * this into a browser-only Next.js server entrypoint.
 */
const host = process.env.API_HOST?.trim() || "0.0.0.0";
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT/API_PORT must be a valid TCP port.");
}

async function main() {
  const app = await buildApi();
  await app.listen({ host, port });

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "Shutting down School ERP API");
    await app.close();
    process.exit(0);
  };

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

void main().catch((error) => {
  console.error("School ERP API failed to start.", error);
  process.exitCode = 1;
});
