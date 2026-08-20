import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import {
  loginAudits,
  platformAdmins,
  platformAuditLogs,
  platformSessionLogs,
  sessionLogs,
  users,
} from "../../../db/schema";
import {
  ACTIVE_CAMPUS_COOKIE,
  CSRF_COOKIE,
  SESSION_COOKIE,
} from "../../../config/constants";
import { getFirebaseAdminAuth } from "../../../lib/auth/firebase-admin-core";
import { getUserByFirebaseUid } from "../../../lib/auth/user-context";
import { getPlatformAdminByFirebaseUid } from "../../../lib/auth/platform-context";
import { sessionFingerprint } from "../../../lib/auth/session-fingerprint";
import { AppError } from "../../../lib/errors/app-error";
import { writeAuditLog } from "../../../lib/audit/audit-log";
import {
  authenticateApiRequest,
  requireApiOrigin,
  requireApiCsrf,
  requireApiUser,
} from "../auth/bearer-auth";
import {
  apiCookieOptions,
  createCsrfToken,
  expiredCookie,
  readCookieValue,
  serializeCookie,
} from "../auth/cookies";

const sessionSchema = {
  tags: ["authentication"],
  summary: "Exchange a Firebase ID token for the API web session",
  body: {
    type: "object",
    required: ["idToken"],
    additionalProperties: false,
    properties: { idToken: { type: "string", minLength: 20, maxLength: 8192 } },
  },
  response: {
    201: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["redirectTo", "expiresAt"],
          properties: { redirectTo: { type: "string" }, expiresAt: { type: "string" } },
        },
        meta: { type: "object", required: ["requestId"], properties: { requestId: { type: "string" } } },
      },
    },
  },
} as const;

const campusSchema = {
  tags: ["authentication"],
  summary: "Set the active authorized campus for a web session",
  security: [{ apiSessionCookie: [] }, { firebaseBearer: [] }],
  body: {
    type: "object",
    required: ["campusId"],
    additionalProperties: false,
    properties: { campusId: { type: "string", minLength: 1, maxLength: 200 } },
  },
} as const;

const revokeSchema = {
  tags: ["authentication"],
  summary: "Revoke the authenticated user's Firebase sessions",
  security: [{ firebaseBearer: [] }],
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["ok"],
          properties: { ok: { type: "boolean" } },
        },
        meta: {
          type: "object",
          required: ["requestId"],
          properties: { requestId: { type: "string" } },
        },
      },
    },
  },
} as const;

function requestIp(request: FastifyRequest) {
  return request.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim();
}

function requestUserAgent(request: FastifyRequest) {
  return request.headers["user-agent"]?.toString();
}

type SessionBody = { idToken: string };
type CampusBody = { campusId: string };

async function writeLoginSession(
  request: FastifyRequest,
  idToken: string,
) {
  const auth = getFirebaseAdminAuth();
  if (!auth)
    throw new AppError("CONFIGURATION_ERROR", "Firebase Admin is not configured.", 503);
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken, true);
  } catch {
    throw new AppError("UNAUTHENTICATED", "Invalid or expired Firebase token.", 401);
  }
  if (!decoded.email_verified)
    throw new AppError("FORBIDDEN", "Verify your email before signing in.", 403);

  const localUser = await getUserByFirebaseUid(decoded.uid);
  const platformAdmin = localUser ? null : await getPlatformAdminByFirebaseUid(decoded.uid);
  if (!localUser && !platformAdmin)
    throw new AppError("FORBIDDEN", "The account is not active or provisioned.", 403);

  const session = await auth.createSessionCookie(idToken, {
    expiresIn: 1000 * 60 * 60 * 24 * 5,
  });
  const now = new Date();
  const fingerprint = sessionFingerprint(session);
  const ipAddress = requestIp(request);
  const userAgent = requestUserAgent(request);

  if (localUser) {
    await getDb().transaction(async (tx) => {
      await tx.update(users).set({
        emailVerified: true,
        updatedAt: now,
        updatedBy: localUser.id,
      }).where(eq(users.id, localUser.id));
      await tx.insert(loginAudits).values({
        organizationId: localUser.organizationId,
        campusId: localUser.campusId,
        userId: localUser.id,
        email: localUser.email,
        ipAddress,
        userAgent,
        success: true,
        createdBy: localUser.id,
        updatedBy: localUser.id,
      });
      await tx.insert(sessionLogs).values({
        organizationId: localUser.organizationId,
        campusId: localUser.campusId,
        userId: localUser.id,
        firebaseSessionId: fingerprint,
        ipAddress,
        userAgent,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5),
        createdBy: localUser.id,
        updatedBy: localUser.id,
      });
    });
  } else if (platformAdmin) {
    await getDb().transaction(async (tx) => {
      await tx.update(platformAdmins).set({
        emailVerified: true,
        updatedAt: now,
        updatedBy: platformAdmin.id,
      }).where(eq(platformAdmins.id, platformAdmin.id));
      await tx.insert(platformAuditLogs).values({
        actorUserId: platformAdmin.id,
        actorRole: platformAdmin.role,
        action: "login",
        module: "platform_auth",
        entityType: "platform_admin",
        entityId: platformAdmin.id,
        ipAddress,
        userAgent,
        createdBy: platformAdmin.id,
        updatedBy: platformAdmin.id,
      });
      await tx.insert(platformSessionLogs).values({
        platformAdminId: platformAdmin.id,
        firebaseSessionId: fingerprint,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5),
        createdBy: platformAdmin.id,
        updatedBy: platformAdmin.id,
      });
    });
  }

  return {
    session,
    redirectTo: platformAdmin ? "/platform" : "/dashboard",
    expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5),
    actor: localUser,
  };
}

async function revokeSession(request: FastifyRequest) {
  const session = readCookieValue(request.headers.cookie, SESSION_COOKIE);
  if (!session) return;
  const auth = getFirebaseAdminAuth();
  const decoded = auth
    ? await auth.verifySessionCookie(session).catch(() => undefined)
    : undefined;
  if (!decoded) return;
  const fingerprint = sessionFingerprint(session);
  const now = new Date();
  const user = await getUserByFirebaseUid(decoded.uid);
  if (user) {
    await getDb().update(sessionLogs).set({
      status: "revoked",
      revokedAt: now,
      updatedAt: now,
      updatedBy: user.id,
    }).where(and(
      eq(sessionLogs.organizationId, user.organizationId),
      eq(sessionLogs.userId, user.id),
      eq(sessionLogs.firebaseSessionId, fingerprint),
    ));
    return;
  }
  const platformAdmin = await getPlatformAdminByFirebaseUid(decoded.uid);
  if (platformAdmin) {
    await getDb().update(platformSessionLogs).set({
      status: "revoked",
      revokedAt: now,
      updatedAt: now,
      updatedBy: platformAdmin.id,
    }).where(and(
      eq(platformSessionLogs.platformAdminId, platformAdmin.id),
      eq(platformSessionLogs.firebaseSessionId, fingerprint),
    ));
  }
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: SessionBody }>(
    "/auth/session",
    { preHandler: requireApiOrigin, schema: sessionSchema },
    async (request, reply) => {
      const result = await writeLoginSession(request, request.body.idToken);
      const csrf = createCsrfToken();
      const options = apiCookieOptions(60 * 60 * 24 * 5);
      const csrfOptions = { ...options, httpOnly: false };
      reply.header("set-cookie", [
        serializeCookie(SESSION_COOKIE, result.session, options),
        serializeCookie(CSRF_COOKIE, csrf, csrfOptions),
      ]);
      return reply.code(201).send({
        data: { redirectTo: result.redirectTo, expiresAt: result.expiresAt.toISOString() },
        meta: { requestId: request.id },
      });
    },
  );

  app.post("/auth/logout", { preHandler: async (request) => {
    // Logout must remain usable when the session has expired, but a presented
    // cookie still makes this a CSRF-protected browser mutation.
    request.apiCookieAuthenticated = Boolean(readCookieValue(request.headers.cookie, SESSION_COOKIE));
    await requireApiCsrf(request);
  } }, async (request, reply) => {
    await revokeSession(request);
    reply.header("set-cookie", [
      expiredCookie(SESSION_COOKIE, apiCookieOptions(0)),
      expiredCookie(ACTIVE_CAMPUS_COOKIE, apiCookieOptions(0)),
      expiredCookie(CSRF_COOKIE, { ...apiCookieOptions(0), httpOnly: false }),
    ]);
    return { data: { ok: true }, meta: { requestId: request.id } };
  });

  app.post(
    "/auth/revoke",
    {
      preHandler: [authenticateApiRequest, requireApiCsrf],
      schema: revokeSchema,
    },
    async (request) => {
      const user = requireApiUser(request);
      const auth = getFirebaseAdminAuth();
      if (!auth)
        throw new AppError(
          "CONFIGURATION_ERROR",
          "Firebase Admin is not configured.",
          503,
        );
      await auth.revokeRefreshTokens(user.firebaseUid);
      await writeAuditLog(user, {
        action: "logout",
        module: "identity",
        entityType: "firebase_session",
        entityId: user.id,
        campusId: user.campusId,
        metadata: { scope: "all_refresh_tokens" },
      });
      return { data: { ok: true }, meta: { requestId: request.id } };
    },
  );

  app.post<{ Body: CampusBody }>(
    "/auth/campus",
    { preHandler: [authenticateApiRequest, requireApiCsrf], schema: campusSchema },
    async (request, reply) => {
      const user = requireApiUser(request);
      const campus = user.availableCampuses?.find(({ id }) => id === request.body.campusId);
      if (!campus)
        throw new AppError("TENANT_SCOPE_ERROR", "Campus is outside your assigned scope.", 403);
      reply.header("set-cookie", serializeCookie(
        ACTIVE_CAMPUS_COOKIE,
        campus.id,
        { ...apiCookieOptions(60 * 60 * 24 * 30), httpOnly: true },
      ));
      await writeAuditLog(user, {
        action: "update",
        module: "identity",
        entityType: "active_campus",
        entityId: campus.id,
        campusId: campus.id,
        after: { campusId: campus.id },
      });
      return { data: { campus }, meta: { requestId: request.id } };
    },
  );
};
