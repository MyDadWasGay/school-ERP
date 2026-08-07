import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/config/constants";
import { getFirebaseAdminAuth } from "@/lib/auth/firebase-admin";
import { getUserByFirebaseUid } from "@/lib/auth/guards";
import { getPlatformAdminByFirebaseUid } from "@/lib/auth/platform";
import { getDb } from "@/db/client";
import { loginAudits, platformAdmins, platformAuditLogs, platformSessionLogs, sessionLogs, users } from "@/db/schema";
import { sessionFingerprint } from "@/lib/auth/session-fingerprint";
import { eq } from "drizzle-orm";
import { enforceRateLimit, requestClientKey } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`session-exchange:${requestClientKey(request)}`, 30, 15 * 60_000);
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 429;
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status });
  }
  const auth = getFirebaseAdminAuth();
  if (!auth) return NextResponse.json({ error: "Firebase Admin is not configured." }, { status: 503 });
  const body = await request.json() as { idToken?: string };
  if (!body.idToken) return NextResponse.json({ error: "Missing token." }, { status: 400 });
  try {
    const decoded = await auth.verifyIdToken(body.idToken, true);
    const localUser = await getUserByFirebaseUid(decoded.uid);
    const platformAdmin = localUser ? null : await getPlatformAdminByFirebaseUid(decoded.uid);
    if (!localUser && !platformAdmin) return NextResponse.json({ error: "Your account is not active or provisioned." }, { status: 403 });
    if (!decoded.email_verified) return NextResponse.json({ error: "Verify your email before signing in." }, { status: 403 });
    const session = await auth.createSessionCookie(body.idToken, { expiresIn: 1000 * 60 * 60 * 24 * 5 });
    const now = new Date();
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
            ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
            userAgent: request.headers.get("user-agent"),
            success: true,
            createdBy: localUser.id,
            updatedBy: localUser.id,
          });
          await tx.insert(sessionLogs).values({
            organizationId: localUser.organizationId,
            campusId: localUser.campusId,
            userId: localUser.id,
            firebaseSessionId: sessionFingerprint(session),
            ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
            userAgent: request.headers.get("user-agent"),
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
            ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
            userAgent: request.headers.get("user-agent"),
            createdBy: platformAdmin.id,
            updatedBy: platformAdmin.id,
          });
          await tx.insert(platformSessionLogs).values({
            platformAdminId: platformAdmin.id,
            firebaseSessionId: sessionFingerprint(session),
            ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
            userAgent: request.headers.get("user-agent"),
            expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5),
            createdBy: platformAdmin.id,
            updatedBy: platformAdmin.id,
          });
      });
    }
    const response = NextResponse.json({ ok: true, redirectTo: platformAdmin ? "/platform" : "/dashboard" });
    response.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 5,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid or expired Firebase token." }, { status: 401 });
  }
}
