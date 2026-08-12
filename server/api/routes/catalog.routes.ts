import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { permissionForPath } from "../../../config/modules";
import {
  isReleasedCatalogRoute,
  isReleasedRoute,
} from "../../../config/route-registry";
import {
  archiveCatalogRecord,
  createCatalogRecord,
  getCatalogDefinition,
  listCatalogRecordsPage,
  updateCatalogRecord,
} from "../../../features/shared/services/catalog-records.service";
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
type RecordQuery = {
  route?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

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

/**
 * The catalog endpoint is an explicit allowlist, not a fallback for routes
 * that lack a dedicated implementation. Existing module_records data is
 * intentionally left untouched and is no longer reachable through this API.
 */
export function assertCatalogRoute(route: string) {
  if (!isReleasedRoute(route)) {
    throw new AppError("NOT_FOUND", "This workflow is not released.", 404);
  }
  if (dedicatedPrefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This workflow requires its dedicated versioned API route.",
      422,
    );
  }
  if (!isReleasedCatalogRoute(route)) {
    throw new AppError("NOT_FOUND", "This workflow is not released.", 404);
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
    { preHandler: authenticateApiRequest, schema: routeSchema("List released catalog records") },
    async (request) => {
      const route = request.query.route?.trim() ?? "";
      if (!route) throw new AppError("VALIDATION_ERROR", "A catalog route is required.", 422);
      assertCatalogRoute(route);
      const user = requireApiPermission(request, permissionForPath(route));
      const result = await listCatalogRecordsPage(user, route, {
        ...pageQuery(request.query),
        search: request.query.search?.trim() || undefined,
      });
      if (!result) throw new AppError("NOT_FOUND", "Catalog route not found.", 404);
      return apiSuccess(request, result);
    },
  );

  app.post<{ Body: unknown }>(
    "/catalog/records",
    { preHandler: [authenticateApiRequest, requireApiCsrf], schema: routeSchema("Create a released catalog record") },
    async (request, reply) => {
      const input = parseApiBody(createSchema, request.body);
      assertCatalogRoute(input.route);
      const user = requireApiPermission(request, writePermission(input.route, "create"));
      const catalog = getCatalogDefinition(input.route);
      if (!catalog) throw new AppError("NOT_FOUND", "Catalog route not found.", 404);
      const row = await createCatalogRecord(user, input.route, input);
      if (!row) throw new AppError("NOT_FOUND", "Catalog route not found.", 404);
      await auditCommand(user, {
        action: "create",
        module: writePermission(input.route, "create").split(":")[0] ?? "catalog",
        entityType: catalog.entityType,
        entityId: row.id,
        campusId: row.campusId,
        after: input,
      });
      return apiCreated(reply, request, { id: row.id });
    },
  );

  app.patch<{ Params: RecordParams; Body: unknown }>(
    "/catalog/records/:id",
    { preHandler: [authenticateApiRequest, requireApiCsrf], schema: routeSchema("Update a released catalog record") },
    async (request) => {
      const input = parseApiBody(updateSchema, { ...(request.body as Record<string, unknown>), id: request.params.id });
      assertCatalogRoute(input.route);
      const user = requireApiPermission(request, writePermission(input.route, "update"));
      const catalog = getCatalogDefinition(input.route);
      if (!catalog) throw new AppError("NOT_FOUND", "Catalog route not found.", 404);
      const row = await updateCatalogRecord(user, input.route, input);
      if (!row) throw new AppError("NOT_FOUND", "Catalog record not found.", 404);
      await auditCommand(user, {
        action: "update",
        module: "catalog",
        entityType: catalog.entityType,
        entityId: row.id,
        campusId: user.campusId,
        after: input,
      });
      return apiSuccess(request, { id: row.id });
    },
  );

  app.post<{ Params: RecordParams; Body: unknown }>(
    "/catalog/records/:id/archive",
    { preHandler: [authenticateApiRequest, requireApiCsrf], schema: routeSchema("Archive a released catalog record") },
    async (request) => {
      const input = parseApiBody(archiveSchema, { ...(request.body as Record<string, unknown>), id: request.params.id });
      assertCatalogRoute(input.route);
      const user = requireApiPermission(request, writePermission(input.route, "delete"));
      const catalog = getCatalogDefinition(input.route);
      if (!catalog) throw new AppError("NOT_FOUND", "Catalog route not found.", 404);
      const row = await archiveCatalogRecord(user, input.route, input.id);
      if (!row) throw new AppError("NOT_FOUND", "Catalog record not found.", 404);
      await auditCommand(user, {
        action: "delete",
        module: "catalog",
        entityType: catalog.entityType,
        entityId: row.id,
        campusId: user.campusId,
        after: { status: "archived" },
      });
      return apiSuccess(request, { id: row.id });
    },
  );
};
