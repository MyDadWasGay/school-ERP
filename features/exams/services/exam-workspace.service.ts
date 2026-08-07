import "server-only";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { academicYears, classes, exams, examSchedules, resultPublications, subjects } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import { listStudents } from "@/features/students/services/students.service";

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
    publishedAt: row.publishedAt?.toLocaleString(),
  }));
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
    startsOn: row.startsOn?.toLocaleDateString(),
    endsOn: row.endsOn?.toLocaleDateString(),
    scheduleCount: Number(row.scheduleCount),
  }));
}
