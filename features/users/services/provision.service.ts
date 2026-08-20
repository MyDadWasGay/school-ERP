import { and, eq, sql } from "drizzle-orm";
import type { UserRecord } from "firebase-admin/auth";
import { getFirebaseAdminAuth } from "@/lib/auth/firebase-admin-core";
import { getDb } from "@/db/client";
import { campuses, employees, guardians, invitationTokens, students, userCampusScopes, users } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { createId } from "@/lib/utils/ids";
import { createInvitationToken, invitationUrl } from "@/lib/auth/invitation-token";
import type { CurrentUser } from "@/lib/auth/types";
import type { ProvisionUserInput } from "../schemas/provision.schema";
import { reissueInvitation } from "./invitation.service";

export async function provisionUser(actor: CurrentUser, input: ProvisionUserInput) {
  const auth = getFirebaseAdminAuth();
  if (!auth) throw new AppError("CONFIGURATION_ERROR", "Firebase Admin is not configured on the server.", 503);
  
  const normalizedEmail = input.email.trim().toLowerCase();
  const [campus] = await getDb().select({ id: campuses.id }).from(campuses).where(and(eq(campuses.id, input.campusId), eq(campuses.organizationId, actor.organizationId))).limit(1);
  if (!campus) throw new AppError("TENANT_SCOPE_ERROR", "That campus is outside your school.", 403);

  let linkedStudentId = input.linkedStudentId?.trim() || undefined;
  let linkedGuardianId = input.linkedGuardianId?.trim() || undefined;
  let linkedEmployeeId = input.linkedEmployeeId?.trim() || undefined;

  // Auto-discover linked entities within the organization if not explicitly passed
  if (input.role === "student" && !linkedStudentId) {
    const matchingStudents = await getDb()
      .select({ id: students.id })
      .from(students)
      .where(and(
        eq(students.organizationId, actor.organizationId),
        sql`lower(${students.email}) = ${normalizedEmail}`,
      ));
    if (matchingStudents.length === 1) {
      linkedStudentId = matchingStudents[0].id;
    } else if (matchingStudents.length > 1) {
      throw new AppError("CONFLICT", "Multiple student records share this email address. Please select the specific student to invite.", 409);
    }
  } else if (input.role === "parent" && !linkedGuardianId) {
    const matchingGuardians = await getDb()
      .select({ id: guardians.id })
      .from(guardians)
      .where(and(
        eq(guardians.organizationId, actor.organizationId),
        eq(guardians.emailNormalized, normalizedEmail),
      ));
    if (matchingGuardians.length === 1) {
      linkedGuardianId = matchingGuardians[0].id;
    }
  } else if (["teacher", "principal", "office_staff", "accountant", "librarian", "transport_staff", "hostel_warden"].includes(input.role) && !linkedEmployeeId) {
    const matchingEmployees = await getDb()
      .select({ id: employees.id })
      .from(employees)
      .where(and(
        eq(employees.organizationId, actor.organizationId),
        sql`lower(${employees.email}) = ${normalizedEmail}`,
      ));
    if (matchingEmployees.length === 1) {
      linkedEmployeeId = matchingEmployees[0].id;
    }
  }

  // Check if an existing user record exists
  const existing = await getDb().query.users.findFirst({
    where: and(
      eq(users.organizationId, actor.organizationId),
      sql`lower(${users.email}) = ${normalizedEmail}`,
    ),
  });

  if (existing) {
    if (existing.role !== input.role) {
      throw new AppError("CONFLICT", `An ERP user with this email already exists with role '${existing.role}'.`, 409);
    }
    if (existing.linkedStudentId && linkedStudentId && existing.linkedStudentId !== linkedStudentId) {
      throw new AppError("CONFLICT", "This user account is already linked to a different student record.", 409);
    }
    if (existing.status === "active") {
      throw new AppError("DUPLICATE_RECORD", "An active ERP user with this email already exists.", 409);
    }
    if (existing.status === "invited") {
      if (!existing.linkedStudentId && linkedStudentId) {
        await getDb().update(users).set({ linkedStudentId, updatedBy: actor.id, updatedAt: new Date() }).where(eq(users.id, existing.id));
      }
      return reissueInvitation(actor, existing.id);
    }
    throw new AppError("CONFLICT", `User account is currently ${existing.status}.`, 409);
  }

  let firebaseUser: UserRecord | undefined;
  try {
    firebaseUser = await auth.createUser({ email: normalizedEmail, displayName: input.displayName, emailVerified: false });
    const firebaseUid = firebaseUser.uid;
    const invitation = createInvitationToken();
    const invitationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);
    const userId = createId("user");
    await getDb().transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        firebaseUid,
        organizationId: actor.organizationId,
        campusId: input.campusId,
        email: normalizedEmail,
        displayName: input.displayName,
        role: input.role,
        linkedStudentId: linkedStudentId || null,
        linkedGuardianId: linkedGuardianId || null,
        linkedEmployeeId: linkedEmployeeId || null,
        emailVerified: false,
        status: "invited",
        createdBy: actor.id,
        updatedBy: actor.id,
      });
      await tx.insert(userCampusScopes).values({ organizationId: actor.organizationId, userId, campusId: input.campusId, createdBy: actor.id, updatedBy: actor.id });
      await tx.insert(invitationTokens).values({ organizationId: actor.organizationId, campusId: input.campusId, userId, tokenHash: invitation.tokenHash, expiresAt: invitationExpiresAt, createdBy: actor.id, updatedBy: actor.id });
    });
    return { userId, inviteLink: invitationUrl(invitation.rawToken), invitationExpiresAt };
  } catch (error) {
    if (firebaseUser) await auth.deleteUser(firebaseUser.uid).catch(() => undefined);
    throw error;
  }
}
