import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { permissionForPath } from "../../../config/modules";
import { listModuleRecordsPage } from "../../../features/shared/services/module-records.service";
import {
  archiveCatalogRecord,
  createCatalogRecord,
  getCatalogDefinition,
  updateCatalogRecord,
} from "../../../features/shared/services/catalog-records.service";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { moduleRecords, workflowTransitions } from "../../../db/schema";
import { createId } from "../../../lib/utils/ids";
import { AppError } from "../../../lib/errors/app-error";
import {
  authenticateApiRequest,
  requireApiCsrf,
  requireApiPermission,
} from "../auth/bearer-auth";
import {
  apiCreated,
  apiSuccess,
  auditCommand,
  pageQuery,
  parseApiBody,
  routeSchema,
} from "./route-utils";

type RecordParams = { id: string };
type RecordQuery = { route?: string; search?: string; page?: number; pageSize?: number };

const routeName = z.string().regex(/^\/[a-z0-9\/-]+$/).max(160);
const createSchema = z.object({
  route: routeName,
  entityType: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  note: z.string().trim().max(500).optional(),
});
const updateSchema = createSchema.extend({
  id: z.string().trim().min(1).max(120),
  status: z.enum(["draft", "active", "pending", "completed"]),
});
const archiveSchema = z.object({
  id: z.string().trim().min(1).max(120),
  route: routeName,
  entityType: z.string().trim().min(2).max(80),
});

// These areas have state transitions or privacy/money invariants and must use
// their dedicated API route. The catalog endpoint is only a compatibility
// boundary for low-risk registry records.
const dedicatedPrefixes = [
  "/students",
  "/attendance",
  "/fees",
  "/accounts",
  "/payroll",
  "/exams",
  "/health",
  "/permissions",
  "/imports",
  "/integrations",
  "/transport/allocations",
  "/hostel/allotments",
];

function assertCatalogRoute(route: string) {
  if (dedicatedPrefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This workflow requires its dedicated versioned API route.",
      422,
    );
  }
}

function writePermission(route: string, operation: "create" | "update" | "delete") {
  const permission = permissionForPath(route);
  const permissionModule = permission.slice(0, permission.indexOf(":"));
  if (permissionModule === "settings") return "settings:update";
  return `${permissionModule}:${operation}`;
}

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: RecordQuery }>(
    "/catalog/records",
    { preHandler: authenticateApiRequest, schema: routeSchema("List low-risk catalog records") },
    async (request) => {
      const route = request.query.route?.trim() ?? "";
      if (!route) throw new AppError("VALIDATION_ERROR", "A catalog route is required.", 422);
      assertCatalogRoute(route);
      const user = requireApiPermission(request, permissionForPath(route));
      return apiSuccess(request, await listModuleRecordsPage(user, route, {
        ...pageQuery(request.query),
        search: request.query.search?.trim() || undefined,
      }));
    },
  );

  app.post<{ Body: unknown }>(
    "/catalog/records",
    { preHandler: [authenticateApiRequest, requireApiCsrf], schema: routeSchema("Create a low-risk catalog record") },
    async (request, reply) => {
      const input = parseApiBody(createSchema, request.body);
      assertCatalogRoute(input.route);
      const user = requireApiPermission(request, writePermission(input.route, "create"));
      const catalog = getCatalogDefinition(input.route);
      if (catalog) {
        const row = await createCatalogRecord(user, input.route, input);
        if (!row) throw new AppError("NOT_FOUND", "Catalog route not found.", 404);
        await auditCommand(user, { action: "create", module: writePermission(input.route, "create").split(":")[0] ?? "catalog", entityType: catalog.entityType, entityId: row.id, campusId: row.campusId, after: input });
        return apiCreated(reply, request, { id: row.id });
      }
      const id = createId("catalog_record");
      await getDb().insert(moduleRecords).values({
        id,
        organizationId: user.organizationId,
        campusId: user.campusId,
        module: writePermission(input.route, "create").split(":")[0] ?? "catalog",
        route: input.route,
        entityType: input.entityType,
        name: input.name,
        note: input.note,
        ownerUserId: user.id,
        createdBy: user.id,
        updatedBy: user.id,
      });
      await auditCommand(user, { action: "create", module: "catalog", entityType: input.entityType, entityId: id, campusId: user.campusId, after: input });
      return apiCreated(reply, request, { id });
    },
  );

  app.patch<{ Params: RecordParams; Body: unknown }>(
    "/catalog/records/:id",
    { preHandler: [authenticateApiRequest, requireApiCsrf], schema: routeSchema("Update a low-risk catalog record") },
    async (request) => {
      const input = parseApiBody(updateSchema, { ...(request.body as Record<string, unknown>), id: request.params.id });
      assertCatalogRoute(input.route);
      const user = requireApiPermission(request, writePermission(input.route, "update"));
      const catalog = getCatalogDefinition(input.route);
      if (catalog) {
        const row = await updateCatalogRecord(user, input.route, input);
        if (!row) throw new AppError("NOT_FOUND", "Catalog record not found.", 404);
        await auditCommand(user, { action: "update", module: "catalog", entityType: catalog.entityType, entityId: row.id, campusId: user.campusId, after: input });
        return apiSuccess(request, { id: row.id });
      }
      const existing = await getDb().query.moduleRecords.findFirst({ where: and(eq(moduleRecords.id, input.id), eq(moduleRecords.organizationId, user.organizationId), user.campusId ? eq(moduleRecords.campusId, user.campusId) : undefined, eq(moduleRecords.route, input.route)) });
      if (!existing) throw new AppError("NOT_FOUND", "Catalog record not found.", 404);
      await getDb().transaction(async (tx) => {
        await tx.update(moduleRecords).set({ name: input.name, note: input.note, status: input.status, updatedAt: new Date(), updatedBy: user.id }).where(and(eq(moduleRecords.id, existing.id), eq(moduleRecords.organizationId, user.organizationId)));
        if (existing.status !== input.status) await tx.insert(workflowTransitions).values({ organizationId: user.organizationId, campusId: existing.campusId, entityType: input.entityType, entityId: existing.id, fromStatus: existing.status, toStatus: input.status, transitionedBy: user.id, transitionedAt: new Date(), createdBy: user.id, updatedBy: user.id });
      });
      await auditCommand(user, { action: "update", module: "catalog", entityType: input.entityType, entityId: existing.id, campusId: existing.campusId, before: existing, after: input });
      return apiSuccess(request, { id: existing.id });
    },
  );

  app.post<{ Params: RecordParams; Body: unknown }>(
    "/catalog/records/:id/archive",
    { preHandler: [authenticateApiRequest, requireApiCsrf], schema: routeSchema("Archive a low-risk catalog record") },
    async (request) => {
      const input = parseApiBody(archiveSchema, { ...(request.body as Record<string, unknown>), id: request.params.id });
      assertCatalogRoute(input.route);
      const user = requireApiPermission(request, writePermission(input.route, "delete"));
      const catalog = getCatalogDefinition(input.route);
      if (catalog) {
        const row = await archiveCatalogRecord(user, input.route, input.id);
        if (!row) throw new AppError("NOT_FOUND", "Catalog record not found.", 404);
        await auditCommand(user, { action: "delete", module: "catalog", entityType: catalog.entityType, entityId: row.id, campusId: user.campusId, after: { status: "archived" } });
        return apiSuccess(request, { id: row.id });
      }
      const existing = await getDb().query.moduleRecords.findFirst({ where: and(eq(moduleRecords.id, input.id), eq(moduleRecords.organizationId, user.organizationId), user.campusId ? eq(moduleRecords.campusId, user.campusId) : undefined, eq(moduleRecords.route, input.route)) });
      if (!existing) throw new AppError("NOT_FOUND", "Catalog record not found.", 404);
      await getDb().transaction(async (tx) => {
        await tx.update(moduleRecords).set({ status: "archived", updatedAt: new Date(), updatedBy: user.id }).where(and(eq(moduleRecords.id, existing.id), eq(moduleRecords.organizationId, user.organizationId)));
        await tx.insert(workflowTransitions).values({ organizationId: user.organizationId, campusId: existing.campusId, entityType: existing.entityType, entityId: existing.id, fromStatus: existing.status, toStatus: "archived", transitionedBy: user.id, transitionedAt: new Date(), createdBy: user.id, updatedBy: user.id });
      });
      await auditCommand(user, { action: "delete", module: "catalog", entityType: existing.entityType, entityId: existing.id, campusId: existing.campusId, before: existing, after: { status: "archived" } });
      return apiSuccess(request, { id: existing.id });
    },
  );
};
