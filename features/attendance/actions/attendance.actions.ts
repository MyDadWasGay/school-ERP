"use server";
import { revalidatePath } from "next/cache";
import { attendanceSchema } from "../schemas/attendance.schema";
import { markAttendanceRecord, reviewAttendanceCorrection } from "../services/attendance.service";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import { z } from "zod";
import { leaveRequestSchema } from "../schemas/leave.schema";
import { createLeaveRequest, reviewLeaveRequest } from "../services/leave.service";
import { disciplineDecisionSchema, disciplineIncidentSchema } from "../schemas/discipline.schema";
import { createDisciplineIncident, updateDisciplineStatus } from "../services/discipline.service";

export async function markAttendanceAction(input: unknown): Promise<ActionResult<{ id: string; correctionRequested: boolean }>> {
  const parsed = attendanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Attendance data is invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("attendance:mark");
    const result = await markAttendanceRecord(user, parsed.data);
    await writeAuditLog(user, {
      action: result.kind === "correction" ? "create" : "update",
      module: "attendance",
      entityType: result.kind === "correction" ? "attendance_correction" : "student_attendance",
      entityId: result.row.id,
      after: result.row,
    });
    revalidatePath("/attendance/students");
    revalidatePath("/attendance/corrections");
    return {
      ok: true,
      data: { id: result.row.id, correctionRequested: result.kind === "correction" },
      message: result.kind === "correction" ? "A correction request was sent for approval." : "Attendance marked.",
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to mark attendance." };
  }
}

const correctionReviewSchema = z.object({
  correctionId: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
});

export async function reviewAttendanceCorrectionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = correctionReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Correction review data is invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("attendance:approve_correction");
    const result = await reviewAttendanceCorrection(user, parsed.data.correctionId, parsed.data.decision);
    await writeAuditLog(user, {
      action: parsed.data.decision === "approved" ? "approve" : "reject",
      module: "attendance",
      entityType: "attendance_correction",
      entityId: result.reviewed.id,
      before: result.attendance,
      after: result.reviewed,
    });
    revalidatePath("/attendance/students");
    revalidatePath("/attendance/corrections");
    return { ok: true, data: { id: result.reviewed.id }, message: `Correction ${parsed.data.decision}.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to review correction." };
  }
}

export async function createLeaveRequestAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = leaveRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Leave request data is invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("attendance:request_leave");
    const row = await createLeaveRequest(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "attendance", entityType: "leave_request", entityId: row.id, campusId: row.campusId, after: row });
    revalidatePath("/attendance/leave");
    return { ok: true, data: { id: row.id }, message: "Leave request submitted for review." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to submit leave request." };
  }
}

const leaveReviewSchema = z.object({ leaveId: z.string().min(1), decision: z.enum(["approved", "rejected"]) });
export async function reviewLeaveRequestAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = leaveReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Leave review data is invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("attendance:approve_leave");
    const result = await reviewLeaveRequest(user, parsed.data.leaveId, parsed.data.decision);
    await writeAuditLog(user, { action: parsed.data.decision === "approved" ? "approve" : "reject", module: "attendance", entityType: "leave_request", entityId: result.row.id, before: result.before, after: result.row });
    revalidatePath("/attendance/leave");
    return { ok: true, data: { id: result.row.id }, message: `Leave ${parsed.data.decision}.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to review leave request." };
  }
}

export async function createDisciplineIncidentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = disciplineIncidentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Incident data is invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("safety:create");
    const row = await createDisciplineIncident(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "safety", entityType: "discipline_incident", entityId: row.id, campusId: row.campusId, after: { ...row, details: "[redacted from audit event]" } });
    revalidatePath("/attendance/discipline");
    return { ok: true, data: { id: row.id }, message: "Discipline incident recorded." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to record incident." };
  }
}

export async function updateDisciplineStatusAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = disciplineDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Incident status is invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("safety:update");
    const row = await updateDisciplineStatus(user, parsed.data.incidentId, parsed.data.status);
    await writeAuditLog(user, { action: "update", module: "safety", entityType: "discipline_incident", entityId: row.id, campusId: row.campusId, after: { status: row.status } });
    revalidatePath("/attendance/discipline");
    return { ok: true, data: { id: row.id }, message: "Incident status updated." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to update incident status." };
  }
}
