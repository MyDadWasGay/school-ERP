import { and, count, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  academicYears,
  admissions,
  applications,
  classes,
  enrollments,
  guardians,
  sections,
  studentGuardianLinks,
  students,
  studentTimelineEvents,
} from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { hasPermission } from "@/lib/rbac/permissions";
import { normalizeIndiaCalendarDate } from "@/lib/utils/india-time";
import type { AdmissionApprovalInput } from "../schemas/approval.schema";
import { z } from "zod";

function normalizeGuardianEmail(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function normalizeGuardianPhone(value: string | undefined) {
  const normalized = value?.replace(/\D/g, "");
  return normalized || null;
}

const guardianSnapshotSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  relationship: z.string().min(1).default("guardian"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export async function approveAdmission(user: CurrentUser, input: AdmissionApprovalInput) {
  return getDb().transaction(async (tx) => {
    let application = await tx.query.applications.findFirst({ where: and(
      eq(applications.id, input.applicationId),
      eq(applications.organizationId, user.organizationId),
      hasPermission(user, "organizations:update") ? undefined : user.campusIds?.length ? inArray(applications.campusId, user.campusIds) : user.campusId ? eq(applications.campusId, user.campusId) : eq(applications.campusId, "__no_campus__"),
    ) });
    if (!application) throw new AppError("NOT_FOUND", "Application not found.", 404);
    if (!["verified", "selected"].includes(application.status)) {
      throw new AppError("CONFLICT", "Only verified or selected applications can be approved.", 409);
    }
    if (!application.academicYearId || !application.appliedClassId || !application.appliedSectionId) {
      throw new AppError("VALIDATION_ERROR", "Academic year, class and section must be assigned before approval.", 422);
    }
    if (!application.campusId) {
      throw new AppError("VALIDATION_ERROR", "A campus must be assigned before approval.", 422);
    }
    const [claimedApplication] = await tx.update(applications).set({
      status: "approved",
      updatedAt: new Date(),
      updatedBy: user.id,
    }).where(and(
      eq(applications.id, application.id),
      eq(applications.organizationId, user.organizationId),
      or(eq(applications.status, "verified"), eq(applications.status, "selected")),
    )).returning();
    if (!claimedApplication) throw new AppError("CONFLICT", "This application is already being approved or has changed.", 409);
    application = claimedApplication;
    const applicationCampusId = application.campusId;
    const academicYearId = application.academicYearId;
    const classId = application.appliedClassId;
    const sectionId = application.appliedSectionId;
    if (!applicationCampusId || !academicYearId || !classId || !sectionId) throw new AppError("VALIDATION_ERROR", "Academic year, class, section and campus must be assigned before approval.", 422);
    const [academicYear, classRow, section] = await Promise.all([
      tx.query.academicYears.findFirst({ where: and(
        eq(academicYears.id, academicYearId),
        eq(academicYears.organizationId, user.organizationId),
        eq(academicYears.campusId, applicationCampusId),
        eq(academicYears.status, "active"),
        eq(academicYears.isActive, true),
      ) }),
      tx.query.classes.findFirst({ where: and(
        eq(classes.id, classId),
        eq(classes.organizationId, user.organizationId),
        eq(classes.campusId, applicationCampusId),
        eq(classes.status, "active"),
      ) }),
      tx.query.sections.findFirst({ where: and(
        eq(sections.id, sectionId),
        eq(sections.organizationId, user.organizationId),
        eq(sections.campusId, applicationCampusId),
        eq(sections.classId, classId),
        eq(sections.status, "active"),
      ) }),
    ]);
    if (!academicYear || !classRow || !section) {
      throw new AppError("VALIDATION_ERROR", "The selected academic year, class or section is invalid.", 422);
    }
    const enrollmentCount = await tx.select({ value: count() }).from(enrollments).where(and(
      eq(enrollments.organizationId, user.organizationId),
      eq(enrollments.academicYearId, academicYearId),
      eq(enrollments.sectionId, section.id),
      eq(enrollments.campusId, applicationCampusId),
      eq(enrollments.status, "active"),
    ));
    if ((enrollmentCount[0]?.value ?? 0) >= section.capacity) {
      throw new AppError("CONFLICT", "Section capacity has been reached.", 409);
    }
    const names = application.applicantName.trim().split(/\s+/);
    const [student] = await tx.insert(students).values({
      organizationId: user.organizationId,
      campusId: applicationCampusId,
      admissionNumber: application.applicationNumber.replace(/^APP-/, "ST-"),
      firstName: names[0] ?? application.applicantName,
      lastName: names.slice(1).join(" ") || "-",
      dateOfBirth: application.dateOfBirth,
      gender: application.gender,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    await tx.insert(enrollments).values({
      organizationId: user.organizationId,
      campusId: applicationCampusId,
      studentId: student.id,
      academicYearId,
      classId,
      sectionId,
      rollNumber: input.rollNumber,
      startsOn: normalizeIndiaCalendarDate(new Date()),
      createdBy: user.id,
      updatedBy: user.id,
    });
    if (application.guardianJson) {
      let guardianSnapshot: z.infer<typeof guardianSnapshotSchema> | undefined;
      try {
        guardianSnapshot = guardianSnapshotSchema.parse(JSON.parse(application.guardianJson));
      } catch {
        throw new AppError("VALIDATION_ERROR", "The application guardian details must be corrected before approval.", 422);
      }
      const guardianEmail = normalizeGuardianEmail(guardianSnapshot.email);
      const guardianPhone = normalizeGuardianPhone(guardianSnapshot.phone);
      const [guardianByEmail, guardianByPhone] = await Promise.all([
        guardianEmail ? tx.query.guardians.findFirst({ where: and(eq(guardians.organizationId, user.organizationId), eq(guardians.emailNormalized, guardianEmail)) }) : undefined,
        guardianPhone ? tx.query.guardians.findFirst({ where: and(eq(guardians.organizationId, user.organizationId), eq(guardians.phoneNormalized, guardianPhone)) }) : undefined,
      ]);
      if (guardianByEmail && guardianByPhone && guardianByEmail.id !== guardianByPhone.id) {
        throw new AppError("CONFLICT", "The guardian email and phone belong to different existing guardians.", 409);
      }
      const existingGuardian = guardianByEmail ?? guardianByPhone;
      if (existingGuardian && existingGuardian.campusId && existingGuardian.campusId !== applicationCampusId) {
        throw new AppError("CONFLICT", "The matched guardian belongs to a different campus.", 409);
      }
      const guardian = existingGuardian ?? (await tx.insert(guardians).values({
        organizationId: user.organizationId,
        campusId: applicationCampusId,
        firstName: guardianSnapshot.firstName,
        lastName: guardianSnapshot.lastName,
        email: guardianSnapshot.email || undefined,
        emailNormalized: guardianEmail || undefined,
        phone: guardianSnapshot.phone || undefined,
        phoneNormalized: guardianPhone || undefined,
        createdBy: user.id,
        updatedBy: user.id,
      }).returning())[0];
      if (!guardian) throw new AppError("DATABASE_ERROR", "Guardian could not be saved.", 500);
      await tx.insert(studentGuardianLinks).values({
        organizationId: user.organizationId,
        campusId: applicationCampusId,
        studentId: student.id,
        guardianId: guardian.id,
        relationship: guardianSnapshot.relationship,
        isPrimary: true,
        createdBy: user.id,
        updatedBy: user.id,
      });
    }
    await tx.insert(admissions).values({
      organizationId: user.organizationId,
      campusId: applicationCampusId,
      name: application.applicantName,
      code: application.applicationNumber,
      referenceId: student.id,
      effectiveAt: new Date(),
      detailsJson: JSON.stringify({ applicationId: application.id }),
      status: "approved",
      createdBy: user.id,
      updatedBy: user.id,
    });
    await tx.insert(studentTimelineEvents).values({
      organizationId: user.organizationId,
      campusId: applicationCampusId,
      studentId: student.id,
      eventType: "admitted",
      title: "Admission approved",
      detailsJson: JSON.stringify({ applicationId: application.id }),
      occurredAt: new Date(),
      createdBy: user.id,
      updatedBy: user.id,
    });
    return { student, application };
  });
}
