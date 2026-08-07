import "server-only";
import { and, eq } from "drizzle-orm";
import type { UserRecord } from "firebase-admin/auth";
import { getFirebaseAdminAuth } from "@/lib/auth/firebase-admin";
import { getDb } from "@/db/client";
import { campuses, invitationTokens, userCampusScopes, users } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { createId } from "@/lib/utils/ids";
import { createInvitationToken, invitationUrl } from "@/lib/auth/invitation-token";
import type { CurrentUser } from "@/lib/auth/types";
import type { ProvisionUserInput } from "../schemas/provision.schema";

export async function provisionUser(actor: CurrentUser, input: ProvisionUserInput) {
  const auth = getFirebaseAdminAuth();
  if (!auth) throw new AppError("CONFIGURATION_ERROR", "Firebase Admin is not configured on the server.", 503);
  const [campus] = await getDb().select({ id: campuses.id }).from(campuses).where(and(eq(campuses.id, input.campusId), eq(campuses.organizationId, actor.organizationId))).limit(1);
  if (!campus) throw new AppError("TENANT_SCOPE_ERROR", "That campus is outside your school.", 403);
  const [existing] = await getDb().select({ id: users.id }).from(users).where(and(eq(users.organizationId, actor.organizationId), eq(users.email, input.email))).limit(1);
  if (existing) throw new AppError("DUPLICATE_RECORD", "An ERP user with this email already exists.", 409);
  let firebaseUser: UserRecord | undefined;
  try {
    firebaseUser = await auth.createUser({ email: input.email, displayName: input.displayName, emailVerified: false });
    const firebaseUid = firebaseUser.uid;
    const invitation = createInvitationToken();
    const invitationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);
    const userId = createId("user");
    await getDb().transaction(async (tx) => {
      await tx.insert(users).values({ id: userId, firebaseUid, organizationId: actor.organizationId, campusId: input.campusId, email: input.email, displayName: input.displayName, role: input.role, emailVerified: false, status: "invited", createdBy: actor.id, updatedBy: actor.id });
      await tx.insert(userCampusScopes).values({ organizationId: actor.organizationId, userId, campusId: input.campusId, createdBy: actor.id, updatedBy: actor.id });
      await tx.insert(invitationTokens).values({ organizationId: actor.organizationId, campusId: input.campusId, userId, tokenHash: invitation.tokenHash, expiresAt: invitationExpiresAt, createdBy: actor.id, updatedBy: actor.id });
    });
    return { userId, inviteLink: invitationUrl(invitation.rawToken), invitationExpiresAt };
  } catch (error) {
    if (firebaseUser) await auth.deleteUser(firebaseUser.uid).catch(() => undefined);
    throw error;
  }
}
