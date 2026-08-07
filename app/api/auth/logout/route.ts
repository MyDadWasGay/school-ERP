import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { ACTIVE_CAMPUS_COOKIE, SESSION_COOKIE } from "@/config/constants";
import { getDb } from "@/db/client";
import { platformSessionLogs, sessionLogs } from "@/db/schema";
import { getUserByFirebaseUid } from "@/lib/auth/guards";
import { getPlatformAdminByFirebaseUid } from "@/lib/auth/platform";
import { getFirebaseAdminAuth } from "@/lib/auth/firebase-admin";
import { sessionFingerprint } from "@/lib/auth/session-fingerprint";

export async function POST(request: Request) {
  const session = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === SESSION_COOKIE)?.slice(1).join("=");
  if (session) {
    const auth = getFirebaseAdminAuth();
    const decoded = auth ? await auth.verifySessionCookie(decodeURIComponent(session)).catch(() => undefined) : undefined;
    const user = decoded ? await getUserByFirebaseUid(decoded.uid) : undefined;
    if (user) {
      const now = new Date();
      await getDb().update(sessionLogs).set({
        status: "revoked",
        revokedAt: now,
        updatedAt: now,
        updatedBy: user.id,
      }).where(and(
        eq(sessionLogs.organizationId, user.organizationId),
        eq(sessionLogs.userId, user.id),
        eq(sessionLogs.firebaseSessionId, sessionFingerprint(decodeURIComponent(session))),
      )).catch(() => undefined);
    } else if (decoded) {
      const platformAdmin = await getPlatformAdminByFirebaseUid(decoded.uid);
      if (platformAdmin) {
        const now = new Date();
        await getDb().update(platformSessionLogs).set({
          status: "revoked",
          revokedAt: now,
          updatedAt: now,
          updatedBy: platformAdmin.id,
        }).where(and(
          eq(platformSessionLogs.platformAdminId, platformAdmin.id),
          eq(platformSessionLogs.firebaseSessionId, sessionFingerprint(decodeURIComponent(session))),
        )).catch(() => undefined);
      }
    }
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
  response.cookies.set(ACTIVE_CAMPUS_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}
