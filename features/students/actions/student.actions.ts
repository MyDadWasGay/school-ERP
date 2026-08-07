"use server";
import { revalidatePath } from "next/cache";
import {
  certificateIssueSchema,
  enrollmentTransferSchema,
  guardianSchema,
  guardianUnlinkSchema,
  guardianUpdateSchema,
  medicalProfileSchema,
  studentSchema,
  studentUpdateSchema,
} from "../schemas/student.schema";
import {
  createGuardianAndLink,
  createStudentRecord,
  issueStudentCertificate,
  transferStudentEnrollment,
  unlinkGuardian,
  updateGuardian,
  updateStudentRecord,
  upsertStudentMedicalProfile,
} from "../services/students.service";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";

export async function createStudentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = studentSchema.safeParse(input); if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try { const user = await requirePermission("students:create"); const row = await createStudentRecord(user, parsed.data); await writeAuditLog(user, { action: "create", module: "students", entityType: "student", entityId: row.id, campusId: row.campusId, after: row }); revalidatePath("/students"); return { ok: true, data: { id: row.id }, message: "Student created." }; } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create student." }; }
}

export async function updateStudentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = studentUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Student details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("students:update");
    const result = await updateStudentRecord(user, parsed.data);
    await writeAuditLog(user, {
      action: "update",
      module: "students",
      entityType: "student",
      entityId: result.updated.id,
      campusId: result.updated.campusId,
      before: result.existing,
      after: result.updated,
    });
    revalidatePath(`/students/${result.updated.id}`);
    revalidatePath("/students");
    return { ok: true, data: { id: result.updated.id }, message: "Student updated." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to update student." };
  }
}

export async function createGuardianAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = guardianSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Guardian details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("students:update");
    const result = await createGuardianAndLink(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "students", entityType: "guardian", entityId: result.guardian.id, campusId: result.guardian.campusId, after: { studentId: parsed.data.studentId, guardianId: result.guardian.id, relationship: parsed.data.relationship, isPrimary: parsed.data.isPrimary } });
    revalidatePath(`/students/${parsed.data.studentId}/guardians`);
    return { ok: true, data: { id: result.guardian.id }, message: "Guardian linked." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to link guardian." };
  }
}

export async function updateGuardianAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = guardianUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Guardian details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("students:update");
    const result = await updateGuardian(user, parsed.data);
    await writeAuditLog(user, { action: "update", module: "students", entityType: "guardian", entityId: result.guardian.id, campusId: result.guardian.campusId, after: { studentId: parsed.data.studentId, guardianId: result.guardian.id, relationship: parsed.data.relationship, isPrimary: parsed.data.isPrimary } });
    revalidatePath(`/students/${parsed.data.studentId}/guardians`);
    return { ok: true, data: { id: result.guardian.id }, message: "Guardian updated." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to update guardian." };
  }
}

export async function unlinkGuardianAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = guardianUnlinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Guardian relationship is invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("students:update");
    const result = await unlinkGuardian(user, parsed.data);
    await writeAuditLog(user, { action: "delete", module: "students", entityType: "student_guardian_link", entityId: result.id, after: { studentId: parsed.data.studentId, guardianId: parsed.data.guardianId } });
    revalidatePath(`/students/${parsed.data.studentId}/guardians`);
    return { ok: true, data: result, message: "Guardian unlinked." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to unlink guardian." };
  }
}

export async function transferEnrollmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = enrollmentTransferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enrollment details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("students:update");
    const result = await transferStudentEnrollment(user, parsed.data);
    if (result.changed) await writeAuditLog(user, { action: "update", module: "students", entityType: "enrollment", entityId: result.current.id, campusId: result.current.campusId, after: { studentId: parsed.data.studentId, previousEnrollmentId: result.previous?.id, enrollmentId: result.current.id } });
    revalidatePath(`/students/${parsed.data.studentId}/enrollment`);
    revalidatePath(`/students/${parsed.data.studentId}`);
    return { ok: true, data: { id: result.current.id }, message: result.changed ? "Enrollment transferred." : "Enrollment already matches the selected class and section." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to transfer enrollment." };
  }
}

export async function updateMedicalProfileAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = medicalProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Medical details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("students:update");
    if (!user.permissions.includes("students:view_sensitive") && !user.permissions.includes("*")) return { ok: false, error: "Sensitive student permission is required.", code: "FORBIDDEN" };
    const profile = await upsertStudentMedicalProfile(user, parsed.data);
    await writeAuditLog(user, { action: "update", module: "students", entityType: "student_medical_profile", entityId: profile.id, campusId: profile.campusId, metadata: { studentId: parsed.data.studentId, fieldsUpdated: ["allergies", "conditions", "medications", "emergencyNotes"] } });
    revalidatePath(`/students/${parsed.data.studentId}/medical`);
    return { ok: true, data: { id: profile.id }, message: "Medical profile saved." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save medical profile." };
  }
}

export async function issueCertificateAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = certificateIssueSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Certificate details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("students:update");
    const certificate = await issueStudentCertificate(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "students", entityType: "student_certificate", entityId: certificate.id, campusId: certificate.campusId, after: { studentId: parsed.data.studentId, certificateNumber: certificate.certificateNumber, certificateType: certificate.certificateType } });
    revalidatePath(`/students/${parsed.data.studentId}/certificates`);
    return { ok: true, data: { id: certificate.id }, message: `Certificate ${certificate.certificateNumber} issued.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to issue certificate." };
  }
}
