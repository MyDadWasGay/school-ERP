import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { exams, marksEntries, questionBankItems, reportCards, resultPublications, students, subjects } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import { getReadableStudent } from "@/features/students/services/students.service";
import type { QuestionBankInput, ReportCardInput } from "../schemas/deep-feature.schema";

export async function listQuestionBank(user: CurrentUser) {
  return getDb().select({ id: questionBankItems.id, prompt: questionBankItems.prompt, questionType: questionBankItems.questionType, maximumMarks: questionBankItems.maximumMarks, subjectId: questionBankItems.subjectId, subjectName: subjects.name, status: questionBankItems.status }).from(questionBankItems).leftJoin(subjects, and(eq(subjects.id, questionBankItems.subjectId), eq(subjects.organizationId, user.organizationId))).where(and(eq(questionBankItems.organizationId, user.organizationId), user.campusId ? eq(questionBankItems.campusId, user.campusId) : undefined, eq(questionBankItems.status, "draft"))).orderBy(desc(questionBankItems.createdAt)).limit(500);
}

export async function createQuestionBankItem(user: CurrentUser, input: QuestionBankInput) {
  const subject = await getDb().query.subjects.findFirst({ where: and(eq(subjects.id, input.subjectId), eq(subjects.organizationId, user.organizationId), user.campusId ? eq(subjects.campusId, user.campusId) : undefined, eq(subjects.status, "active")) });
  if (!subject) throw new AppError("NOT_FOUND", "Subject is outside your campus scope.", 404);
  const [row] = await getDb().insert(questionBankItems).values({ id: createId("question"), organizationId: user.organizationId, campusId: subject.campusId, subjectId: subject.id, questionType: input.questionType, prompt: input.prompt, answerJson: input.answer ? JSON.stringify({ answer: input.answer }) : null, maximumMarks: input.maximumMarks, status: "draft", createdBy: user.id, updatedBy: user.id }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create question.", 500);
  return row;
}

export async function getDeepExamOptions(user: CurrentUser) {
  const [examRows, studentRows, subjectRows] = await Promise.all([
    getDb().select({ id: exams.id, name: exams.name, status: exams.status }).from(exams).where(and(eq(exams.organizationId, user.organizationId), user.campusId ? eq(exams.campusId, user.campusId) : undefined, eq(exams.status, "approved"))).orderBy(desc(exams.startsOn)).limit(100),
    getDb().select({ id: students.id, name: sql<string>`${students.firstName} || ' ' || ${students.lastName}` }).from(students).where(and(eq(students.organizationId, user.organizationId), user.campusId ? eq(students.campusId, user.campusId) : undefined, eq(students.status, "active"))).orderBy(asc(students.firstName)).limit(500),
    getDb().select({ id: subjects.id, name: subjects.name }).from(subjects).where(and(eq(subjects.organizationId, user.organizationId), user.campusId ? eq(subjects.campusId, user.campusId) : undefined, eq(subjects.status, "active"))).orderBy(asc(subjects.name)).limit(200),
  ]); return { exams: examRows, students: studentRows, subjects: subjectRows };
}

export async function generateReportCard(user: CurrentUser, input: ReportCardInput) {
  const exam = await getDb().query.exams.findFirst({ where: and(eq(exams.id, input.examId), eq(exams.organizationId, user.organizationId), user.campusId ? eq(exams.campusId, user.campusId) : undefined, eq(exams.status, "approved")) });
  const student = await getDb().query.students.findFirst({ where: and(eq(students.id, input.studentId), eq(students.organizationId, user.organizationId), user.campusId ? eq(students.campusId, user.campusId) : undefined, eq(students.status, "active")) });
  if (!exam || !student) throw new AppError("NOT_FOUND", "Exam or student is outside your scope.", 404);
  const marks = await getDb().select({ subjectId: marksEntries.subjectId, marks: marksEntries.marks, subjectName: subjects.name }).from(marksEntries).leftJoin(subjects, and(eq(subjects.id, marksEntries.subjectId), eq(subjects.organizationId, user.organizationId))).where(and(eq(marksEntries.organizationId, user.organizationId), eq(marksEntries.examId, exam.id), eq(marksEntries.studentId, student.id)));
  if (marks.length === 0) throw new AppError("CONFLICT", "Enter at least one mark before generating a report card.", 409);
  const total = marks.reduce((sum, item) => sum + (item.marks ?? 0), 0); const maximum = marks.length * exam.maxMarks; const percentage = maximum ? Number(((total / maximum) * 100).toFixed(2)) : 0; const summaryJson = JSON.stringify({ examId: exam.id, studentId: student.id, total, maximum, percentage, subjects: marks, generatedAt: new Date().toISOString() });
  const existing = await getDb().query.reportCards.findFirst({ where: and(eq(reportCards.examId, exam.id), eq(reportCards.studentId, student.id), eq(reportCards.organizationId, user.organizationId)) });
  if (existing) { const [row] = await getDb().update(reportCards).set({ summaryJson, generatedAt: new Date(), updatedAt: new Date(), updatedBy: user.id, status: "generated" }).where(eq(reportCards.id, existing.id)).returning(); return row; }
  const [row] = await getDb().insert(reportCards).values({ id: createId("report_card"), organizationId: user.organizationId, campusId: student.campusId, examId: exam.id, studentId: student.id, summaryJson, generatedAt: new Date(), status: "generated", createdBy: user.id, updatedBy: user.id }).returning(); return row;
}

export async function listReportCards(user: CurrentUser) {
  const rows = await getDb().select({ id: reportCards.id, exam: exams.name, student: sql<string>`${students.firstName} || ' ' || ${students.lastName}`, summaryJson: reportCards.summaryJson, generatedAt: reportCards.generatedAt, status: reportCards.status }).from(reportCards).innerJoin(exams, and(eq(exams.id, reportCards.examId), eq(exams.organizationId, user.organizationId))).innerJoin(students, and(eq(students.id, reportCards.studentId), eq(students.organizationId, user.organizationId))).where(and(eq(reportCards.organizationId, user.organizationId), user.campusId ? eq(reportCards.campusId, user.campusId) : undefined)).orderBy(desc(reportCards.generatedAt)).limit(500);
  return rows.map((row) => { let summary: { percentage?: number; total?: number; maximum?: number } = {}; try { summary = JSON.parse(row.summaryJson) as typeof summary; } catch { /* historical rows remain listable */ } return { ...row, percentage: summary.percentage ?? null, total: summary.total ?? null, maximum: summary.maximum ?? null }; });
}

export async function listStudentReportCards(user: CurrentUser, studentId: string) {
  const student = await getReadableStudent(user, studentId);
  const rows = await getDb()
    .select({
      id: reportCards.id,
      exam: exams.name,
      summaryJson: reportCards.summaryJson,
      generatedAt: reportCards.generatedAt,
      status: reportCards.status,
    })
    .from(reportCards)
    .innerJoin(
      exams,
      and(
        eq(exams.id, reportCards.examId),
        eq(exams.organizationId, user.organizationId),
      ),
    )
    .innerJoin(
      resultPublications,
      and(
        eq(resultPublications.examId, reportCards.examId),
        eq(resultPublications.organizationId, user.organizationId),
        eq(resultPublications.status, "published"),
      ),
    )
    .where(and(
      eq(reportCards.organizationId, user.organizationId),
      eq(reportCards.studentId, student.id),
      student.campusId ? eq(reportCards.campusId, student.campusId) : undefined,
      eq(reportCards.status, "generated"),
    ))
    .orderBy(desc(reportCards.generatedAt))
    .limit(50);

  return rows.map((row) => {
    let summary: {
      total?: number;
      maximum?: number;
      percentage?: number;
      subjects?: Array<{ subjectId?: string; subjectName?: string | null; marks?: number | null }>;
    } = {};
    try {
      summary = JSON.parse(row.summaryJson) as typeof summary;
    } catch {
      // Historical report cards remain visible with their summary omitted.
    }
    return {
      id: row.id,
      exam: row.exam,
      total: summary.total ?? null,
      maximum: summary.maximum ?? null,
      percentage: summary.percentage ?? null,
      subjects: (summary.subjects ?? []).map((subject) => ({
        subjectId: subject.subjectId ?? null,
        subjectName: subject.subjectName ?? "Subject",
        marks: subject.marks ?? null,
      })),
      generatedAt: row.generatedAt.toISOString(),
      status: row.status,
    };
  });
}
