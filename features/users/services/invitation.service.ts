import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditLogs, invitationTokens, organizations, users } from "@/db/schema";
import { getFirebaseAdminAuth } from "@/lib/auth/firebase-admin-core";
import { AppError } from "@/lib/errors/app-error";
import { hashInvitationToken } from "@/lib/auth/invitation-token";
import type { InvitationAcceptInput } from "../schemas/invitation.schema";

async function findInvitation(rawToken: string) {
  const tokenHash = hashInvitationToken(rawToken);
  const row = await getDb().query.invitationTokens.findFirst({ where: and(
    eq(invitationTokens.tokenHash, tokenHash),
    eq(invitationTokens.status, "active"),
    isNull(invitationTokens.acceptedAt),
    isNull(invitationTokens.revokedAt),
    gt(invitationTokens.expiresAt, new Date()),
  ) });
  if (!row) return null;
  const [user, organization] = await Promise.all([
    getDb().query.users.findFirst({ where: and(eq(users.id, row.userId), eq(users.organizationId, row.organizationId)) }),
    getDb().query.organizations.findFirst({ where: and(eq(organizations.id, row.organizationId), eq(organizations.status, "active")) }),
  ]);
  if (!user || user.status !== "invited" || !organization) return null;
  return { row, user, organization };
}

export async function validateInvitation(rawToken: string) {
  const invitation = await findInvitation(rawToken);
  if (!invitation) return null;
  return { email: invitation.user.email, displayName: invitation.user.displayName, role: invitation.user.role, expiresAt: invitation.row.expiresAt };
}

export async function acceptInvitation(input: InvitationAcceptInput) {
  const auth = getFirebaseAdminAuth();
  if (!auth) throw new AppError("CONFIGURATION_ERROR", "Firebase Admin is not configured on the server.", 503);
  const invitation = await findInvitation(input.token);
  if (!invitation) throw new AppError("NOT_FOUND", "This invitation is invalid, expired, or already used.", 404);
  const now = new Date();
  const [claimed] = await getDb().update(invitationTokens).set({ status: "processing", updatedAt: now, updatedBy: invitation.user.id }).where(and(
    eq(invitationTokens.id, invitation.row.id),
    eq(invitationTokens.status, "active"),
    isNull(invitationTokens.acceptedAt),
    isNull(invitationTokens.revokedAt),
    gt(invitationTokens.expiresAt, now),
  )).returning();
  if (!claimed) throw new AppError("CONFLICT", "This invitation is already being accepted or has been used.", 409);
  try {
    await auth.updateUser(invitation.user.firebaseUid, { password: input.password, disabled: false });
    const verificationLink = await auth.generateEmailVerificationLink(invitation.user.email);
    await getDb().transaction(async (tx) => {
      const [accepted] = await tx.update(invitationTokens).set({ status: "accepted", acceptedAt: now, updatedAt: now, updatedBy: invitation.user.id }).where(and(
        eq(invitationTokens.id, claimed.id),
        eq(invitationTokens.status, "processing"),
      )).returning();
      if (!accepted) throw new AppError("CONFLICT", "This invitation could not be completed.", 409);
      await tx.update(users).set({ status: "active", emailVerified: false, updatedAt: now, updatedBy: invitation.user.id }).where(and(
        eq(users.id, invitation.user.id),
        eq(users.organizationId, invitation.user.organizationId),
        eq(users.status, "invited"),
      ));
      await tx.insert(auditLogs).values({
        organizationId: invitation.user.organizationId,
        campusId: invitation.user.campusId,
        actorUserId: invitation.user.id,
        actorRole: invitation.user.role,
        action: "accept_invitation",
        module: "users",
        entityType: "user_invitation",
        entityId: invitation.user.id,
        metadataJson: JSON.stringify({ invitationId: invitation.row.id }),
        createdBy: invitation.user.id,
        updatedBy: invitation.user.id,
      });
    });
    return { email: invitation.user.email, displayName: invitation.user.displayName, verificationLink };
  } catch (error) {
    await getDb().update(invitationTokens).set({ status: "active", updatedAt: new Date(), updatedBy: invitation.user.id }).where(and(eq(invitationTokens.id, claimed.id), eq(invitationTokens.status, "processing"))).catch(() => undefined);
    throw error;
  }
}
