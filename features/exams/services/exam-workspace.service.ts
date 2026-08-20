import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  academicYears,
  classes,
  enrollments,
  exams,
  examSchedules,
  marksEntries,
  resultPublications,
  subjects,
  sections,
  students,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import { normalizePagination } from "@/lib/utils/pagination";
import { formatIndiaDate, formatIndiaDateTime } from "@/lib/utils/india-time";
import {
  getReadableStudent,
  listStudents,
} from "@/features/students/services/students.service";

export type ExamOption = { id: string; name: string; maxMarks: number; status: string };
export type SubjectOption = { id: string; name: string };
export type StudentOption = { id: string; name: string };

export type ExamPlanningRow = {
  id: string;
  name: string;
  academicYearId: string;
  maxMarks: number;
  status: string;
  startsOn?: string;
  endsOn?: string;
  scheduleCount: number;
};

export async function getExamWorkspaceOptions(user: CurrentUser) {
  const writableStatuses = ["draft", "marks_entry", "moderation"];
  const [examRows, subjectRows, studentRows] = await Promise.all([
    getDb().select({ id: exams.id, name: exams.name, maxMarks: exams.maxMarks, status: exams.status })
      .from(exams).where(and(
        eq(exams.organizationId, user.organizationId),
        user.campusId ? eq(exams.campusId, user.campusId) : undefined,
        inArray(exams.status, writableStatuses),
      )).orderBy(desc(exams.startsOn)).limit(100),
    getDb().select({ id: subjects.id, name: subjects.name }).from(subjects).where(and(
      eq(subjects.organizationId, user.organizationId),
      user.campusId ? eq(subjects.campusId, user.campusId) : undefined,
      eq(subjects.status, "active"),
    )).orderBy(subjects.name).limit(200),
    listStudents(user),
  ]);
  return {
    exams: examRows,
    subjects: subjectRows,
    students: studentRows.map((row) => ({ id: row.id, name: row.name })),
  };
}

export async function listExamResults(user: CurrentUser) {
  const portalUser = ["parent", "student"].includes(user.role);
  const rows = await getDb().select({
    id: exams.id,
    name: exams.name,
    maxMarks: exams.maxMarks,
    status: exams.status,
    publishedAt: resultPublications.publishedAt,
    publicationStatus: resultPublications.status,
  }).from(exams)
    .leftJoin(resultPublications, and(
      eq(resultPublications.examId, exams.id),
      eq(resultPublications.organizationId, user.organizationId),
    ))
    .where(and(
      eq(exams.organizationId, user.organizationId),
      user.campusId ? eq(exams.campusId, user.campusId) : undefined,
      portalUser ? eq(resultPublications.status, "published") : undefined,
    ))
    .orderBy(desc(exams.startsOn))
    .limit(100);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    maxMarks: row.maxMarks,
    status: row.publicationStatus === "published" ? "published" : row.status,
    publishedAt: row.publishedAt ? formatIndiaDateTime(row.publishedAt) : undefined,
  }));
}

export async function listStudentPublishedResults(
  user: CurrentUser,
  studentId: string,
  input?: { page?: number; pageSize?: number },
) {
  const student = await getReadableStudent(user, studentId);
  const pagination = normalizePagination(input);
  const where = and(
    eq(marksEntries.organizationId, user.organizationId),
    eq(marksEntries.studentId, student.id),
    student.campusId ? eq(marksEntries.campusId, student.campusId) : undefined,
    eq(marksEntries.status, "active"),
    eq(resultPublications.status, "published"),
  );
  const [rows, totals] = await Promise.all([
    getDb()
      .select({
        id: marksEntries.id,
        examId: exams.id,
        examName: exams.name,
        subjectId: subjects.id,
        subjectName: subjects.name,
        marks: marksEntries.marks,
        maximumMarks: exams.maxMarks,
        state: marksEntries.state,
        publishedAt: resultPublications.publishedAt,
      })
      .from(marksEntries)
      .innerJoin(
        exams,
        and(
          eq(exams.id, marksEntries.examId),
          eq(exams.organizationId, user.organizationId),
        ),
      )
      .innerJoin(
        subjects,
        and(
          eq(subjects.id, marksEntries.subjectId),
          eq(subjects.organizationId, user.organizationId),
        ),
      )
      .innerJoin(
        resultPublications,
        and(
          eq(resultPublications.examId, marksEntries.examId),
          eq(resultPublications.organizationId, user.organizationId),
        ),
      )
      .where(where)
      .orderBy(
        desc(resultPublications.publishedAt),
        desc(marksEntries.updatedAt),
      )
      .limit(pagination.pageSize)
      .offset(pagination.offset),
    getDb()
      .select({ value: count() })
      .from(marksEntries)
      .innerJoin(
        resultPublications,
        and(
          eq(resultPublications.examId, marksEntries.examId),
          eq(resultPublications.organizationId, user.organizationId),
        ),
      )
      .where(where),
  ]);
  const total = totals[0]?.value ?? 0;
  return {
    rows: rows.map((row) => ({
      ...row,
      publishedAt: row.publishedAt?.toISOString() ?? null,
    })),
    pageInfo: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      pageCount: Math.ceil(total / pagination.pageSize),
    },
  };
}

export async function listStudentAdmitCards(
  user: CurrentUser,
  studentId: string,
) {
  const student = await getReadableStudent(user, studentId);
  const rows = await getDb().select({
    examId: exams.id,
    examName: exams.name,
    examStatus: exams.status,
    examStartsOn: exams.startsOn,
    examEndsOn: exams.endsOn,
    academicYearId: exams.academicYearId,
    admissionNumber: students.admissionNumber,
    firstName: students.firstName,
    lastName: students.lastName,
    photoUrl: students.photoUrl,
    className: classes.name,
    sectionName: sections.name,
    rollNumber: enrollments.rollNumber,
    subjectId: subjects.id,
    subjectName: subjects.name,
    startsAt: examSchedules.startsAt,
    endsAt: examSchedules.endsAt,
    roomId: examSchedules.roomId,
  }).from(examSchedules)
    .innerJoin(exams, and(
      eq(exams.id, examSchedules.examId),
      eq(exams.organizationId, user.organizationId),
      inArray(exams.status, ["approved", "published"]),
    ))
    .innerJoin(subjects, and(
      eq(subjects.id, examSchedules.subjectId),
      eq(subjects.organizationId, user.organizationId),
    ))
    .innerJoin(enrollments, and(
      eq(enrollments.studentId, student.id),
      eq(enrollments.organizationId, user.organizationId),
      eq(enrollments.classId, examSchedules.classId),
      eq(enrollments.academicYearId, exams.academicYearId),
      eq(enrollments.status, "active"),
    ))
    .innerJoin(classes, and(
      eq(classes.id, enrollments.classId),
      eq(classes.organizationId, user.organizationId),
    ))
    .innerJoin(sections, and(
      eq(sections.id, enrollments.sectionId),
      eq(sections.organizationId, user.organizationId),
    ))
    .where(and(
      eq(examSchedules.organizationId, user.organizationId),
      eq(examSchedules.status, "active"),
      student.campusId ? eq(examSchedules.campusId, student.campusId) : undefined,
      student.campusId ? eq(exams.campusId, student.campusId) : undefined,
    ))
    .orderBy(examSchedules.startsAt)
    .limit(500);

  const cards = new Map<string, {
    examId: string;
    examName: string;
    examStatus: string;
    startsOn: string | null;
    endsOn: string | null;
    student: {
      id: string;
      name: string;
      admissionNumber: string;
      photoUrl: string | null;
      className: string;
      sectionName: string;
      rollNumber: string | null;
    };
    subjects: Array<{
      subjectId: string;
      subjectName: string;
      startsAt: string;
      endsAt: string;
      roomId: string | null;
    }>;
  }>();
  for (const row of rows) {
    const subject = {
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      roomId: row.roomId,
    };
    const existing = cards.get(row.examId);
    if (existing) {
      existing.subjects.push(subject);
      continue;
    }
    cards.set(row.examId, {
      examId: row.examId,
      examName: row.examName,
      examStatus: row.examStatus,
      startsOn: row.examStartsOn?.toISOString() ?? null,
      endsOn: row.examEndsOn?.toISOString() ?? null,
      student: {
        id: student.id,
        name: `${row.firstName} ${row.lastName}`.trim(),
        admissionNumber: row.admissionNumber,
        photoUrl: row.photoUrl,
        className: row.className,
        sectionName: row.sectionName,
        rollNumber: row.rollNumber,
      },
      subjects: [subject],
    });
  }
  return [...cards.values()];
}

export async function getExamPlanningOptions(user: CurrentUser) {
  const scope = user.campusId ? eq(academicYears.campusId, user.campusId) : undefined;
  const [years, classRows, subjectRows] = await Promise.all([
    getDb().select({ id: academicYears.id, name: academicYears.name }).from(academicYears).where(and(
      eq(academicYears.organizationId, user.organizationId), scope, eq(academicYears.status, "active"),
    )).orderBy(desc(academicYears.startsOn)).limit(50),
    getDb().select({ id: classes.id, name: classes.name }).from(classes).where(and(
      eq(classes.organizationId, user.organizationId),
      user.campusId ? eq(classes.campusId, user.campusId) : undefined,
      eq(classes.status, "active"),
    )).orderBy(classes.sortOrder, classes.name).limit(200),
    getDb().select({ id: subjects.id, name: subjects.name }).from(subjects).where(and(
      eq(subjects.organizationId, user.organizationId),
      user.campusId ? eq(subjects.campusId, user.campusId) : undefined,
      eq(subjects.status, "active"),
    )).orderBy(subjects.name).limit(200),
  ]);
  return { academicYears: years, classes: classRows, subjects: subjectRows };
}

export async function listExamPlanning(user: CurrentUser): Promise<ExamPlanningRow[]> {
  const rows = await getDb().select({
    id: exams.id,
    name: exams.name,
    academicYearId: exams.academicYearId,
    maxMarks: exams.maxMarks,
    status: exams.status,
    startsOn: exams.startsOn,
    endsOn: exams.endsOn,
    scheduleCount: count(examSchedules.id),
  }).from(exams)
    .leftJoin(examSchedules, and(
      eq(examSchedules.examId, exams.id),
      eq(examSchedules.organizationId, user.organizationId),
      eq(examSchedules.status, "active"),
    ))
    .where(and(
      eq(exams.organizationId, user.organizationId),
      user.campusId ? eq(exams.campusId, user.campusId) : undefined,
    ))
    .groupBy(exams.id, exams.name, exams.academicYearId, exams.maxMarks, exams.status, exams.startsOn, exams.endsOn)
    .orderBy(desc(exams.startsOn), desc(exams.createdAt))
    .limit(100);
  return rows.map((row) => ({
    ...row,
    startsOn: row.startsOn ? formatIndiaDate(row.startsOn) : undefined,
    endsOn: row.endsOn ? formatIndiaDate(row.endsOn) : undefined,
    scheduleCount: Number(row.scheduleCount),
  }));
}
