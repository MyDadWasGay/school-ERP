import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditLogs, employees, guardians, invitationTokens, organizations, students, users } from "@/db/schema";
import { getFirebaseAdminAuth } from "@/lib/auth/firebase-admin-core";
import { AppError } from "@/lib/errors/app-error";
import { createInvitationToken, hashInvitationToken, invitationUrl } from "@/lib/auth/invitation-token";
import type { CurrentUser } from "@/lib/auth/types";
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

      let resolvedLinkedStudentId = invitation.user.linkedStudentId;
      let resolvedLinkedGuardianId = invitation.user.linkedGuardianId;
      let resolvedLinkedEmployeeId = invitation.user.linkedEmployeeId;

      if (invitation.user.role === "student" && !resolvedLinkedStudentId) {
        const matchingStudents = await tx
          .select({ id: students.id })
          .from(students)
          .where(and(
            eq(students.organizationId, invitation.user.organizationId),
            sql`lower(${students.email}) = lower(${invitation.user.email})`,
          ));
        if (matchingStudents.length === 1) {
          resolvedLinkedStudentId = matchingStudents[0].id;
        }
      } else if (invitation.user.role === "parent" && !resolvedLinkedGuardianId) {
        const matchingGuardians = await tx
          .select({ id: guardians.id })
          .from(guardians)
          .where(and(
            eq(guardians.organizationId, invitation.user.organizationId),
            sql`lower(${guardians.emailNormalized}) = lower(${invitation.user.email})`,
          ));
        if (matchingGuardians.length === 1) {
          resolvedLinkedGuardianId = matchingGuardians[0].id;
        }
      } else if (
        ["teacher", "principal", "office_staff", "accountant", "librarian", "transport_staff", "hostel_warden"].includes(invitation.user.role) &&
        !resolvedLinkedEmployeeId
      ) {
        const matchingEmployees = await tx
          .select({ id: employees.id })
          .from(employees)
          .where(and(
            eq(employees.organizationId, invitation.user.organizationId),
            sql`lower(${employees.email}) = lower(${invitation.user.email})`,
          ));
        if (matchingEmployees.length === 1) {
          resolvedLinkedEmployeeId = matchingEmployees[0].id;
        }
      }

      await tx.update(users).set({
        status: "active",
        linkedStudentId: resolvedLinkedStudentId || null,
        linkedGuardianId: resolvedLinkedGuardianId || null,
        linkedEmployeeId: resolvedLinkedEmployeeId || null,
        emailVerified: false,
        updatedAt: now,
        updatedBy: invitation.user.id,
      }).where(and(
        eq(users.id, invitation.user.id),
        eq(users.organizationId, invitation.user.organizationId),
        eq(users.status, "invited"),
      ));

      if (resolvedLinkedEmployeeId) {
        await tx.update(employees).set({
          linkedUserId: invitation.user.id,
          updatedAt: now,
          updatedBy: invitation.user.id,
        }).where(and(
          eq(employees.id, resolvedLinkedEmployeeId),
          eq(employees.organizationId, invitation.user.organizationId),
        ));
      }

      await tx.insert(auditLogs).values({
        organizationId: invitation.user.organizationId,
        campusId: invitation.user.campusId,
        actorUserId: invitation.user.id,
        actorRole: invitation.user.role,
        action: "accept_invitation",
        module: "users",
        entityType: "user_invitation",
        entityId: invitation.user.id,
        metadataJson: JSON.stringify({
          invitationId: invitation.row.id,
          linkedStudentId: resolvedLinkedStudentId,
          linkedGuardianId: resolvedLinkedGuardianId,
          linkedEmployeeId: resolvedLinkedEmployeeId,
        }),
        createdBy: invitation.user.id,
        updatedBy: invitation.user.id,
      });

      if (resolvedLinkedStudentId && resolvedLinkedStudentId !== invitation.user.linkedStudentId) {
        await tx.insert(auditLogs).values({
          organizationId: invitation.user.organizationId,
          campusId: invitation.user.campusId,
          actorUserId: invitation.user.id,
          actorRole: invitation.user.role,
          action: "user_linked_to_student",
          module: "users",
          entityType: "user",
          entityId: invitation.user.id,
          metadataJson: JSON.stringify({ studentId: resolvedLinkedStudentId }),
          createdBy: invitation.user.id,
          updatedBy: invitation.user.id,
        });
      }

      if (resolvedLinkedEmployeeId && resolvedLinkedEmployeeId !== invitation.user.linkedEmployeeId) {
        await tx.insert(auditLogs).values({
          organizationId: invitation.user.organizationId,
          campusId: invitation.user.campusId,
          actorUserId: invitation.user.id,
          actorRole: invitation.user.role,
          action: "user_linked_to_employee",
          module: "users",
          entityType: "user",
          entityId: invitation.user.id,
          metadataJson: JSON.stringify({ employeeId: resolvedLinkedEmployeeId }),
          createdBy: invitation.user.id,
          updatedBy: invitation.user.id,
        });
      }

      if (resolvedLinkedGuardianId && resolvedLinkedGuardianId !== invitation.user.linkedGuardianId) {
        await tx.insert(auditLogs).values({
          organizationId: invitation.user.organizationId,
          campusId: invitation.user.campusId,
          actorUserId: invitation.user.id,
          actorRole: invitation.user.role,
          action: "user_linked_to_guardian",
          module: "users",
          entityType: "user",
          entityId: invitation.user.id,
          metadataJson: JSON.stringify({ guardianId: resolvedLinkedGuardianId }),
          createdBy: invitation.user.id,
          updatedBy: invitation.user.id,
        });
      }
    });
    return { email: invitation.user.email, displayName: invitation.user.displayName, verificationLink };
  } catch (error) {
    await getDb().update(invitationTokens).set({ status: "active", updatedAt: new Date(), updatedBy: invitation.user.id }).where(and(eq(invitationTokens.id, claimed.id), eq(invitationTokens.status, "processing"))).catch(() => undefined);
    throw error;
  }
}

export async function reissueInvitation(actor: CurrentUser, userId: string) {
  const user = await getDb().query.users.findFirst({
    where: and(
      eq(users.id, userId),
      eq(users.organizationId, actor.organizationId),
    ),
  });
  if (!user) throw new AppError("NOT_FOUND", "User not found.", 404);
  if (user.status !== "invited") {
    throw new AppError("CONFLICT", "Only invited users can be re-issued an invitation.", 409);
  }
  const invitation = createInvitationToken();
  const invitationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);
  await getDb().transaction(async (tx) => {
    await tx.update(invitationTokens).set({ status: "archived", revokedAt: new Date(), updatedBy: actor.id }).where(and(
      eq(invitationTokens.userId, user.id),
      eq(invitationTokens.organizationId, actor.organizationId),
      eq(invitationTokens.status, "active"),
    ));
    await tx.insert(invitationTokens).values({
      organizationId: actor.organizationId,
      campusId: user.campusId,
      userId: user.id,
      tokenHash: invitation.tokenHash,
      expiresAt: invitationExpiresAt,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
  });
  return { userId: user.id, email: user.email, inviteLink: invitationUrl(invitation.rawToken), invitationExpiresAt };
}
