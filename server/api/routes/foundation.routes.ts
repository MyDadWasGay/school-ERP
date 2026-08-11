import type { FastifyPluginAsync } from "fastify";
import {
  campusArchiveSchema,
  campusSchema,
  campusUpdateSchema,
} from "../../../features/foundation/schemas/organization.schema";
import {
  academicSetupArchiveSchema,
  academicSetupSchema,
  academicSetupUpdateSchema,
} from "../../../features/foundation/schemas/academic-setup.schema";
import {
  createCampus,
  archiveCampus,
  listCampuses,
  listOrganizations,
  updateCampus,
} from "../../../features/foundation/services/foundation.service";
import {
  archiveAcademicSetup,
  createAcademicSetup,
  getAcademicSetupOptions,
  listAcademicSetup,
  updateAcademicSetup,
} from "../../../features/foundation/services/academic-setup.service";
import {
  createPlatformSchool,
  getPlatformOverview,
  listPlatformAuditLogs,
  listPlatformSchools,
  updatePlatformSchoolStatus,
} from "../../../features/platform/services/platform.service";
import {
  createSchoolSchema,
  schoolStatusSchema,
} from "../../../features/platform/schemas/platform.schema";
import {
  delegationCreateSchema,
  delegationRevokeSchema,
  userAccessUpdateSchema,
} from "../../../features/users/schemas/user-access.schema";
import {
  createDelegation,
  getUserAccessDetail,
  listUsersPage,
  revokeDelegation,
  updateUserAccess,
} from "../../../features/users/services/access.service";
import { authenticateApiRequest, requireApiCsrf, requireApiPermission, requireApiPlatformAdmin } from "../auth/bearer-auth";
import { apiCreated, apiSuccess, auditCommand, parseApiBody, pageQuery, queryString, routeSchema } from "./route-utils";

type IdParams = { id: string };
type KindParams = { kind: "academic_year" | "class" | "section" | "subject" };
type UserParams = { id: string };
type DelegationParams = { id: string; delegationId: string };

const authenticated = { preHandler: authenticateApiRequest };
const mutation = { preHandler: [authenticateApiRequest, requireApiCsrf] };

export const foundationRoutes: FastifyPluginAsync = async (app) => {
  app.get("/organizations", authenticated, async (request) => {
    const user = requireApiPermission(request, "organizations:read");
    return apiSuccess(request, await listOrganizations(user));
  });

  app.get("/campuses", authenticated, async (request) => {
    const user = requireApiPermission(request, "campuses:read");
    return apiSuccess(request, await listCampuses(user));
  });

  app.post<{ Body: unknown }>("/campuses", { ...mutation, schema: routeSchema("Create a campus") }, async (request, reply) => {
    const user = requireApiPermission(request, "campuses:create");
    const input = parseApiBody(campusSchema, request.body);
    const row = await createCampus(user, input);
    await auditCommand(user, { action: "create", module: "campuses", entityType: "campus", entityId: row.id, after: row });
    return apiCreated(reply, request, { id: row.id });
  });

  app.patch<{ Params: IdParams; Body: unknown }>("/campuses/:id", { ...mutation, schema: routeSchema("Update a campus") }, async (request) => {
    const user = requireApiPermission(request, "campuses:update");
    const input = parseApiBody(campusUpdateSchema, { ...(request.body as Record<string, unknown>), id: request.params.id });
    const result = await updateCampus(user, input);
    await auditCommand(user, { action: "update", module: "campuses", entityType: "campus", entityId: result.updated.id, before: result.before, after: result.updated });
    return apiSuccess(request, { id: result.updated.id });
  });

  app.post<{ Params: IdParams }>("/campuses/:id/archive", mutation, async (request) => {
    const user = requireApiPermission(request, "campuses:update");
    const row = await archiveCampus(user, parseApiBody(campusArchiveSchema, { id: request.params.id }));
    await auditCommand(user, { action: "update", module: "campuses", entityType: "campus", entityId: row.id, after: { status: row.status } });
    return apiSuccess(request, { id: row.id });
  });

  app.get<{ Params: KindParams }>("/settings/:kind", authenticated, async (request) => {
    const user = requireApiPermission(request, "settings:read");
    const rows = await listAcademicSetup(user, request.params.kind);
    return apiSuccess(request, rows.map((row) => ({ ...row, startsOn: row.startsOn?.toISOString(), endsOn: row.endsOn?.toISOString() })));
  });

  app.get("/settings/options", authenticated, async (request) => {
    const user = requireApiPermission(request, "settings:read");
    return apiSuccess(request, await getAcademicSetupOptions(user));
  });

  app.post<{ Body: unknown }>("/settings", { ...mutation, schema: routeSchema("Create an academic setup record") }, async (request, reply) => {
    const user = requireApiPermission(request, "settings:update");
    const input = parseApiBody(academicSetupSchema, request.body);
    const row = await createAcademicSetup(user, input);
    await auditCommand(user, { action: "create", module: "settings", entityType: input.kind, entityId: row.id, campusId: row.campusId, after: row });
    return apiCreated(reply, request, { id: row.id });
  });

  app.patch<{ Params: KindParams & IdParams; Body: unknown }>("/settings/:kind/:id", { ...mutation, schema: routeSchema("Update an academic setup record") }, async (request) => {
    const user = requireApiPermission(request, "settings:update");
    const input = parseApiBody(academicSetupUpdateSchema, { ...(request.body as Record<string, unknown>), kind: request.params.kind, id: request.params.id });
    const row = await updateAcademicSetup(user, input);
    await auditCommand(user, { action: "update", module: "settings", entityType: input.kind, entityId: row.id, campusId: row.campusId, after: row });
    return apiSuccess(request, { id: row.id });
  });

  app.post<{ Params: KindParams & IdParams }>("/settings/:kind/:id/archive", mutation, async (request) => {
    const user = requireApiPermission(request, "settings:update");
    const input = parseApiBody(academicSetupArchiveSchema, { kind: request.params.kind, id: request.params.id });
    const row = await archiveAcademicSetup(user, input);
    await auditCommand(user, { action: "update", module: "settings", entityType: input.kind, entityId: row.id, campusId: row.campusId, after: { status: row.status } });
    return apiSuccess(request, { id: row.id });
  });

  app.get<{ Querystring: { search?: string } }>("/platform/overview", authenticated, async (request) => {
    requireApiPlatformAdmin(request);
    return apiSuccess(request, await getPlatformOverview());
  });

  app.get("/platform/me", authenticated, async (request) => {
    const admin = requireApiPlatformAdmin(request);
    return apiSuccess(request, {
      id: admin.id,
      email: admin.email,
      displayName: admin.displayName,
      emailVerified: admin.emailVerified,
      role: admin.role,
    });
  });

  app.get<{ Querystring: { search?: string } }>("/platform/schools", authenticated, async (request) => {
    requireApiPlatformAdmin(request);
    return apiSuccess(request, await listPlatformSchools(queryString(request.query.search)));
  });

  app.get("/platform/audit-logs", authenticated, async (request) => {
    requireApiPlatformAdmin(request);
    return apiSuccess(request, await listPlatformAuditLogs());
  });

  app.post<{ Body: unknown }>("/platform/schools", { ...mutation, schema: routeSchema("Provision a school") }, async (request, reply) => {
    const admin = requireApiPlatformAdmin(request);
    const input = parseApiBody(createSchoolSchema, request.body);
    const result = await createPlatformSchool(admin, input);
    return apiCreated(reply, request, result);
  });

  app.patch<{ Params: IdParams; Body: unknown }>("/platform/schools/:id/status", { ...mutation, schema: routeSchema("Update school lifecycle status") }, async (request) => {
    const admin = requireApiPlatformAdmin(request);
    const input = parseApiBody(schoolStatusSchema, { ...(request.body as Record<string, unknown>), organizationId: request.params.id });
    const result = await updatePlatformSchoolStatus(admin, input);
    return apiSuccess(request, { id: result.id, status: result.status });
  });

  app.get<{ Querystring: { page?: number; pageSize?: number; search?: string } }>("/users", authenticated, async (request) => {
    const user = requireApiPermission(request, "users:read");
    const pagination = pageQuery(request.query);
    return apiSuccess(request, await listUsersPage(user, { ...pagination, search: queryString(request.query.search) }));
  });

  app.get<{ Params: UserParams }>("/users/:id/access", authenticated, async (request) => {
    const user = requireApiPermission(request, "users:read");
    return apiSuccess(request, await getUserAccessDetail(user, request.params.id));
  });

  app.patch<{ Params: UserParams; Body: unknown }>("/users/:id/access", { ...mutation, schema: routeSchema("Update user access and scope") }, async (request) => {
    const user = requireApiPermission(request, "users:update");
    const input = parseApiBody(userAccessUpdateSchema, { ...(request.body as Record<string, unknown>), id: request.params.id });
    const result = await updateUserAccess(user, input);
    await auditCommand(user, { action: "update", module: "users", entityType: "user_access", entityId: input.id, campusId: input.primaryCampusId, before: result.before, after: result.updated });
    return apiSuccess(request, { id: result.updated.id });
  });

  app.post<{ Params: UserParams; Body: unknown }>("/users/:id/delegations", { ...mutation, schema: routeSchema("Grant temporary delegated access") }, async (request, reply) => {
    const user = requireApiPermission(request, "users:update");
    const input = parseApiBody(delegationCreateSchema, { ...(request.body as Record<string, unknown>), userId: request.params.id });
    const row = await createDelegation(user, input);
    await auditCommand(user, { action: "create", module: "users", entityType: "delegated_access", entityId: row.id, campusId: row.campusId ?? undefined, after: row });
    return apiCreated(reply, request, { id: row.id });
  });

  app.post<{ Params: DelegationParams }>("/users/:id/delegations/:delegationId/revoke", mutation, async (request) => {
    const user = requireApiPermission(request, "users:update");
    const input = parseApiBody(delegationRevokeSchema, { id: request.params.delegationId, userId: request.params.id });
    const result = await revokeDelegation(user, input);
    await auditCommand(user, { action: "update", module: "users", entityType: "delegated_access", entityId: input.id, before: result.before, after: result.updated });
    return apiSuccess(request, { id: result.updated.id });
  });
};
