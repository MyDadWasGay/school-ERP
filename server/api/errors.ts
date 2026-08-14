import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../../lib/errors/app-error";
import { databaseErrorIncludes } from "../../lib/errors/database-error";

function zodFields(error: ZodError) {
  return error.flatten().fieldErrors;
}

/** Stable error contract shared by browser and Flutter API clients. */
export function registerApiErrorHandler(app: FastifyInstance) {
  app.setErrorHandler(
    (error: FastifyError | AppError | ZodError, request, reply) => {
      const requestId = request.id;
      if (error instanceof AppError) {
        return reply.code(error.status).send({
          error: {
            code: error.code,
            message: error.message,
            requestId,
            ...(error.details ? { fields: error.details } : {}),
          },
        });
      }
      if (error instanceof ZodError) {
        return reply.code(422).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "The request is invalid.",
            requestId,
            fields: zodFields(error),
          },
        });
      }
      if (databaseErrorIncludes(error, "SECTION_CAPACITY_REACHED")) {
        return reply.code(409).send({
          error: {
            code: "CONFLICT",
            message: "The selected section reached capacity while this request was being saved.",
            requestId,
          },
        });
      }
      if (databaseErrorIncludes(error, "ROLL_NUMBER_IN_USE")) {
        return reply.code(409).send({
          error: {
            code: "DUPLICATE_RECORD",
            message: "That roll number is already in use in the selected section.",
            requestId,
          },
        });
      }
      if (databaseErrorIncludes(error, "applications_org_source_enquiry_unique")) {
        return reply.code(409).send({
          error: {
            code: "CONFLICT",
            message: "This enquiry has already been converted into an application.",
            requestId,
          },
        });
      }
      if (databaseErrorIncludes(error, "import_jobs_org_entity_idempotency_idx")) {
        return reply.code(409).send({
          error: {
            code: "CONFLICT",
            message: "An import with this idempotency key already exists.",
            requestId,
          },
        });
      }
      if (error.validation) {
        return reply.code(422).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "The request is invalid.",
            requestId,
            fields: error.validation,
          },
        });
      }
      if (error.statusCode === 429) {
        return reply.code(429).send({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Try again later.",
            requestId,
          },
        });
      }
      request.log.error({ err: error, requestId }, "Unhandled API error");
      return reply.code(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: "The API could not complete the request.",
          requestId,
        },
      });
    },
  );
}
