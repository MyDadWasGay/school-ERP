"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import { employeeSchema, payrollRunSchema } from "../schemas/hr.schema";
import { createEmployee, createPayrollRun, processPayrollRun } from "../services/hr.service";

export async function createEmployeeAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Employee details are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("hr:create");
    const row = await createEmployee(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "hr", entityType: "employee", entityId: row.id, campusId: row.campusId, after: { employeeNumber: row.employeeNumber, name: `${row.firstName} ${row.lastName}`, salaryMinor: row.salaryMinor } });
    revalidatePath("/hr/employees");
    return { ok: true, data: { id: row.id }, message: "Employee created." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create employee." }; }
}

export async function createPayrollRunAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = payrollRunSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Payroll period is invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("payroll:create");
    const row = await createPayrollRun(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "payroll", entityType: "payroll_run", entityId: row.id, campusId: row.campusId, after: { period: row.period, status: row.status } });
    revalidatePath("/payroll/runs");
    return { ok: true, data: { id: row.id }, message: "Payroll run created as draft." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create payroll run." }; }
}

export async function processPayrollRunAction(input: unknown): Promise<ActionResult<{ id: string; payslipCount: number; totalMinor: number }>> {
  const runId = typeof input === "object" && input !== null && "runId" in input && typeof input.runId === "string" ? input.runId : "";
  if (!runId) return { ok: false, error: "Payroll run is required.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("payroll:update");
    const result = await processPayrollRun(user, runId);
    await writeAuditLog(user, { action: "update", module: "payroll", entityType: "payroll_run", entityId: result.run.id, campusId: result.run.campusId, after: { status: result.run.status, payslipCount: result.payslipCount, totalMinor: result.totalMinor } });
    revalidatePath("/payroll/runs");
    revalidatePath("/payroll/payslips");
    return { ok: true, data: { id: result.run.id, payslipCount: result.payslipCount, totalMinor: result.totalMinor }, message: `Payroll completed with ${result.payslipCount} payslip(s).` };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to process payroll." }; }
}
