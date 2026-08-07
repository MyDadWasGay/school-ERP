import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";
import { platformAdmins, platformSessionLogs } from "@/db/schema";
import { getDb } from "@/db/client";
import { AppError } from "@/lib/errors/app-error";
import { PLATFORM_ADMIN_ROLE } from "@/config/constants";
import { readSessionIdentity } from "./session";

export type PlatformAdmin = {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  role: typeof PLATFORM_ADMIN_ROLE;
};

export async function getPlatformAdminByFirebaseUid(uid: string): Promise<PlatformAdmin | null> {
  const row = await getDb().query.platformAdmins.findFirst({
    where: eq(platformAdmins.firebaseUid, uid),
  });
  if (!row || row.status !== "active") return null;
  return {
    id: row.id,
    firebaseUid: row.firebaseUid,
    email: row.email,
    displayName: row.displayName,
    emailVerified: row.emailVerified,
    role: PLATFORM_ADMIN_ROLE,
  };
}

export async function getCurrentPlatformAdmin() {
  const session = await readSessionIdentity();
  if (!session) return null;
  const admin = await getPlatformAdminByFirebaseUid(session.uid);
  if (!admin) return null;
  const activeSession = await getDb().query.platformSessionLogs.findFirst({ where: and(
    eq(platformSessionLogs.platformAdminId, admin.id),
    eq(platformSessionLogs.firebaseSessionId, session.fingerprint),
    eq(platformSessionLogs.status, "active"),
    isNull(platformSessionLogs.revokedAt),
    gt(platformSessionLogs.expiresAt, new Date()),
  ) });
  return activeSession ? admin : null;
}

export async function requirePlatformAdmin() {
  const admin = await getCurrentPlatformAdmin();
  if (!admin) throw new AppError("FORBIDDEN", "Platform administrator access is required.", 403);
  return admin;
}
