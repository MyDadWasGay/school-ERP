import type { FastifyPluginAsync } from "fastify";
import { academicArchiveSchema, academicCreateSchema, academicListSchema } from "../schemas/academic.schemas";
import { authenticateApiRequest, requireApiCsrf, requireApiPermission } from "../auth/bearer-auth";
import { academicKinds, academicRecordSchema } from "../../../features/academics/schemas/academic.schema";
import { archiveAcademicRecord, createAcademicRecord, listAcademicRecords } from "../../../features/academics/services/academic.service";
import { writeAuditLog } from "../../../lib/audit/audit-log";
import { AppError } from "../../../lib/errors/app-error";

type Params = { kind: (typeof academicKinds)[number]; id?: string };

/** CLIENT_API_CONTRACT: Academic records are shared by the web client and Flutter; preserve scope, validation and archive semantics. */
export const academicRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: Params; Querystring: { search?: string } }>("/academics/:kind", { preHandler: authenticateApiRequest, schema: academicListSchema }, async (request) => { const user = requireApiPermission(request, "academics:read"); const kind = academicKinds.find((value) => value === request.params.kind); if (!kind) throw new AppError("VALIDATION_ERROR", "Invalid academic kind.", 422); const rows = await listAcademicRecords(user, kind, request.query.search); return { data: rows, meta: { requestId: request.id } }; });
  app.post<{ Params: Params; Body: Record<string, unknown> }>("/academics/:kind", { preHandler: [authenticateApiRequest, requireApiCsrf], schema: academicCreateSchema }, async (request, reply) => { const user = requireApiPermission(request, "academics:create"); const input = academicRecordSchema.parse({ ...request.body, kind: request.params.kind }); const row = await createAcademicRecord(user, input); await writeAuditLog(user, { action: "create", module: "academics", entityType: input.kind, entityId: row.id, campusId: row.campusId, after: { name: input.name, code: input.code } }); return reply.code(201).send({ data: { id: row.id }, meta: { requestId: request.id } }); });
  app.post<{ Params: Params }>("/academics/:kind/:id/archive", { preHandler: [authenticateApiRequest, requireApiCsrf], schema: academicArchiveSchema }, async (request) => { const user = requireApiPermission(request, "academics:delete"); const kind = academicKinds.find((value) => value === request.params.kind); if (!kind) throw new AppError("VALIDATION_ERROR", "Invalid academic kind.", 422); const row = await archiveAcademicRecord(user, kind, request.params.id ?? ""); await writeAuditLog(user, { action: "delete", module: "academics", entityType: kind, entityId: row.id, campusId: user.campusId, after: { status: "archived" } }); return { data: { id: row.id }, meta: { requestId: request.id } }; });
};
