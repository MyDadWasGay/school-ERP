import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { healthRoutes } from "./routes/health.routes";
import { apiV1Routes } from "./routes";
import { registerApiErrorHandler } from "./errors";
import { registerOpenApi } from "./openapi";
import {
  registerRequestContext,
  resolveRequestId,
} from "./plugins/request-context";
import { readCorsOrigins } from "./config";
import "./types";

/**
 * CLIENT_API_CONTRACT:
 * This is the Fastify composition root for the single backend used by the
 * Next.js web frontend and Flutter. Put every stable client contract under
 * /api/v1 and register it here. Do not put domain logic in this file.
 */
export async function buildApi(
  options: { logger?: boolean; documentation?: boolean } = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            redact: {
              paths: [
                "req.headers.authorization",
                "req.headers.cookie",
                "req.body.token",
                "req.body.password",
                "req.body.signature",
              ],
              censor: "[REDACTED]",
            },
          },
    trustProxy: true,
    genReqId: resolveRequestId,
  });

  registerRequestContext(app);
  registerApiErrorHandler(app);
  if (options.documentation !== false) await registerOpenApi(app);

  // Keep the exact body for provider signatures while still exposing parsed
  // JSON to normal route handlers. CSV/text imports and webhooks use the same
  // bounded parser path and never trust a client-supplied tenant identifier.
  app.removeAllContentTypeParsers();
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (request, body, done) => {
      const rawBody = String(body);
      request.rawBody = rawBody;
      try {
        done(null, JSON.parse(rawBody));
      } catch {
        done(new Error("Request body must contain valid JSON."));
      }
    },
  );
  app.addContentTypeParser(
    ["text/plain", "text/csv"],
    { parseAs: "string" },
    (request, body, done) => {
      request.rawBody = String(body);
      done(null, String(body));
    },
  );

  const allowedOrigins = readCorsOrigins();
  await app.register(cors, {
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
  });
  await app.register(helmet);
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

  await app.register(healthRoutes);
  // Keep Render's conventional probes stable while also publishing the same
  // health contract under the versioned API boundary for web and Flutter.
  await app.register(healthRoutes, { prefix: "/api/v1" });
  await app.register(apiV1Routes, { prefix: "/api/v1" });
  return app;
}
