import type { FastifyPluginAsync } from "fastify";
import { getPortalSnapshot } from "../../../features/portals/services/portal.service";
import {
  assertPortalAccess,
  type PortalKind,
} from "../../../features/portals/services/portal-access";
import {
  authenticateApiRequest,
  requireApiPermission,
} from "../auth/bearer-auth";
import { portalSummarySchema } from "../schemas";

type PortalSummaryQuery = { portal?: PortalKind };

/**
 * CLIENT_API_CONTRACT:
 * This role-specific snapshot is shared by Next.js and Flutter. The server
 * derives linked/assigned students and rejects cross-role portal selection.
 */
export const portalRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: PortalSummaryQuery }>(
    "/portal/summary",
    { preHandler: authenticateApiRequest, schema: portalSummarySchema },
    async (request) => {
      const user = requireApiPermission(request, "portals:read");
      const portal =
        request.query.portal ??
        (user.role === "teacher" ||
        user.role === "parent" ||
        user.role === "student"
          ? user.role
          : "teacher");
      assertPortalAccess(user.role, portal);
      const snapshot = await getPortalSnapshot(user, portal);
      return { data: { portal, ...snapshot }, meta: { requestId: request.id } };
    },
  );
};
