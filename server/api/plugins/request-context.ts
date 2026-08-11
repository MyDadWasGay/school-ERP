import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { FastifyInstance } from "fastify";

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export function resolveRequestId(request: IncomingMessage) {
  const candidate = request.headers["x-request-id"];
  return typeof candidate === "string" && requestIdPattern.test(candidate)
    ? candidate
    : randomUUID();
}

export function registerRequestContext(app: FastifyInstance) {
  app.addHook("onSend", async (request, reply) => {
    /** CLIENT_API_CONTRACT: Safe correlation ID for web, Flutter and support reports. */
    reply.header("x-request-id", request.id);
  });
}
