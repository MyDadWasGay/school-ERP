import type { FastifyPluginAsync } from "fastify";
import { sql } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { missingApiRuntimeConfiguration } from "../../../lib/config/runtime";
import { liveSchema, readySchema } from "../schemas";

/**
 * CLIENT_API_CONTRACT:
 * Render uses these unauthenticated probes for the shared web/Flutter backend.
 * They must not expose credentials or tenant data, and readiness must fail
 * closed when the database is absent.
 */
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health/live", { schema: liveSchema }, async (request) => ({
    data: { status: "ok", service: "school-erp-api" },
    meta: { requestId: request.id },
  }));

  app.get("/health/ready", { schema: readySchema }, async (request, reply) => {
    if (missingApiRuntimeConfiguration().length) {
      return reply.code(503).send({
        error: {
          code: "NOT_READY",
          message: "The API configuration is not ready.",
          requestId: request.id,
        },
      });
    }
    try {
      await getDb().run(sql`select 1`);
      return {
        data: { status: "ready", database: "ok", service: "school-erp-api" },
        meta: { requestId: request.id },
      };
    } catch {
      return reply.code(503).send({
        error: {
          code: "NOT_READY",
          message: "The API database is not ready.",
          requestId: request.id,
        },
      });
    }
  });
};
