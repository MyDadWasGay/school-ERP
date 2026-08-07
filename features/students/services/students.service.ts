import "server-only";
import { and, asc, count, desc, eq, inArray, like, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  academicYears, campuses, certificateTemplates, classes, enrollments, guardians, sections,
  studentCertificates, studentGuardianLinks, studentMedicalProfiles, students, studentTimelineEvents,
} from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { normalizePagination } from "@/lib/utils/pagination";
import type { CurrentUser } from "@/lib/auth/types";
import { hasPermission } from "@/lib/rbac/permissions";
import { createId } from "@/lib/utils/ids";
import type {
  CertificateIssueInput,
  EnrollmentTransferInput,
  GuardianInput,
  GuardianUnlinkInput,
  GuardianUpdateInput,
  MedicalProfileInput,
  StudentInput,
  StudentUpdateInput,
} from "../schemas/student.schema";
import type { StudentFormOptions } from "../types";

export type StudentListRow = { id: string; name: string; detail: string; status: string };

function hasCampusScope(user: CurrentUser, campusId: string | null | undefined) {
  if (!campusId) return true;
  const campusIds = user.campusIds ?? [user.campusId].filter((value): value is string => Boolean(value));
  return campusIds.length === 0 || campusIds.includes(campusId);
}

async function getWritableStudent(user: CurrentUser, studentId: string) {
  const student = await getDb().query.students.findFirst({ where: and(
    eq(students.id, studentId),
    eq(students.organizationId, user.organizationId),
  ) });
  if (!student) throw new AppError("NOT_FOUND", "Student not found.", 404);
  if (!hasCampusScope(user, student.campusId)) throw new AppError("FORBIDDEN", "Student is outside your campus scope.", 403);
  return student;
}

export async function getStudentFormOptions(user: CurrentUser): Promise<StudentFormOptions> {
  const scopedCampusIds = user.campusIds?.length ? user.campusIds : user.campusId ? [user.campusId] : [];
  const organizationWide = hasPermission(user, "organizations:update");
  const campusScope = organizationWide ? undefined : scopedCampusIds.length ? inArray(campuses.id, scopedCampusIds) : eq(campuses.id, "__no_campus__");
  const academicYearScope = organizationWide ? undefined : scopedCampusIds.length ? inArray(academicYears.campusId, scopedCampusIds) : eq(academicYears.campusId, "__no_campus__");
  const classScope = organizationWide ? undefined : scopedCampusIds.length ? inArray(classes.campusId, scopedCampusIds) : eq(classes.campusId, "__no_campus__");
  const sectionScope = organizationWide ? undefined : scopedCampusIds.length ? inArray(sections.campusId, scopedCampusIds) : eq(sections.campusId, "__no_campus__");
  const [campusRows, yearRows, classRows, sectionRows] = await Promise.all([
    getDb().select({ id: campuses.id, name: campuses.name, code: campuses.code, campusId: campuses.id }).from(campuses).where(and(eq(campuses.organizationId, user.organizationId), eq(campuses.status, "active"), campusScope)).orderBy(campuses.name),
    getDb().select({ id: academicYears.id, name: academicYears.name, campusId: academicYears.campusId }).from(academicYears).where(and(eq(academicYears.organizationId, user.organizationId), eq(academicYears.status, "active"), academicYearScope)).orderBy(desc(academicYears.startsOn)),
    getDb().select({ id: classes.id, name: classes.name, code: classes.code, campusId: classes.campusId }).from(classes).where(and(eq(classes.organizationId, user.organizationId), eq(classes.status, "active"), classScope)).orderBy(classes.sortOrder),
    getDb().select({ id: sections.id, name: sections.name, classId: sections.classId, campusId: sections.campusId }).from(sections).where(and(eq(sections.organizationId, user.organizationId), eq(sections.status, "active"), sectionScope)).orderBy(sections.name),
  ]);
  return { campuses: campusRows, academicYears: yearRows, classes: classRows, sections: sectionRows };
}

export async function resolvePermittedStudentIds(user: CurrentUser) {
  let permittedIds: string[] | undefined;
  if (user.role === "student") permittedIds = user.linkedStudentId ? [user.linkedStudentId] : [];
  if (user.role === "parent") {
    if (!user.linkedGuardianId) permittedIds = [];
    else {
      const links = await getDb().select({ studentId: studentGuardianLinks.studentId }).from(studentGuardianLinks).where(and(
        eq(studentGuardianLinks.organizationId, user.organizationId),
        eq(studentGuardianLinks.guardianId, user.linkedGuardianId),
      ));
      permittedIds = links.map(({ studentId }) => studentId);
    }
  }
  if (user.role === "teacher") {
    const scopes = user.classSectionScopes ?? [];
    if (scopes.length === 0) permittedIds = [];
    else {
      const enrollmentScope = or(...scopes.map((scope) => and(
        eq(enrollments.classId, scope.classId),
        scope.sectionId ? eq(enrollments.sectionId, scope.sectionId) : undefined,
      )));
      const rows = await getDb().select({ studentId: enrollments.studentId }).from(enrollments).where(and(
        eq(enrollments.organizationId, user.organizationId),
        eq(enrollments.status, "active"),
        user.campusId ? eq(enrollments.campusId, user.campusId) : undefined,
        enrollmentScope,
      ));
      permittedIds = rows.map(({ studentId }) => studentId);
    }
  }
  return permittedIds;
}

export async function listStudentsPage(user: CurrentUser, input?: { search?: string; page?: number; pageSize?: number }) {
  const pagination = normalizePagination(input);
  const search = input?.search?.trim();
  const searchCondition = search ? or(
    like(students.firstName, `%${search}%`),
    like(students.lastName, `%${search}%`),
    like(students.admissionNumber, `%${search}%`),
  ) : undefined;
  const permittedIds = await resolvePermittedStudentIds(user);
  if (permittedIds && permittedIds.length === 0) {
    return { rows: [] as StudentListRow[], pageInfo: { page: pagination.page, pageSize: pagination.pageSize, total: 0, pageCount: 0 } };
  }
  const where = and(
    eq(students.organizationId, user.organizationId),
    user.campusId ? eq(students.campusId, user.campusId) : undefined,
    permittedIds ? inArray(students.id, permittedIds) : undefined,
    searchCondition,
  );
  const [rows, totalRows] = await Promise.all([
    getDb().select().from(students).where(where).orderBy(desc(students.createdAt)).limit(pagination.pageSize).offset(pagination.offset),
    getDb().select({ value: count() }).from(students).where(where),
  ]);
  const total = totalRows[0]?.value ?? 0;
  return {
    rows: rows.map((row) => ({ id: row.id, name: `${row.firstName} ${row.lastName}`, detail: `Admission ${row.admissionNumber}`, status: row.status === "active" ? "Active" : row.status })),
    pageInfo: { page: pagination.page, pageSize: pagination.pageSize, total, pageCount: Math.ceil(total / pagination.pageSize) },
  };
}

export async function listStudents(user: CurrentUser, search?: string) {
  return (await listStudentsPage(user, { search, pageSize: 100 })).rows;
}

export async function listStudentsForExport(user: CurrentUser, maximumRows = 10_000) {
  const rows: StudentListRow[] = [];
  let page = 1;
  while (rows.length < maximumRows) {
    const result = await listStudentsPage(user, {
      page,
      pageSize: Math.min(100, maximumRows - rows.length),
    });
    rows.push(...result.rows);
    if (page >= result.pageInfo.pageCount) break;
    page += 1;
  }
  return rows;
}

export async function createStudentRecord(user: CurrentUser, input: StudentInput) {
  const campus = await getDb().query.campuses.findFirst({ where: and(
    eq(campuses.id, input.campusId),
    eq(campuses.organizationId, user.organizationId),
    eq(campuses.status, "active"),
  ) });
  if (!campus || (!hasPermission(user, "organizations:update") && !(user.campusIds ?? [user.campusId]).includes(campus.id))) {
    throw new AppError("TENANT_SCOPE_ERROR", "Campus is outside your assigned scope.", 403);
  }
  const duplicateStudent = await getDb().query.students.findFirst({ where: and(
    eq(students.organizationId, user.organizationId),
    eq(students.admissionNumber, input.admissionNumber),
  ) });
  if (duplicateStudent) throw new AppError("DUPLICATE_RECORD", "That admission number is already in use.", 409);
  if (input.academicYearId && input.classId && input.sectionId) {
    const [year, classRow, section] = await Promise.all([
      getDb().query.academicYears.findFirst({ where: and(eq(academicYears.id, input.academicYearId), eq(academicYears.organizationId, user.organizationId), eq(academicYears.campusId, input.campusId), eq(academicYears.status, "active")) }),
      getDb().query.classes.findFirst({ where: and(eq(classes.id, input.classId), eq(classes.organizationId, user.organizationId), eq(classes.campusId, input.campusId), eq(classes.status, "active")) }),
      getDb().query.sections.findFirst({ where: and(eq(sections.id, input.sectionId), eq(sections.organizationId, user.organizationId), eq(sections.campusId, input.campusId), eq(sections.classId, input.classId), eq(sections.status, "active")) }),
    ]);
    if (!year || !classRow || !section) throw new AppError("VALIDATION_ERROR", "Enrollment configuration is invalid.", 422);
    const enrollmentCount = await getDb().select({ value: count() }).from(enrollments).where(and(
      eq(enrollments.organizationId, user.organizationId),
      eq(enrollments.academicYearId, input.academicYearId),
      eq(enrollments.sectionId, input.sectionId),
      eq(enrollments.status, "active"),
    ));
    if ((enrollmentCount[0]?.value ?? 0) >= section.capacity) {
      throw new AppError("CONFLICT", "The selected section is at capacity.", 409);
    }
    if (input.rollNumber) {
      const duplicateRoll = await getDb().query.enrollments.findFirst({ where: and(
        eq(enrollments.organizationId, user.organizationId),
        eq(enrollments.academicYearId, input.academicYearId),
        eq(enrollments.classId, input.classId),
        eq(enrollments.sectionId, input.sectionId),
        eq(enrollments.rollNumber, input.rollNumber),
        eq(enrollments.status, "active"),
      ) });
      if (duplicateRoll) throw new AppError("DUPLICATE_RECORD", "That roll number is already in use in this section.", 409);
    }
  }
  return getDb().transaction(async (tx) => {
    const [student] = await tx.insert(students).values({
      admissionNumber: input.admissionNumber, firstName: input.firstName, lastName: input.lastName,
      campusId: input.campusId, organizationId: user.organizationId, gender: input.gender,
      dateOfBirth: input.dateOfBirth, email: input.email || undefined, phone: input.phone || undefined,
      createdBy: user.id, updatedBy: user.id,
    }).returning();
    if (input.academicYearId && input.classId && input.sectionId) {
      await tx.insert(enrollments).values({
        organizationId: user.organizationId, campusId: input.campusId, studentId: student.id,
        academicYearId: input.academicYearId, classId: input.classId, sectionId: input.sectionId,
        rollNumber: input.rollNumber, startsOn: new Date(), createdBy: user.id, updatedBy: user.id,
      });
    }
    if (input.guardian) {
      const guardianMatch = input.guardian.email
        ? eq(guardians.email, input.guardian.email)
        : input.guardian.phone
          ? eq(guardians.phone, input.guardian.phone)
          : undefined;
      const existingGuardian = guardianMatch
        ? await tx.query.guardians.findFirst({ where: and(
          eq(guardians.organizationId, user.organizationId),
          guardianMatch,
        ) })
        : undefined;
      const guardian = existingGuardian ?? (await tx.insert(guardians).values({
        organizationId: user.organizationId,
        campusId: input.campusId,
        firstName: input.guardian.firstName,
        lastName: input.guardian.lastName,
        email: input.guardian.email || undefined,
        phone: input.guardian.phone || undefined,
        createdBy: user.id,
        updatedBy: user.id,
      }).returning())[0];
      await tx.insert(studentGuardianLinks).values({
        organizationId: user.organizationId, campusId: input.campusId, studentId: student.id,
        guardianId: guardian.id, relationship: input.guardian.relationship, isPrimary: true,
        createdBy: user.id, updatedBy: user.id,
      });
    }
    await tx.insert(studentTimelineEvents).values({
      organizationId: user.organizationId, campusId: input.campusId, studentId: student.id,
      eventType: "student_created", title: "Student record created", occurredAt: new Date(),
      createdBy: user.id, updatedBy: user.id,
    });
    return student;
  });
}

export async function getStudentProfile(user: CurrentUser, studentId: string) {
  const permittedIds = await resolvePermittedStudentIds(user);
  if (permittedIds && !permittedIds.includes(studentId)) {
    throw new AppError("FORBIDDEN", "Student is outside your linked or assigned scope.", 403);
  }
  const student = await getDb().query.students.findFirst({ where: and(
    eq(students.id, studentId),
    eq(students.organizationId, user.organizationId),
    user.campusId ? eq(students.campusId, user.campusId) : undefined,
  ) });
  if (!student) throw new AppError("NOT_FOUND", "Student not found.", 404);
  const [guardianRows, enrollmentRows, timelineRows, certificateRows] = await Promise.all([
    getDb().select({
      id: guardians.id,
      firstName: guardians.firstName,
      lastName: guardians.lastName,
      relationship: studentGuardianLinks.relationship,
      isPrimary: studentGuardianLinks.isPrimary,
      phone: guardians.phone,
    }).from(studentGuardianLinks)
      .innerJoin(guardians, and(eq(guardians.id, studentGuardianLinks.guardianId), eq(guardians.organizationId, user.organizationId)))
      .where(and(eq(studentGuardianLinks.organizationId, user.organizationId), eq(studentGuardianLinks.studentId, student.id))),
    getDb().select().from(enrollments).where(and(
      eq(enrollments.organizationId, user.organizationId),
      eq(enrollments.studentId, student.id),
    )).orderBy(desc(enrollments.startsOn)),
    getDb().select().from(studentTimelineEvents).where(and(
      eq(studentTimelineEvents.organizationId, user.organizationId),
      eq(studentTimelineEvents.studentId, student.id),
    )).orderBy(desc(studentTimelineEvents.occurredAt)).limit(100),
    getDb().select().from(studentCertificates).where(and(
      eq(studentCertificates.organizationId, user.organizationId),
      eq(studentCertificates.studentId, student.id),
    )).orderBy(desc(studentCertificates.issuedAt)),
  ]);
  return { student, guardians: guardianRows, enrollments: enrollmentRows, timeline: timelineRows, certificates: certificateRows };
}

export async function updateStudentRecord(user: CurrentUser, input: StudentUpdateInput) {
  const existing = await getDb().query.students.findFirst({ where: and(
    eq(students.id, input.id),
    eq(students.organizationId, user.organizationId),
    user.campusId ? eq(students.campusId, user.campusId) : undefined,
  ) });
  if (!existing) throw new AppError("NOT_FOUND", "Student not found in your campus scope.", 404);
  return getDb().transaction(async (tx) => {
    const [updated] = await tx.update(students).set({
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender || null,
      email: input.email || null,
      phone: input.phone || null,
      status: input.status,
      updatedAt: new Date(),
      updatedBy: user.id,
    }).where(and(eq(students.id, existing.id), eq(students.organizationId, user.organizationId))).returning();
    if (existing.status !== updated.status) {
      await tx.insert(studentTimelineEvents).values({
        organizationId: user.organizationId,
        campusId: updated.campusId,
        studentId: updated.id,
        eventType: "status_changed",
        title: `Student status changed to ${updated.status}`,
        occurredAt: new Date(),
        createdBy: user.id,
        updatedBy: user.id,
      });
    }
    return { existing, updated };
  });
}

export async function createGuardianAndLink(user: CurrentUser, input: GuardianInput) {
  const student = await getWritableStudent(user, input.studentId);
  return getDb().transaction(async (tx) => {
    let guardian = input.guardianId
      ? await tx.query.guardians.findFirst({ where: and(
        eq(guardians.id, input.guardianId),
        eq(guardians.organizationId, user.organizationId),
      ) })
      : undefined;
    if (input.guardianId && !guardian) throw new AppError("NOT_FOUND", "Guardian not found.", 404);
    if (!guardian && (input.email || input.phone)) {
      guardian = await tx.query.guardians.findFirst({ where: and(
        eq(guardians.organizationId, user.organizationId),
        input.email ? eq(guardians.email, input.email) : eq(guardians.phone, input.phone ?? ""),
      ) });
    }
    if (guardian && !hasCampusScope(user, guardian.campusId)) {
      throw new AppError("FORBIDDEN", "Guardian is outside your campus scope.", 403);
    }
    if (guardian) {
      const [updated] = await tx.update(guardians).set({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email || null,
        phone: input.phone || null,
        occupation: input.occupation || null,
        addressJson: input.address || null,
        custodyNotes: input.custodyNotes || null,
        updatedAt: new Date(),
        updatedBy: user.id,
      }).where(and(eq(guardians.id, guardian.id), eq(guardians.organizationId, user.organizationId))).returning();
      guardian = updated;
    } else {
      [guardian] = await tx.insert(guardians).values({
        organizationId: user.organizationId,
        campusId: student.campusId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email || undefined,
        phone: input.phone || undefined,
        occupation: input.occupation || undefined,
        addressJson: input.address || undefined,
        custodyNotes: input.custodyNotes || undefined,
        createdBy: user.id,
        updatedBy: user.id,
      }).returning();
    }
    if (!guardian) throw new AppError("DATABASE_ERROR", "Guardian could not be saved.", 500);
    if (input.isPrimary) {
      await tx.update(studentGuardianLinks).set({ isPrimary: false, updatedAt: new Date(), updatedBy: user.id }).where(and(
        eq(studentGuardianLinks.organizationId, user.organizationId),
        eq(studentGuardianLinks.studentId, student.id),
        eq(studentGuardianLinks.isPrimary, true),
      ));
    }
    const existingLink = await tx.query.studentGuardianLinks.findFirst({ where: and(
      eq(studentGuardianLinks.organizationId, user.organizationId),
      eq(studentGuardianLinks.studentId, student.id),
      eq(studentGuardianLinks.guardianId, guardian.id),
    ) });
    const link = existingLink
      ? (await tx.update(studentGuardianLinks).set({
        relationship: input.relationship,
        isPrimary: input.isPrimary,
        updatedAt: new Date(),
        updatedBy: user.id,
      }).where(and(eq(studentGuardianLinks.id, existingLink.id), eq(studentGuardianLinks.organizationId, user.organizationId))).returning())[0]
      : (await tx.insert(studentGuardianLinks).values({
        organizationId: user.organizationId,
        campusId: student.campusId,
        studentId: student.id,
        guardianId: guardian.id,
        relationship: input.relationship,
        isPrimary: input.isPrimary,
        createdBy: user.id,
        updatedBy: user.id,
      }).returning())[0];
    await tx.insert(studentTimelineEvents).values({
      organizationId: user.organizationId,
      campusId: student.campusId,
      studentId: student.id,
      eventType: existingLink ? "guardian_updated" : "guardian_linked",
      title: existingLink ? "Guardian relationship updated" : "Guardian linked",
      detailsJson: JSON.stringify({ guardianId: guardian.id, relationship: input.relationship }),
      occurredAt: new Date(),
      createdBy: user.id,
      updatedBy: user.id,
    });
    return { guardian, link };
  });
}

export async function updateGuardian(user: CurrentUser, input: GuardianUpdateInput) {
  const student = await getWritableStudent(user, input.studentId);
  const link = await getDb().query.studentGuardianLinks.findFirst({ where: and(
    eq(studentGuardianLinks.id, input.id),
    eq(studentGuardianLinks.organizationId, user.organizationId),
    eq(studentGuardianLinks.studentId, student.id),
  ) });
  if (!link) throw new AppError("NOT_FOUND", "Guardian relationship not found.", 404);
  const [guardian] = await getDb().update(guardians).set({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email || null,
    phone: input.phone || null,
    occupation: input.occupation || null,
    addressJson: input.address || null,
    custodyNotes: input.custodyNotes || null,
    updatedAt: new Date(),
    updatedBy: user.id,
  }).where(and(eq(guardians.id, link.guardianId), eq(guardians.organizationId, user.organizationId))).returning();
  return createGuardianAndLink(user, { ...input, guardianId: guardian?.id ?? link.guardianId });
}

export async function unlinkGuardian(user: CurrentUser, input: GuardianUnlinkInput) {
  const student = await getWritableStudent(user, input.studentId);
  const link = await getDb().query.studentGuardianLinks.findFirst({ where: and(
    eq(studentGuardianLinks.organizationId, user.organizationId),
    eq(studentGuardianLinks.studentId, student.id),
    eq(studentGuardianLinks.guardianId, input.guardianId),
  ) });
  if (!link) throw new AppError("NOT_FOUND", "Guardian relationship not found.", 404);
  await getDb().transaction(async (tx) => {
    await tx.delete(studentGuardianLinks).where(and(
      eq(studentGuardianLinks.id, link.id),
      eq(studentGuardianLinks.organizationId, user.organizationId),
    ));
    if (link.isPrimary) {
      const [replacement] = await tx.select().from(studentGuardianLinks).where(and(
        eq(studentGuardianLinks.organizationId, user.organizationId),
        eq(studentGuardianLinks.studentId, student.id),
      )).orderBy(asc(studentGuardianLinks.createdAt)).limit(1);
      if (replacement) {
        await tx.update(studentGuardianLinks).set({ isPrimary: true, updatedAt: new Date(), updatedBy: user.id }).where(eq(studentGuardianLinks.id, replacement.id));
      }
    }
    await tx.insert(studentTimelineEvents).values({
      organizationId: user.organizationId,
      campusId: student.campusId,
      studentId: student.id,
      eventType: "guardian_unlinked",
      title: "Guardian unlinked",
      detailsJson: JSON.stringify({ guardianId: input.guardianId }),
      occurredAt: new Date(),
      createdBy: user.id,
      updatedBy: user.id,
    });
  });
  return { id: link.id };
}

export async function transferStudentEnrollment(user: CurrentUser, input: EnrollmentTransferInput) {
  const student = await getWritableStudent(user, input.studentId);
  const campusId = student.campusId;
  if (!campusId) throw new AppError("VALIDATION_ERROR", "Student must have a campus before enrollment transfer.", 422);
  return getDb().transaction(async (tx) => {
    const [academicYear, classRow, section] = await Promise.all([
      tx.query.academicYears.findFirst({ where: and(
        eq(academicYears.id, input.academicYearId),
        eq(academicYears.organizationId, user.organizationId),
        eq(academicYears.campusId, campusId),
        eq(academicYears.status, "active"),
      ) }),
      tx.query.classes.findFirst({ where: and(
        eq(classes.id, input.classId),
        eq(classes.organizationId, user.organizationId),
        eq(classes.campusId, campusId),
        eq(classes.status, "active"),
      ) }),
      tx.query.sections.findFirst({ where: and(
        eq(sections.id, input.sectionId),
        eq(sections.organizationId, user.organizationId),
        eq(sections.classId, input.classId),
        eq(sections.campusId, campusId),
        eq(sections.status, "active"),
      ) }),
    ]);
    if (!academicYear || !classRow || !section) throw new AppError("VALIDATION_ERROR", "The target enrollment is invalid.", 422);
    const activeEnrollment = await tx.query.enrollments.findFirst({ where: and(
      eq(enrollments.organizationId, user.organizationId),
      eq(enrollments.studentId, student.id),
      eq(enrollments.status, "active"),
    ) });
    if (activeEnrollment && activeEnrollment.academicYearId === input.academicYearId && activeEnrollment.classId === input.classId && activeEnrollment.sectionId === input.sectionId && (activeEnrollment.rollNumber ?? "") === (input.rollNumber ?? "")) {
      return { previous: activeEnrollment, current: activeEnrollment, changed: false };
    }
    if (activeEnrollment && input.startsOn <= activeEnrollment.startsOn) {
      throw new AppError("VALIDATION_ERROR", "Transfer date must be after the current enrollment start date.", 422);
    }
    const sectionCount = await tx.select({ value: count() }).from(enrollments).where(and(
      eq(enrollments.organizationId, user.organizationId),
      eq(enrollments.academicYearId, input.academicYearId),
      eq(enrollments.classId, input.classId),
      eq(enrollments.sectionId, input.sectionId),
      eq(enrollments.status, "active"),
    ));
    if ((sectionCount[0]?.value ?? 0) >= section.capacity) throw new AppError("CONFLICT", "The target section is at capacity.", 409);
    if (input.rollNumber) {
      const duplicateRoll = await tx.query.enrollments.findFirst({ where: and(
        eq(enrollments.organizationId, user.organizationId),
        eq(enrollments.academicYearId, input.academicYearId),
        eq(enrollments.classId, input.classId),
        eq(enrollments.sectionId, input.sectionId),
        eq(enrollments.rollNumber, input.rollNumber),
        eq(enrollments.status, "active"),
      ) });
      if (duplicateRoll && duplicateRoll.studentId !== student.id) throw new AppError("DUPLICATE_RECORD", "That roll number is already used in the target section.", 409);
    }
    if (activeEnrollment) {
      await tx.update(enrollments).set({ status: "transferred", endsOn: input.startsOn, updatedAt: new Date(), updatedBy: user.id }).where(and(
        eq(enrollments.id, activeEnrollment.id),
        eq(enrollments.organizationId, user.organizationId),
      ));
    }
    const [current] = await tx.insert(enrollments).values({
      organizationId: user.organizationId,
      campusId,
      studentId: student.id,
      academicYearId: input.academicYearId,
      classId: input.classId,
      sectionId: input.sectionId,
      rollNumber: input.rollNumber || null,
      startsOn: input.startsOn,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    await tx.insert(studentTimelineEvents).values({
      organizationId: user.organizationId,
      campusId,
      studentId: student.id,
      eventType: "enrollment_transferred",
      title: "Student enrollment transferred",
      detailsJson: JSON.stringify({ fromEnrollmentId: activeEnrollment?.id, toEnrollmentId: current.id }),
      occurredAt: input.startsOn,
      createdBy: user.id,
      updatedBy: user.id,
    });
    return { previous: activeEnrollment, current, changed: true };
  });
}

export async function getStudentMedicalProfile(user: CurrentUser, studentId: string) {
  const student = await getWritableStudent(user, studentId);
  return getDb().query.studentMedicalProfiles.findFirst({ where: and(
    eq(studentMedicalProfiles.organizationId, user.organizationId),
    eq(studentMedicalProfiles.studentId, student.id),
  ) });
}

export async function upsertStudentMedicalProfile(user: CurrentUser, input: MedicalProfileInput) {
  const student = await getWritableStudent(user, input.studentId);
  return getDb().transaction(async (tx) => {
    const existing = await tx.query.studentMedicalProfiles.findFirst({ where: and(
      eq(studentMedicalProfiles.organizationId, user.organizationId),
      eq(studentMedicalProfiles.studentId, student.id),
    ) });
    if (existing) {
      const [updated] = await tx.update(studentMedicalProfiles).set({
        allergies: input.allergies || null,
        conditions: input.conditions || null,
        medications: input.medications || null,
        emergencyNotes: input.emergencyNotes || null,
        updatedAt: new Date(),
        updatedBy: user.id,
      }).where(eq(studentMedicalProfiles.id, existing.id)).returning();
      return updated;
    }
    const [created] = await tx.insert(studentMedicalProfiles).values({
      organizationId: user.organizationId,
      campusId: student.campusId,
      studentId: student.id,
      allergies: input.allergies || undefined,
      conditions: input.conditions || undefined,
      medications: input.medications || undefined,
      emergencyNotes: input.emergencyNotes || undefined,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    return created;
  });
}

export async function issueStudentCertificate(user: CurrentUser, input: CertificateIssueInput) {
  const student = await getWritableStudent(user, input.studentId);
  const template = input.templateId
    ? await getDb().query.certificateTemplates.findFirst({ where: and(
      eq(certificateTemplates.id, input.templateId),
      eq(certificateTemplates.organizationId, user.organizationId),
      eq(certificateTemplates.status, "active"),
    ) })
    : undefined;
  if (input.templateId && !template) throw new AppError("NOT_FOUND", "Certificate template not found or inactive.", 404);
  const issuedAt = new Date();
  const certificateNumber = `${issuedAt.getFullYear()}-${createId("certificate").slice(-12).toUpperCase()}`;
  const verificationCode = createId("verify").replaceAll("_", "-");
  const snapshot = {
    student: {
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth?.toISOString() ?? null,
    },
    certificateType: input.certificateType,
    template: template ? { id: template.id, name: template.name, bodyTemplate: template.bodyTemplate } : null,
    issuedAt: issuedAt.toISOString(),
  };
  return getDb().transaction(async (tx) => {
    const [certificate] = await tx.insert(studentCertificates).values({
      organizationId: user.organizationId,
      campusId: student.campusId,
      studentId: student.id,
      templateId: template?.id,
      certificateNumber,
      certificateType: input.certificateType,
      verificationCode,
      issuedAt,
      issuedBy: user.id,
      snapshotJson: JSON.stringify(snapshot),
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    await tx.insert(studentTimelineEvents).values({
      organizationId: user.organizationId,
      campusId: student.campusId,
      studentId: student.id,
      eventType: "certificate_issued",
      title: `Certificate issued: ${input.certificateType}`,
      detailsJson: JSON.stringify({ certificateId: certificate.id, certificateNumber }),
      occurredAt: issuedAt,
      createdBy: user.id,
      updatedBy: user.id,
    });
    return certificate;
  });
}

export async function getCertificateByVerificationCode(verificationCode: string) {
  const certificate = await getDb().query.studentCertificates.findFirst({ where: and(
    eq(studentCertificates.verificationCode, verificationCode),
    eq(studentCertificates.status, "issued"),
  ) });
  if (!certificate) return null;
  return {
    certificateNumber: certificate.certificateNumber,
    certificateType: certificate.certificateType,
    issuedAt: certificate.issuedAt,
    snapshot: JSON.parse(certificate.snapshotJson) as Record<string, unknown>,
  };
}
