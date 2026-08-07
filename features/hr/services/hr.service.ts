import "server-only";

import { and, asc, count, desc, eq, inArray, isNull, like, or, type AnyColumn } from "drizzle-orm";
import { getDb } from "@/db/client";
import { employees, payrollPayslips, payrollRuns, users } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type { EmployeeInput, PayrollRunInput } from "../schemas/hr.schema";

function campusScope(user: CurrentUser, column: AnyColumn) {
  if (user.campusIds && user.campusIds.length > 0) return inArray(column, user.campusIds);
  return user.campusId ? eq(column, user.campusId) : undefined;
}

function money(minor: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(minor / 100);
}

function periodDates(period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

export async function listEmployees(user: CurrentUser, search?: string) {
  const query = search?.trim();
  return getDb().select().from(employees).where(and(
    eq(employees.organizationId, user.organizationId),
    campusScope(user, employees.campusId),
    eq(employees.status, "active"),
    query ? or(
      like(employees.employeeNumber, `%${query}%`),
      like(employees.firstName, `%${query}%`),
      like(employees.lastName, `%${query}%`),
      like(employees.email, `%${query}%`),
    ) : undefined,
  )).orderBy(asc(employees.firstName), asc(employees.lastName)).limit(500);
}

export async function createEmployee(user: CurrentUser, input: EmployeeInput) {
  if (input.linkedUserId) {
    const linkedUser = await getDb().query.users.findFirst({ where: and(
      eq(users.id, input.linkedUserId),
      eq(users.organizationId, user.organizationId),
      eq(users.status, "active"),
      campusScope(user, users.campusId),
    ) });
    if (!linkedUser) throw new AppError("NOT_FOUND", "The linked portal user is outside your organization or campus scope.", 404);
  }
  const existing = await getDb().query.employees.findFirst({ where: and(
    eq(employees.organizationId, user.organizationId),
    eq(employees.employeeNumber, input.employeeNumber),
  ) });
  if (existing) throw new AppError("CONFLICT", "Employee ID is already in use.", 409);
  const [row] = await getDb().insert(employees).values({
    id: createId("employee"),
    organizationId: user.organizationId,
    campusId: user.campusId,
    employeeNumber: input.employeeNumber,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email || null,
    jobTitle: input.jobTitle || null,
    linkedUserId: input.linkedUserId || null,
    salaryMinor: input.salaryMinor,
    status: "active",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create employee.", 500);
  return row;
}

export async function listPayrollRuns(user: CurrentUser) {
  const rows = await getDb().select({
    id: payrollRuns.id,
    period: payrollRuns.period,
    totalMinor: payrollRuns.totalMinor,
    status: payrollRuns.status,
    processedAt: payrollRuns.processedAt,
    createdAt: payrollRuns.createdAt,
    payslipCount: count(payrollPayslips.id),
  }).from(payrollRuns).leftJoin(payrollPayslips, and(
    eq(payrollPayslips.payrollRunId, payrollRuns.id),
    eq(payrollPayslips.organizationId, user.organizationId),
  )).where(and(
    eq(payrollRuns.organizationId, user.organizationId),
    campusScope(user, payrollRuns.campusId),
  )).groupBy(
    payrollRuns.id,
    payrollRuns.period,
    payrollRuns.totalMinor,
    payrollRuns.status,
    payrollRuns.processedAt,
    payrollRuns.createdAt,
  ).orderBy(desc(payrollRuns.period), desc(payrollRuns.createdAt)).limit(120);
  return rows.map((row) => ({
    ...row,
    total: money(row.totalMinor),
    processedAt: row.processedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createPayrollRun(user: CurrentUser, input: PayrollRunInput) {
  const existing = await getDb().query.payrollRuns.findFirst({ where: and(
    eq(payrollRuns.organizationId, user.organizationId),
    user.campusId ? eq(payrollRuns.campusId, user.campusId) : isNull(payrollRuns.campusId),
    eq(payrollRuns.period, input.period),
  ) });
  if (existing) throw new AppError("CONFLICT", "A payroll run already exists for this campus and period.", 409);
  const dates = periodDates(input.period);
  const [row] = await getDb().insert(payrollRuns).values({
    id: createId("payroll"),
    organizationId: user.organizationId,
    campusId: user.campusId,
    period: input.period,
    periodStart: dates.start,
    periodEnd: dates.end,
    status: "draft",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create payroll run.", 500);
  return row;
}

export async function processPayrollRun(user: CurrentUser, runId: string) {
  return getDb().transaction(async (tx) => {
    const run = await tx.query.payrollRuns.findFirst({ where: and(
      eq(payrollRuns.id, runId),
      eq(payrollRuns.organizationId, user.organizationId),
      campusScope(user, payrollRuns.campusId),
    ) });
    if (!run) throw new AppError("NOT_FOUND", "Payroll run not found in your scope.", 404);
    if (run.status === "completed") throw new AppError("CONFLICT", "Completed payroll runs are immutable.", 409);
    const employeeRows = await tx.select().from(employees).where(and(
      eq(employees.organizationId, user.organizationId),
      eq(employees.status, "active"),
      run.campusId ? eq(employees.campusId, run.campusId) : undefined,
    )).orderBy(asc(employees.employeeNumber));
    if (employeeRows.length === 0) throw new AppError("CONFLICT", "Add at least one active employee before processing payroll.", 409);
    const now = new Date();
    await tx.update(payrollRuns).set({ status: "processing", updatedAt: now, updatedBy: user.id }).where(eq(payrollRuns.id, run.id));
    let totalMinor = 0;
    for (const employee of employeeRows) {
      const grossMinor = Math.max(0, employee.salaryMinor);
      const deductionsMinor = 0;
      const netMinor = grossMinor - deductionsMinor;
      totalMinor += netMinor;
      await tx.insert(payrollPayslips).values({
        id: createId("payslip"),
        organizationId: user.organizationId,
        campusId: employee.campusId,
        payrollRunId: run.id,
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        period: run.period,
        grossMinor,
        deductionsMinor,
        netMinor,
        snapshotJson: JSON.stringify({
          employeeId: employee.id,
          employeeNumber: employee.employeeNumber,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          jobTitle: employee.jobTitle,
          salaryMinor: employee.salaryMinor,
          capturedAt: now.toISOString(),
        }),
        issuedAt: now,
        status: "issued",
        createdBy: user.id,
        updatedBy: user.id,
      });
    }
    const [processed] = await tx.update(payrollRuns).set({
      status: "completed",
      totalMinor,
      processedAt: now,
      updatedAt: now,
      updatedBy: user.id,
    }).where(and(eq(payrollRuns.id, run.id), eq(payrollRuns.status, "processing"))).returning();
    if (!processed) throw new AppError("CONFLICT", "Payroll run changed while it was being processed.", 409);
    return { run: processed, payslipCount: employeeRows.length, totalMinor };
  });
}

export async function listPayslips(user: CurrentUser) {
  const rows = await getDb().select().from(payrollPayslips).where(and(
    eq(payrollPayslips.organizationId, user.organizationId),
    campusScope(user, payrollPayslips.campusId),
  )).orderBy(desc(payrollPayslips.period), asc(payrollPayslips.employeeNumber)).limit(500);
  return rows.map((row) => ({
    ...row,
    gross: money(row.grossMinor),
    deductions: money(row.deductionsMinor),
    net: money(row.netMinor),
    issuedAt: row.issuedAt.toISOString(),
  }));
}
