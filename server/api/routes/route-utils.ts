import type { FastifyReply, FastifyRequest } from "fastify";
import { z, type ZodTypeAny } from "zod";
import { AppError } from "../../../lib/errors/app-error";
import { writeAuditLog, type AuditInput } from "../../../lib/audit/audit-log";
import type { CurrentUser } from "../../../lib/auth/types";

export function parseApiBody<T extends ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      result.error.issues[0]?.message ?? "The request is invalid.",
      422,
      result.error.flatten().fieldErrors,
    );
  }
  return result.data;
}

export function apiSuccess<T>(request: FastifyRequest, data: T) {
  return { data, meta: { requestId: request.id } };
}

export function apiCreated<T>(reply: FastifyReply, request: FastifyRequest, data: T) {
  return reply.code(201).send(apiSuccess(request, data));
}

export async function auditCommand(
  user: CurrentUser,
  input: AuditInput,
) {
  await writeAuditLog(user, input);
}

export function queryString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function pageQuery(query: { page?: unknown; pageSize?: unknown }) {
  const parsed = z.object({
    page: z.coerce.number().int().min(1).max(10_000).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  }).parse(query);
  return parsed;
}

export function routeSchema(summary: string, body?: Record<string, unknown>) {
  return {
    summary,
    tags: ["domain"],
    security: [{ firebaseBearer: [] }, { apiSessionCookie: [] }],
    ...(body ? { body: { type: "object", additionalProperties: true, ...body } } : {}),
    response: {
      200: { type: "object", required: ["data", "meta"], additionalProperties: true },
      201: { type: "object", required: ["data", "meta"], additionalProperties: true },
    },
  } as const;
}
