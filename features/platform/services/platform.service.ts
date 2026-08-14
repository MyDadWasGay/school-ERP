import { and, asc, count, desc, eq, inArray, like, or } from "drizzle-orm";
import type { UserRecord } from "firebase-admin/auth";
import { getDb } from "@/db/client";
import {
  academicYears,
  campuses,
  organizations,
  platformAdmins,
  platformAuditLogs,
  invitationTokens,
  userCampusScopes,
  users,
} from "@/db/schema";
import { canTransitionOrganizationStatus, type OrganizationStatus } from "@/config/organization-status";
import { INDIA_TIME_ZONE } from "@/config/constants";
import { formatIndiaDate, formatIndiaDateTime, indiaTodayKey } from "@/lib/utils/india-time";
import { getFirebaseAdminAuth } from "@/lib/auth/firebase-admin-core";
import { AppError } from "@/lib/errors/app-error";
import { createId } from "@/lib/utils/ids";
import { createInvitationToken, invitationUrl } from "@/lib/auth/invitation-token";
import type { PlatformAdmin } from "@/lib/auth/platform-context";
import { ensureOrganizationAccessDefaults } from "@/features/foundation/services/access-defaults.service";
import type { CreateSchoolInput, SchoolStatusInput } from "../schemas/platform.schema";

export type PlatformSchoolRow = {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  timezone: string;
  currency: string;
  userCount: number;
  createdAt: string;
};

export type PlatformOverview = {
  totalSchools: number;
  activeSchools: number;
  suspendedSchools: number;
  archivedSchools: number;
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalParents: number;
  totalStaff: number;
};

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const db = getDb();
  const [schoolTotals, activeSchools, suspendedSchools, archivedSchools, userTotals, teacherTotals, studentTotals, parentTotals, staffTotals] = await Promise.all([
    db.select({ value: count() }).from(organizations),
    db.select({ value: count() }).from(organizations).where(eq(organizations.status, "active")),
    db.select({ value: count() }).from(organizations).where(eq(organizations.status, "suspended")),
    db.select({ value: count() }).from(organizations).where(eq(organizations.status, "archived")),
    db.select({ value: count() }).from(users).where(eq(users.status, "active")),
    db.select({ value: count() }).from(users).where(and(eq(users.status, "active"), eq(users.role, "teacher"))),
    db.select({ value: count() }).from(users).where(and(eq(users.status, "active"), eq(users.role, "student"))),
    db.select({ value: count() }).from(users).where(and(eq(users.status, "active"), eq(users.role, "parent"))),
    db.select({ value: count() }).from(users).where(and(
      eq(users.status, "active"),
      inArray(users.role, ["office_staff", "accountant", "librarian", "transport_staff", "hostel_warden"]),
    )),
  ]);
  return {
    totalSchools: schoolTotals[0]?.value ?? 0,
    activeSchools: activeSchools[0]?.value ?? 0,
    suspendedSchools: suspendedSchools[0]?.value ?? 0,
    archivedSchools: archivedSchools[0]?.value ?? 0,
    totalUsers: userTotals[0]?.value ?? 0,
    totalTeachers: teacherTotals[0]?.value ?? 0,
    totalStudents: studentTotals[0]?.value ?? 0,
    totalParents: parentTotals[0]?.value ?? 0,
    totalStaff: staffTotals[0]?.value ?? 0,
  };
}

export async function listPlatformSchools(search?: string): Promise<PlatformSchoolRow[]> {
  const searchTerm = search?.trim();
  const rows = await getDb().select({
    id: organizations.id,
    name: organizations.name,
    slug: organizations.slug,
    status: organizations.status,
    timezone: organizations.timezone,
    currency: organizations.currency,
    createdAt: organizations.createdAt,
    userCount: count(users.id),
  }).from(organizations).leftJoin(users, eq(users.organizationId, organizations.id)).where(
    searchTerm ? or(like(organizations.name, `%${searchTerm}%`), like(organizations.slug, `%${searchTerm}%`)) : undefined,
  ).groupBy(
    organizations.id, organizations.name, organizations.slug, organizations.status,
    organizations.timezone, organizations.currency, organizations.createdAt,
  ).orderBy(asc(organizations.name)).limit(250);
  return rows.map((row) => ({ ...row, userCount: Number(row.userCount), createdAt: formatIndiaDate(row.createdAt) }));
}

export async function listPlatformAuditLogs() {
  const rows = await getDb().select({
    id: platformAuditLogs.id,
    actorRole: platformAuditLogs.actorRole,
    action: platformAuditLogs.action,
    module: platformAuditLogs.module,
    entityType: platformAuditLogs.entityType,
    entityId: platformAuditLogs.entityId,
    metadataJson: platformAuditLogs.metadataJson,
    createdAt: platformAuditLogs.createdAt,
  }).from(platformAuditLogs).orderBy(desc(platformAuditLogs.createdAt)).limit(200);
  return rows.map((row) => ({ ...row, createdAt: formatIndiaDateTime(row.createdAt) }));
}

export async function createPlatformSchool(admin: PlatformAdmin, input: CreateSchoolInput) {
  const auth = getFirebaseAdminAuth();
  if (!auth) throw new AppError("CONFIGURATION_ERROR", "Firebase Admin is required to provision the school administrator.", 503);
  const existingOrganization = await getDb().query.organizations.findFirst({ where: eq(organizations.slug, input.slug) });
  if (existingOrganization) throw new AppError("CONFLICT", "A school with this slug already exists.", 409);
  const existingUser = await getDb().query.users.findFirst({ where: eq(users.email, input.adminEmail) });
  const existingPlatformAdmin = await getDb().query.platformAdmins.findFirst({ where: eq(platformAdmins.email, input.adminEmail) });
  if (existingUser || existingPlatformAdmin) throw new AppError("CONFLICT", "That email is already assigned to an ERP account.", 409);

  let firebaseUser: UserRecord | undefined;
  try {
    firebaseUser = await auth.createUser({ email: input.adminEmail, displayName: input.adminName, emailVerified: false });
    const firebaseUid = firebaseUser.uid;
    const invitation = createInvitationToken();
    const invitationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);
    const organizationId = createId("org");
    const campusId = createId("campus");
    const academicYearId = createId("year");
    const userId = createId("user");
    const indiaYear = Number(indiaTodayKey().slice(0, 4));
    await getDb().transaction(async (tx) => {
      await tx.insert(organizations).values({ id: organizationId, name: input.name, slug: input.slug, timezone: INDIA_TIME_ZONE, currency: input.currency, createdBy: admin.id, updatedBy: admin.id });
      await tx.insert(campuses).values({ id: campusId, organizationId, name: input.campusName, code: input.campusCode, address: input.campusAddress || undefined, createdBy: admin.id, updatedBy: admin.id });
      await tx.insert(academicYears).values({ id: academicYearId, organizationId, campusId, name: `${indiaYear}-${String(indiaYear + 1).slice(-2)}`, startsOn: new Date(`${indiaYear}-04-01T00:00:00+05:30`), endsOn: new Date(`${indiaYear + 1}-03-31T00:00:00+05:30`), isActive: true, createdBy: admin.id, updatedBy: admin.id });
      await ensureOrganizationAccessDefaults(tx, organizationId, admin.id);
      await tx.insert(users).values({ id: userId, firebaseUid, organizationId, campusId, email: input.adminEmail, displayName: input.adminName, role: "management", emailVerified: false, status: "invited", createdBy: admin.id, updatedBy: admin.id });
      await tx.insert(userCampusScopes).values({ organizationId, userId, campusId, createdBy: admin.id, updatedBy: admin.id });
      await tx.insert(invitationTokens).values({ organizationId, campusId, userId, tokenHash: invitation.tokenHash, expiresAt: invitationExpiresAt, createdBy: admin.id, updatedBy: admin.id });
      await tx.insert(platformAuditLogs).values({ actorUserId: admin.id, actorRole: admin.role, action: "create", module: "schools", entityType: "organization", entityId: organizationId, afterJson: JSON.stringify({ name: input.name, slug: input.slug, adminEmail: input.adminEmail }), createdBy: admin.id, updatedBy: admin.id });
    });
    return { organizationId, adminEmail: input.adminEmail, inviteLink: invitationUrl(invitation.rawToken), invitationExpiresAt };
  } catch (error) {
    if (firebaseUser) await auth.deleteUser(firebaseUser.uid).catch(() => undefined);
    throw error;
  }
}

export async function updatePlatformSchoolStatus(admin: PlatformAdmin, input: SchoolStatusInput) {
  const organization = await getDb().query.organizations.findFirst({ where: eq(organizations.id, input.organizationId) });
  if (!organization) throw new AppError("NOT_FOUND", "School not found.", 404);
  if (!canTransitionOrganizationStatus(organization.status, input.status)) {
    throw new AppError("CONFLICT", `A school cannot move from ${organization.status} to ${input.status}.`, 409);
  }
  if (organization.status === input.status) return organization;

  const now = new Date();
  return getDb().transaction(async (tx) => {
    const [updated] = await tx.update(organizations).set({
      status: input.status,
      updatedAt: now,
      updatedBy: admin.id,
    }).where(and(
      eq(organizations.id, input.organizationId),
      eq(organizations.status, organization.status),
    )).returning();
    if (!updated) throw new AppError("CONFLICT", "The school status changed. Refresh and try again.", 409);
    await tx.insert(platformAuditLogs).values({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "update",
      module: "organization_lifecycle",
      entityType: "organization",
      entityId: organization.id,
      beforeJson: JSON.stringify({ status: organization.status }),
      afterJson: JSON.stringify({ status: input.status }),
      metadataJson: JSON.stringify({ transition: `${organization.status}->${input.status}` }),
      createdBy: admin.id,
      updatedBy: admin.id,
    });
    return updated;
  });
}
