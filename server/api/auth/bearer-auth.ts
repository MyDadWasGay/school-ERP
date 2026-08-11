import { timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { platformSessionLogs, sessionLogs } from "../../../db/schema";
import {
  ACTIVE_CAMPUS_COOKIE,
  CSRF_COOKIE,
  SESSION_COOKIE,
} from "../../../config/constants";
import { getFirebaseAdminAuth } from "../../../lib/auth/firebase-admin-core";
import { getUserByFirebaseUid } from "../../../lib/auth/user-context";
import { AppError } from "../../../lib/errors/app-error";
import { checkPermission } from "../../../lib/rbac/check-permission";
import { getPlatformAdminByFirebaseUid } from "../../../lib/auth/platform-context";
import { sessionFingerprint } from "../../../lib/auth/session-fingerprint";
import { readCorsOrigins } from "../config";

function readCookies(request: FastifyRequest) {
  const result = new Map<string, string>();
  for (const part of (request.headers.cookie ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name || !value) continue;
    try {
      result.set(name, decodeURIComponent(value));
    } catch {
      // Ignore malformed cookies; authentication will fail closed below.
    }
  }
  return result;
}

async function authenticateSessionCookie(
  request: FastifyRequest,
  session: string,
  requestedCampusId?: string,
) {
  const auth = getFirebaseAdminAuth();
  if (!auth)
    throw new AppError(
      "CONFIGURATION_ERROR",
      "Firebase Admin is not configured.",
      503,
    );
  let decoded;
  try {
    decoded = await auth.verifySessionCookie(session, true);
  } catch {
    throw new AppError(
      "UNAUTHENTICATED",
      "The API session is invalid or expired.",
      401,
    );
  }

  const fingerprint = sessionFingerprint(session);
  const user = await getUserByFirebaseUid(decoded.uid, requestedCampusId);
  if (user) {
    const activeSession = await getDb().query.sessionLogs.findFirst({
      where: and(
        eq(sessionLogs.organizationId, user.organizationId),
        eq(sessionLogs.userId, user.id),
        eq(sessionLogs.firebaseSessionId, fingerprint),
        eq(sessionLogs.status, "active"),
        isNull(sessionLogs.revokedAt),
        gt(sessionLogs.expiresAt, new Date()),
      ),
    });
    if (!activeSession)
      throw new AppError(
        "UNAUTHENTICATED",
        "The API session is revoked or expired.",
        401,
      );
    request.apiUser = user;
    request.apiCookieAuthenticated = true;
    return;
  }

  const platformAdmin = await getPlatformAdminByFirebaseUid(decoded.uid);
  if (!platformAdmin)
    throw new AppError(
      "FORBIDDEN",
      "The account is not active or provisioned.",
      403,
    );
  const activeSession = await getDb().query.platformSessionLogs.findFirst({
    where: and(
      eq(platformSessionLogs.platformAdminId, platformAdmin.id),
      eq(platformSessionLogs.firebaseSessionId, fingerprint),
      eq(platformSessionLogs.status, "active"),
      isNull(platformSessionLogs.revokedAt),
      gt(platformSessionLogs.expiresAt, new Date()),
    ),
  });
  if (!activeSession)
    throw new AppError(
      "UNAUTHENTICATED",
      "The API session is revoked or expired.",
      401,
    );
  request.apiPlatformAdmin = platformAdmin;
  request.apiCookieAuthenticated = true;
}

export async function requireApiOrigin(request: FastifyRequest) {
  const origin = request.headers.origin;
  const allowedOrigins = readCorsOrigins();
  if (!origin || !allowedOrigins.length || !allowedOrigins.includes(origin)) {
    throw new AppError(
      "FORBIDDEN",
      "The request origin is not allowed.",
      403,
    );
  }
}

export async function requireApiCsrf(request: FastifyRequest) {
  if (!request.apiCookieAuthenticated) return;
  requireApiOrigin(request);
  const cookies = readCookies(request);
  const cookieValue = cookies.get(CSRF_COOKIE);
  const headerValue = request.headers["x-csrf-token"];
  const header = Array.isArray(headerValue) ? undefined : headerValue?.trim();
  if (!cookieValue || !header) {
    throw new AppError(
      "FORBIDDEN",
      "A valid CSRF token is required for cookie-authenticated mutations.",
      403,
    );
  }
  const expected = Buffer.from(cookieValue);
  const received = Buffer.from(header);
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    throw new AppError(
      "FORBIDDEN",
      "A valid CSRF token is required for cookie-authenticated mutations.",
      403,
    );
  }
}

/**
 * CLIENT_API_AUTH:
 * Flutter and external clients sign in with Firebase and send a fresh ID token
 * as a Bearer token. Browser SSR requests forward the API-owned session cookie;
 * both paths resolve the same user context.
 * Never accept a Firebase UID, role, organization ID or permission list from
 * either request body; identity and authorization data comes from Firebase
 * plus the local tenant database.
 */
export async function authenticateApiRequest(request: FastifyRequest) {
  const authorization = request.headers.authorization ?? "";
  const isFirebaseBearer = authorization.startsWith("Bearer ");
  const cookies = readCookies(request);
  const sessionCookie = cookies.get(SESSION_COOKIE);
  if (!isFirebaseBearer && sessionCookie) {
    const rawCampusHeader = request.headers["x-campus-id"];
    if (Array.isArray(rawCampusHeader)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Only one X-Campus-Id header is allowed.",
        422,
      );
    }
    await authenticateSessionCookie(
      request,
      sessionCookie,
      rawCampusHeader?.trim() || cookies.get(ACTIVE_CAMPUS_COOKIE),
    );
    return;
  }
  if (!isFirebaseBearer) {
    throw new AppError(
      "UNAUTHENTICATED",
      "A supported Bearer token is required.",
      401,
    );
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!token || token.length > 8192) {
    throw new AppError("UNAUTHENTICATED", "The Bearer token is invalid.", 401);
  }

  const auth = getFirebaseAdminAuth();
  if (!auth)
    throw new AppError(
      "CONFIGURATION_ERROR",
      "Firebase Admin is not configured.",
      503,
    );

  let decoded;
  try {
    decoded = await auth.verifyIdToken(token, true);
  } catch {
    throw new AppError(
      "UNAUTHENTICATED",
      "The Firebase token is invalid or expired.",
      401,
    );
  }
  if (!decoded.email_verified) {
    throw new AppError(
      "FORBIDDEN",
      "Verify your email before using the API.",
      403,
    );
  }
  const firebaseUid = decoded.uid;

  const rawCampusHeader = request.headers["x-campus-id"];
  if (Array.isArray(rawCampusHeader)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Only one X-Campus-Id header is allowed.",
      422,
    );
  }
  const requestedCampusId = rawCampusHeader?.trim() || undefined;
  const user = await getUserByFirebaseUid(firebaseUid, requestedCampusId);
  if (!user)
    throw new AppError(
      "FORBIDDEN",
      "The account is not active or provisioned.",
      403,
    );
  if (requestedCampusId && user.campusId !== requestedCampusId) {
    throw new AppError(
      "FORBIDDEN",
      "The requested campus is not available to this account.",
      403,
    );
  }

  request.apiUser = user;
}

export function requireApiUser(request: FastifyRequest) {
  if (!request.apiUser)
    throw new AppError(
      "UNAUTHENTICATED",
      "A supported Bearer token is required.",
      401,
    );
  return request.apiUser;
}

export function requireApiPlatformAdmin(request: FastifyRequest) {
  if (!request.apiPlatformAdmin)
    throw new AppError(
      "FORBIDDEN",
      "Platform administrator access is required.",
      403,
    );
  return request.apiPlatformAdmin;
}

export function requireApiPermission(
  request: FastifyRequest,
  permission: string,
) {
  const user = requireApiUser(request);
  const result = checkPermission(user, permission);
  if (!result.allowed)
    throw new AppError(
      "FORBIDDEN",
      result.reason ?? "You do not have permission.",
      403,
    );
  return user;
}
