import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { FastifyInstance } from "fastify";
import { isSafeRequestId } from "../../../config/request-id";

export function resolveRequestId(request: IncomingMessage) {
  const candidate = request.headers["x-request-id"];
  return typeof candidate === "string" && isSafeRequestId(candidate)
    ? candidate
    : randomUUID();
}

export function registerRequestContext(app: FastifyInstance) {
  app.addHook("onSend", async (request, reply) => {
    /** CLIENT_API_CONTRACT: Safe correlation ID for web, Flutter and support reports. */
    reply.header("x-request-id", request.id);
  });
}
