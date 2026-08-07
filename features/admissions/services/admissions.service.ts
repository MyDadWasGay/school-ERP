import "server-only";
import { and, asc, count, desc, eq, inArray, like, or, type AnyColumn } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  academicYears,
  admissionAssessments,
  admissionFollowUps,
  admissionsEnquiries,
  applications,
  campuses,
  classes,
  enrollments,
  sections,
  users,
} from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import { normalizePagination } from "@/lib/utils/pagination";
import type {
  ApplicationInput,
  ApplicationReviewInput,
  AssessmentInput,
  AssessmentResultInput,
  EnquiryInput,
  EnquiryUpdateInput,
  FollowUpCompleteInput,
  FollowUpInput,
} from "../schemas/admissions.schema";

export type AdmissionOption = { id: string; name: string; campusId?: string | null; classId?: string };
export type AdmissionOptions = {
  campuses: AdmissionOption[];
  academicYears: AdmissionOption[];
  classes: AdmissionOption[];
  sections: AdmissionOption[];
  enquiries: AdmissionOption[];
};

function campusCondition(user: CurrentUser, campusId: AnyColumn) {
  return user.campusId ? eq(campusId, user.campusId) : undefined;
}

async function assertCampus(user: CurrentUser, campusId: string) {
  const campus = await getDb().query.campuses.findFirst({ where: and(
    eq(campuses.id, campusId),
    eq(campuses.organizationId, user.organizationId),
    eq(campuses.status, "active"),
  ) });
  if (!campus || (user.campusIds?.length ? !user.campusIds.includes(campus.id) : false)) {
    throw new AppError("TENANT_SCOPE_ERROR", "Campus is outside your assigned scope.", 403);
  }
  return campus;
}

export async function getAdmissionOptions(user: CurrentUser): Promise<AdmissionOptions> {
  const [campusRows, yearRows, classRows, sectionRows, enquiryRows] = await Promise.all([
    getDb().select({ id: campuses.id, name: campuses.name }).from(campuses).where(and(
      eq(campuses.organizationId, user.organizationId),
      eq(campuses.status, "active"),
      campusCondition(user, campuses.id),
    )).orderBy(asc(campuses.name)),
    getDb().select({ id: academicYears.id, name: academicYears.name, campusId: academicYears.campusId }).from(academicYears).where(and(
      eq(academicYears.organizationId, user.organizationId),
      eq(academicYears.status, "active"),
      campusCondition(user, academicYears.campusId),
    )).orderBy(desc(academicYears.startsOn)),
    getDb().select({ id: classes.id, name: classes.name, campusId: classes.campusId }).from(classes).where(and(
      eq(classes.organizationId, user.organizationId),
      eq(classes.status, "active"),
      campusCondition(user, classes.campusId),
    )).orderBy(asc(classes.sortOrder)),
    getDb().select({ id: sections.id, name: sections.name, campusId: sections.campusId, classId: sections.classId }).from(sections).where(and(
      eq(sections.organizationId, user.organizationId),
      eq(sections.status, "active"),
      campusCondition(user, sections.campusId),
    )).orderBy(asc(sections.name)),
    getDb().select({ id: admissionsEnquiries.id, name: admissionsEnquiries.applicantName, campusId: admissionsEnquiries.campusId }).from(admissionsEnquiries).where(and(
      eq(admissionsEnquiries.organizationId, user.organizationId),
      campusCondition(user, admissionsEnquiries.campusId),
      or(eq(admissionsEnquiries.status, "new"), eq(admissionsEnquiries.status, "qualified")),
    )).orderBy(desc(admissionsEnquiries.createdAt)).limit(100),
  ]);
  return { campuses: campusRows, academicYears: yearRows, classes: classRows, sections: sectionRows, enquiries: enquiryRows };
}

export async function listEnquiriesPage(
  user: CurrentUser,
  input?: { page?: number; pageSize?: number; search?: string },
) {
  const pagination = normalizePagination(input);
  const search = input?.search?.trim();
  const where = and(
    eq(admissionsEnquiries.organizationId, user.organizationId),
    campusCondition(user, admissionsEnquiries.campusId),
    search ? or(
      like(admissionsEnquiries.applicantName, `%${search}%`),
      like(admissionsEnquiries.guardianEmail, `%${search}%`),
    ) : undefined,
  );
  const [rows, totals] = await Promise.all([
    getDb().select().from(admissionsEnquiries).where(where).orderBy(desc(admissionsEnquiries.createdAt))
      .limit(pagination.pageSize).offset(pagination.offset),
    getDb().select({ value: count() }).from(admissionsEnquiries).where(where),
  ]);
  const total = totals[0]?.value ?? 0;
  const followUpRows = rows.length ? await getDb().select({ id: admissionFollowUps.id, enquiryId: admissionFollowUps.enquiryId, dueAt: admissionFollowUps.dueAt, note: admissionFollowUps.note }).from(admissionFollowUps).where(and(
    eq(admissionFollowUps.organizationId, user.organizationId),
    inArray(admissionFollowUps.enquiryId, rows.map((row) => row.id)),
    eq(admissionFollowUps.status, "open"),
  )).orderBy(asc(admissionFollowUps.dueAt)) : [];
  const firstFollowUp = new Map<string, typeof followUpRows[number]>();
  for (const followUp of followUpRows) if (!firstFollowUp.has(followUp.enquiryId)) firstFollowUp.set(followUp.enquiryId, followUp);
  return {
    rows: rows.map((row) => ({
      id: row.id,
      campusId: row.campusId,
      source: row.source,
      campaign: row.campaign,
      nextFollowUpAt: row.nextFollowUpAt,
      lostReason: row.lostReason,
      openFollowUp: firstFollowUp.get(row.id),
      name: row.applicantName,
      detail: `${row.source ?? "Direct"}${row.nextFollowUpAt ? ` - follow-up ${row.nextFollowUpAt.toLocaleDateString()}` : ""}`,
      status: row.status,
    })),
    pageInfo: { page: pagination.page, pageSize: pagination.pageSize, total, pageCount: Math.ceil(total / pagination.pageSize) },
  };
}

export async function createEnquiry(user: CurrentUser, input: EnquiryInput) {
  await assertCampus(user, input.campusId);
  const [row] = await getDb().insert(admissionsEnquiries).values({
    organizationId: user.organizationId,
    campusId: input.campusId,
    applicantName: input.applicantName,
    guardianEmail: input.guardianEmail || undefined,
    source: input.source,
    campaign: undefined,
    nextFollowUpAt: input.nextFollowUpAt,
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  return row;
}

export async function listApplicationsPage(
  user: CurrentUser,
  input?: { page?: number; pageSize?: number; search?: string },
) {
  const pagination = normalizePagination(input);
  const search = input?.search?.trim();
  const where = and(
    eq(applications.organizationId, user.organizationId),
    campusCondition(user, applications.campusId),
    search ? or(
      like(applications.applicantName, `%${search}%`),
      like(applications.applicationNumber, `%${search}%`),
    ) : undefined,
  );
  const [rows, totals] = await Promise.all([
    getDb().select().from(applications).where(where).orderBy(desc(applications.createdAt))
      .limit(pagination.pageSize).offset(pagination.offset),
    getDb().select({ value: count() }).from(applications).where(where),
  ]);
  const total = totals[0]?.value ?? 0;
  const assessmentRows = rows.length ? await getDb().select({ id: admissionAssessments.id, applicationId: admissionAssessments.applicationId, assessmentType: admissionAssessments.assessmentType, scheduledAt: admissionAssessments.scheduledAt, outcome: admissionAssessments.outcome, status: admissionAssessments.status }).from(admissionAssessments).where(and(
    eq(admissionAssessments.organizationId, user.organizationId),
    inArray(admissionAssessments.applicationId, rows.map((row) => row.id)),
    eq(admissionAssessments.status, "scheduled"),
  )).orderBy(asc(admissionAssessments.scheduledAt)) : [];
  const firstAssessment = new Map<string, typeof assessmentRows[number]>();
  for (const assessment of assessmentRows) if (!firstAssessment.has(assessment.applicationId)) firstAssessment.set(assessment.applicationId, assessment);
  return {
    rows: rows.map((row) => ({
      id: row.id,
      campusId: row.campusId,
      name: row.applicantName,
      detail: row.applicationNumber,
      status: row.status,
      openAssessment: firstAssessment.get(row.id),
    })),
    pageInfo: { page: pagination.page, pageSize: pagination.pageSize, total, pageCount: Math.ceil(total / pagination.pageSize) },
  };
}

export async function createApplication(user: CurrentUser, input: ApplicationInput) {
  await assertCampus(user, input.campusId);
  const [year, classRow, section, sourceEnquiry] = await Promise.all([
    getDb().query.academicYears.findFirst({ where: and(
      eq(academicYears.id, input.academicYearId),
      eq(academicYears.organizationId, user.organizationId),
      eq(academicYears.campusId, input.campusId),
      eq(academicYears.status, "active"),
    ) }),
    getDb().query.classes.findFirst({ where: and(
      eq(classes.id, input.classId),
      eq(classes.organizationId, user.organizationId),
      eq(classes.campusId, input.campusId),
      eq(classes.status, "active"),
    ) }),
    getDb().query.sections.findFirst({ where: and(
      eq(sections.id, input.sectionId),
      eq(sections.organizationId, user.organizationId),
      eq(sections.campusId, input.campusId),
      eq(sections.classId, input.classId),
      eq(sections.status, "active"),
    ) }),
    input.sourceEnquiryId
      ? getDb().query.admissionsEnquiries.findFirst({ where: and(
        eq(admissionsEnquiries.id, input.sourceEnquiryId),
        eq(admissionsEnquiries.organizationId, user.organizationId),
        eq(admissionsEnquiries.campusId, input.campusId),
      ) })
      : undefined,
  ]);
  if (!year || !classRow || !section) throw new AppError("VALIDATION_ERROR", "Academic year, class or section is invalid.", 422);
  if (input.sourceEnquiryId && !sourceEnquiry) throw new AppError("TENANT_SCOPE_ERROR", "Source enquiry is outside this campus.", 403);
  const yearCode = year.name.replace(/\D/g, "").slice(0, 8) || String(new Date().getFullYear());
  const applicationNumber = `APP-${yearCode}-${createId("application").slice(-8).toUpperCase()}`;
  return getDb().transaction(async (tx) => {
    const [row] = await tx.insert(applications).values({
      organizationId: user.organizationId,
      campusId: input.campusId,
      applicationNumber,
      applicantName: input.applicantName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      guardianJson: JSON.stringify(input.guardian),
      academicYearId: input.academicYearId,
      appliedClassId: input.classId,
      appliedSectionId: input.sectionId,
      sourceEnquiryId: input.sourceEnquiryId || undefined,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    if (sourceEnquiry) {
      await tx.update(admissionsEnquiries).set({
        status: "converted",
        updatedAt: new Date(),
        updatedBy: user.id,
      }).where(and(
        eq(admissionsEnquiries.id, sourceEnquiry.id),
        eq(admissionsEnquiries.organizationId, user.organizationId),
      ));
    }
    return row;
  });
}

export async function reviewApplication(user: CurrentUser, input: ApplicationReviewInput) {
  const application = await getDb().query.applications.findFirst({ where: and(
    eq(applications.id, input.applicationId),
    eq(applications.organizationId, user.organizationId),
    campusCondition(user, applications.campusId),
  ) });
  if (!application) throw new AppError("NOT_FOUND", "Application not found.", 404);
  if (["approved", "rejected"].includes(application.status)) {
    throw new AppError("CONFLICT", "A completed application decision cannot be overwritten.", 409);
  }
  const [updated] = await getDb().update(applications).set({
    status: input.decision,
    decisionReason: input.reason,
    updatedAt: new Date(),
    updatedBy: user.id,
  }).where(and(
    eq(applications.id, application.id),
    eq(applications.organizationId, user.organizationId),
  )).returning();
  return { before: application, updated };
}

export async function listApprovalQueue(user: CurrentUser) {
  return getDb().select({
    id: applications.id,
    name: applications.applicantName,
    applicationNumber: applications.applicationNumber,
    status: applications.status,
  }).from(applications).where(and(
    eq(applications.organizationId, user.organizationId),
    campusCondition(user, applications.campusId),
    or(
      eq(applications.status, "submitted"),
      eq(applications.status, "verified"),
      eq(applications.status, "selected"),
      eq(applications.status, "waitlisted"),
    ),
  )).orderBy(asc(applications.createdAt)).limit(100);
}

export async function updateEnquiry(user: CurrentUser, input: EnquiryUpdateInput) {
  const existing = await getDb().query.admissionsEnquiries.findFirst({ where: and(
    eq(admissionsEnquiries.id, input.id),
    eq(admissionsEnquiries.organizationId, user.organizationId),
    campusCondition(user, admissionsEnquiries.campusId),
  ) });
  if (!existing) throw new AppError("NOT_FOUND", "Enquiry not found.", 404);
  if (existing.status === "converted" && input.status !== "converted") throw new AppError("CONFLICT", "Converted enquiries cannot move back in the pipeline.", 409);
  const [updated] = await getDb().update(admissionsEnquiries).set({
    status: input.status,
    source: input.source,
    campaign: input.campaign || null,
    lostReason: input.status === "lost" ? input.lostReason || null : null,
    nextFollowUpAt: input.nextFollowUpAt,
    updatedAt: new Date(),
    updatedBy: user.id,
  }).where(and(eq(admissionsEnquiries.id, existing.id), eq(admissionsEnquiries.organizationId, user.organizationId))).returning();
  return { before: existing, updated };
}

export async function createEnquiryFollowUp(user: CurrentUser, input: FollowUpInput) {
  const enquiry = await getDb().query.admissionsEnquiries.findFirst({ where: and(
    eq(admissionsEnquiries.id, input.enquiryId),
    eq(admissionsEnquiries.organizationId, user.organizationId),
    campusCondition(user, admissionsEnquiries.campusId),
  ) });
  if (!enquiry) throw new AppError("NOT_FOUND", "Enquiry not found.", 404);
  if (input.assignedTo) {
    const assignedUser = await getDb().query.users.findFirst({ where: and(eq(users.id, input.assignedTo), eq(users.organizationId, user.organizationId), eq(users.status, "active")) });
    if (!assignedUser) throw new AppError("VALIDATION_ERROR", "Assigned user is invalid.", 422);
  }
  return getDb().transaction(async (tx) => {
    const [followUp] = await tx.insert(admissionFollowUps).values({
      organizationId: user.organizationId,
      campusId: enquiry.campusId,
      enquiryId: enquiry.id,
      assignedTo: input.assignedTo || undefined,
      dueAt: input.dueAt,
      note: input.note,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    await tx.update(admissionsEnquiries).set({
      status: enquiry.status === "new" ? "contacted" : enquiry.status,
      nextFollowUpAt: input.dueAt,
      updatedAt: new Date(),
      updatedBy: user.id,
    }).where(and(eq(admissionsEnquiries.id, enquiry.id), eq(admissionsEnquiries.organizationId, user.organizationId)));
    return followUp;
  });
}

export async function completeEnquiryFollowUp(user: CurrentUser, input: FollowUpCompleteInput) {
  const existing = await getDb().query.admissionFollowUps.findFirst({ where: and(
    eq(admissionFollowUps.id, input.id),
    eq(admissionFollowUps.organizationId, user.organizationId),
    campusCondition(user, admissionFollowUps.campusId),
    eq(admissionFollowUps.status, "open"),
  ) });
  if (!existing) throw new AppError("NOT_FOUND", "Open follow-up not found.", 404);
  return getDb().transaction(async (tx) => {
    const now = new Date();
    const [updated] = await tx.update(admissionFollowUps).set({ status: "completed", completedAt: now, outcome: input.outcome, updatedAt: now, updatedBy: user.id }).where(and(eq(admissionFollowUps.id, existing.id), eq(admissionFollowUps.organizationId, user.organizationId), eq(admissionFollowUps.status, "open"))).returning();
    await tx.update(admissionsEnquiries).set({ nextFollowUpAt: null, updatedAt: now, updatedBy: user.id }).where(and(eq(admissionsEnquiries.id, existing.enquiryId), eq(admissionsEnquiries.organizationId, user.organizationId)));
    return { before: existing, updated };
  });
}

export async function scheduleAdmissionAssessment(user: CurrentUser, input: AssessmentInput) {
  const application = await getDb().query.applications.findFirst({ where: and(
    eq(applications.id, input.applicationId),
    eq(applications.organizationId, user.organizationId),
    eq(applications.campusId, input.campusId),
    campusCondition(user, applications.campusId),
  ) });
  if (!application) throw new AppError("NOT_FOUND", "Application not found.", 404);
  const [row] = await getDb().insert(admissionAssessments).values({
    organizationId: user.organizationId,
    campusId: input.campusId,
    applicationId: application.id,
    assessmentType: input.assessmentType,
    scheduledAt: input.scheduledAt,
    notes: input.notes || undefined,
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  return row;
}

export async function recordAdmissionAssessment(user: CurrentUser, input: AssessmentResultInput) {
  const existing = await getDb().query.admissionAssessments.findFirst({ where: and(eq(admissionAssessments.id, input.id), eq(admissionAssessments.organizationId, user.organizationId), campusCondition(user, admissionAssessments.campusId)) });
  if (!existing) throw new AppError("NOT_FOUND", "Assessment not found.", 404);
  const [updated] = await getDb().update(admissionAssessments).set({ score: input.score, outcome: input.outcome, notes: input.notes || null, assessedBy: user.id, status: "completed", updatedAt: new Date(), updatedBy: user.id }).where(and(eq(admissionAssessments.id, existing.id), eq(admissionAssessments.organizationId, user.organizationId))).returning();
  return { before: existing, updated };
}

export async function getAdmissionSeatMatrix(user: CurrentUser) {
  const rows = await getDb().select({
    classId: classes.id,
    className: classes.name,
    sectionId: sections.id,
    sectionName: sections.name,
    campusId: sections.campusId,
    capacity: sections.capacity,
    occupied: count(enrollments.id),
  }).from(sections)
    .innerJoin(classes, and(eq(classes.id, sections.classId), eq(classes.organizationId, user.organizationId)))
    .leftJoin(enrollments, and(eq(enrollments.sectionId, sections.id), eq(enrollments.organizationId, user.organizationId), eq(enrollments.status, "active")))
    .where(and(eq(sections.organizationId, user.organizationId), eq(sections.status, "active"), campusCondition(user, sections.campusId)))
    .groupBy(classes.id, classes.name, sections.id, sections.name, sections.campusId, sections.capacity)
    .orderBy(asc(classes.name), asc(sections.name));
  return rows.map((row) => ({ ...row, occupied: Number(row.occupied), available: Math.max(0, row.capacity - Number(row.occupied)) }));
}
