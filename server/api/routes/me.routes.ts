import type { FastifyPluginAsync } from "fastify";
import { authenticateApiRequest, requireApiUser } from "../auth/bearer-auth";
import { meCampusesSchema, meSchema } from "../schemas";

/**
 * CLIENT_API_CONTRACT:
 * The web and Flutter clients call this after authentication and token refresh
 * to load the server-authoritative role, tenant, campus and linked-record context.
 */
export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/me",
    { preHandler: authenticateApiRequest, schema: meSchema },
    async (request) => {
      const user = requireApiUser(request);
      return {
        data: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          organization: {
            id: user.organizationId,
            name: user.organizationName,
          },
          campus: user.campusId
            ? { id: user.campusId, name: user.campusName }
            : null,
          campuses: user.availableCampuses ?? [],
          linkedStudentId: user.linkedStudentId ?? null,
          linkedEmployeeId: user.linkedEmployeeId ?? null,
          linkedGuardianId: user.linkedGuardianId ?? null,
          permissions: user.permissions,
        },
        meta: { requestId: request.id },
      };
    },
  );

  app.get(
    "/me/campuses",
    { preHandler: authenticateApiRequest, schema: meCampusesSchema },
    async (request) => {
      const user = requireApiUser(request);
      return {
        data: {
          activeCampusId: user.campusId ?? null,
          campuses: user.availableCampuses ?? [],
        },
        meta: { requestId: request.id },
      };
    },
  );
};
