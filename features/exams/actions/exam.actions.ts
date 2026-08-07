"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { marksSchema } from "../schemas/marks.schema";
import { examSchema, examScheduleSchema, examStatusSchema } from "../schemas/planning.schema";
import { createExam, publishExamResults, saveMarksEntry, scheduleExam, transitionExamStatus } from "../services/exams.service";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";

export async function enterMarksAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = marksSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Marks are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("exams:enter_marks");
    const row = await saveMarksEntry(user, parsed.data);
    await writeAuditLog(user, { action: "update", module: "exams", entityType: "marks_entry", entityId: row.id, after: row });
    revalidatePath("/exams/marks");
    return { ok: true, data: { id: row.id }, message: "Marks saved for moderation." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to enter marks." };
  }
}

const publishSchema = z.object({ examId: z.string().min(1) });
export async function publishResultAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = publishSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Exam is required.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("exams:publish_result");
    const publication = await publishExamResults(user, parsed.data.examId);
    await writeAuditLog(user, { action: "publish_result", module: "exams", entityType: "result_publication", entityId: publication.id, after: publication });
    revalidatePath("/exams/results");
    return { ok: true, data: { id: publication.id }, message: "Results published." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to publish result." };
  }
}

export async function createExamAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = examSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Exam details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("exams:create");
    const row = await createExam(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "exams", entityType: "exam", entityId: row.id, campusId: row.campusId, after: row });
    revalidatePath("/exams/planning");
    return { ok: true, data: { id: row.id }, message: "Exam created in draft status." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create exam." };
  }
}

export async function scheduleExamAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = examScheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Schedule details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("exams:update");
    const row = await scheduleExam(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "exams", entityType: "exam_schedule", entityId: row.id, campusId: row.campusId, after: row });
    revalidatePath("/exams/planning");
    return { ok: true, data: { id: row.id }, message: "Exam schedule saved." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to schedule exam." };
  }
}

export async function transitionExamStatusAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = examStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Exam status is invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission(parsed.data.status === "published" ? "exams:publish_result" : "exams:update");
    const result = await transitionExamStatus(user, parsed.data.examId, parsed.data.status);
    await writeAuditLog(user, { action: "update", module: "exams", entityType: "exam", entityId: result.row.id, campusId: result.row.campusId, before: result.before, after: result.row });
    revalidatePath("/exams/planning");
    revalidatePath("/exams/marks");
    revalidatePath("/exams/results");
    return { ok: true, data: { id: result.row.id }, message: `Exam moved to ${parsed.data.status.replaceAll("_", " ")}.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to change exam status." };
  }
}
