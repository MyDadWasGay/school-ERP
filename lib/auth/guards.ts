import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sessionLogs } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { checkPermission } from "@/lib/rbac/check-permission";
import type { CurrentUser } from "./types";
import { readActiveCampusId, readSessionIdentity } from "./session";
import { getUserByFirebaseUid } from "./user-context";

// CLIENT_API_MIGRATION: The web guard remains a transitional cookie-based
// adapter; Fastify uses the same framework-neutral user-context resolver for
// Bearer/API credentials. Do not create separate web and Flutter RBAC rules.
export { getUserByFirebaseUid } from "./user-context";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSessionIdentity();
  if (!session) return null;
  const user = await getUserByFirebaseUid(session.uid);
  if (!user) return null;
  const activeSession = await getDb().query.sessionLogs.findFirst({ where: and(
    eq(sessionLogs.organizationId, user.organizationId),
    eq(sessionLogs.userId, user.id),
    eq(sessionLogs.firebaseSessionId, session.fingerprint),
    eq(sessionLogs.status, "active"),
    isNull(sessionLogs.revokedAt),
    gt(sessionLogs.expiresAt, new Date()),
  ) });
  if (!activeSession) return null;
  const selectedCampusId = await readActiveCampusId();
  return getUserByFirebaseUid(session.uid, selectedCampusId);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "You must be signed in.", 401);
  return user;
}

export async function requirePermission(permission: string) {
  const user = await requireUser();
  const result = checkPermission(user, permission);
  if (!result.allowed) throw new AppError("FORBIDDEN", result.reason ?? "You do not have permission.", 403);
  return user;
}
