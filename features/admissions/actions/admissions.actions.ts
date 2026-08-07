"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import {
  applicationReviewSchema,
  applicationSchema,
  assessmentResultSchema,
  assessmentSchema,
  enquirySchema,
  enquiryUpdateSchema,
  followUpCompleteSchema,
  followUpSchema,
} from "../schemas/admissions.schema";
import {
  completeEnquiryFollowUp,
  createApplication,
  createEnquiryFollowUp,
  createEnquiry,
  recordAdmissionAssessment,
  reviewApplication,
  scheduleAdmissionAssessment,
  updateEnquiry,
} from "../services/admissions.service";

export async function createEnquiryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enquiry details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("admissions:create");
    const row = await createEnquiry(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "admissions", entityType: "enquiry", entityId: row.id, after: row });
    revalidatePath("/admissions/enquiries");
    return { ok: true, data: { id: row.id }, message: "Enquiry created." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create enquiry." };
  }
}

export async function createApplicationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Application details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("admissions:create");
    const row = await createApplication(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "admissions", entityType: "application", entityId: row.id, after: row });
    revalidatePath("/admissions/applications");
    revalidatePath("/admissions/enquiries");
    return { ok: true, data: { id: row.id }, message: `Application ${row.applicationNumber} created.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create application." };
  }
}

export async function reviewApplicationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = applicationReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Application review is invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission(parsed.data.decision === "verified" ? "admissions:update" : "admissions:reject");
    const result = await reviewApplication(user, parsed.data);
    await writeAuditLog(user, {
      action: parsed.data.decision === "rejected" ? "reject" : "update",
      module: "admissions",
      entityType: "application",
      entityId: result.updated.id,
      before: result.before,
      after: result.updated,
    });
    revalidatePath("/admissions/applications");
    revalidatePath("/admissions/approvals");
    return { ok: true, data: { id: result.updated.id }, message: `Application marked ${parsed.data.decision}.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to review application." };
  }
}

export async function updateEnquiryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = enquiryUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Enquiry update is invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("admissions:update");
    const result = await updateEnquiry(user, parsed.data);
    await writeAuditLog(user, { action: "update", module: "admissions", entityType: "enquiry", entityId: result.updated.id, before: result.before, after: { status: result.updated.status, source: result.updated.source, campaign: result.updated.campaign, nextFollowUpAt: result.updated.nextFollowUpAt, lostReason: result.updated.lostReason } });
    revalidatePath("/admissions/enquiries");
    return { ok: true, data: { id: result.updated.id }, message: "Enquiry pipeline updated." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to update enquiry." }; }
}

export async function createFollowUpAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = followUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Follow-up details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("admissions:update");
    const row = await createEnquiryFollowUp(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "admissions", entityType: "enquiry_follow_up", entityId: row.id, after: { enquiryId: row.enquiryId, dueAt: row.dueAt } });
    revalidatePath("/admissions/enquiries");
    return { ok: true, data: { id: row.id }, message: "Follow-up scheduled." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to schedule follow-up." }; }
}

export async function completeFollowUpAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = followUpCompleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Follow-up outcome is invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("admissions:update");
    const result = await completeEnquiryFollowUp(user, parsed.data);
    await writeAuditLog(user, { action: "update", module: "admissions", entityType: "enquiry_follow_up", entityId: result.updated.id, before: result.before, after: { status: result.updated.status, outcome: result.updated.outcome } });
    revalidatePath("/admissions/enquiries");
    return { ok: true, data: { id: result.updated.id }, message: "Follow-up completed." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to complete follow-up." }; }
}

export async function scheduleAssessmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = assessmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Assessment details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("admissions:update");
    const row = await scheduleAdmissionAssessment(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "admissions", entityType: "assessment", entityId: row.id, after: { applicationId: row.applicationId, assessmentType: row.assessmentType, scheduledAt: row.scheduledAt } });
    revalidatePath("/admissions/applications");
    return { ok: true, data: { id: row.id }, message: "Assessment scheduled." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to schedule assessment." }; }
}

export async function recordAssessmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = assessmentResultSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Assessment result is invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("admissions:update");
    const result = await recordAdmissionAssessment(user, parsed.data);
    await writeAuditLog(user, { action: "update", module: "admissions", entityType: "assessment", entityId: result.updated.id, before: result.before, after: { outcome: result.updated.outcome, score: result.updated.score } });
    revalidatePath("/admissions/applications");
    return { ok: true, data: { id: result.updated.id }, message: "Assessment result saved." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to save assessment result." }; }
}
