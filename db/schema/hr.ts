import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, tenantColumns, statusColumn } from "./shared";

export const employees = sqliteTable("employees", {
  id: idColumn("employee"),
  ...tenantColumns(),
  employeeNumber: text("employee_number").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  jobTitle: text("job_title"),
  departmentId: text("department_id"),
  managerId: text("manager_id"),
  linkedUserId: text("linked_user_id"),
  salaryMinor: integer("salary_minor").notNull().default(0),
  /** Tenant-configured payroll inputs. These are not statutory tax rules. */
  allowanceMinor: integer("allowance_minor").notNull().default(0),
  fixedDeductionMinor: integer("fixed_deduction_minor").notNull().default(0),
  deductionRateBps: integer("deduction_rate_bps").notNull().default(0),
  joinedOn: integer("joined_on", { mode: "timestamp" }),
  ...auditColumns(),
  status: statusColumn(),
}, (table) => [
  uniqueIndex("employees_org_number_unique").on(table.organizationId, table.employeeNumber),
  index("employees_org_idx").on(table.organizationId, table.status),
  index("employees_linked_user_idx").on(table.organizationId, table.linkedUserId),
]);

export const payrollRuns = sqliteTable("payroll_runs", {
  id: idColumn("payroll"),
  ...tenantColumns(),
  period: text("period").notNull(),
  periodStart: integer("period_start", { mode: "timestamp" }),
  periodEnd: integer("period_end", { mode: "timestamp" }),
  totalMinor: integer("total_minor").notNull().default(0),
  processedAt: integer("processed_at", { mode: "timestamp" }),
  ...auditColumns(),
  status: statusColumn("draft"),
}, (table) => [
  uniqueIndex("payroll_org_campus_period_unique").on(table.organizationId, table.campusId, table.period),
  index("payroll_org_period_idx").on(table.organizationId, table.period),
]);

/** Immutable payroll snapshot generated when a run is processed. */
export const payrollPayslips = sqliteTable("payroll_payslips", {
  id: idColumn("payslip"),
  ...tenantColumns(),
  payrollRunId: text("payroll_run_id").notNull(),
  employeeId: text("employee_id").notNull(),
  employeeNumber: text("employee_number").notNull(),
  employeeName: text("employee_name").notNull(),
  period: text("period").notNull(),
  grossMinor: integer("gross_minor").notNull(),
  deductionsMinor: integer("deductions_minor").notNull().default(0),
  netMinor: integer("net_minor").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  issuedAt: integer("issued_at", { mode: "timestamp" }).notNull(),
  ...auditColumns(),
  status: statusColumn("issued"),
}, (table) => [
  uniqueIndex("payslip_run_employee_unique").on(table.payrollRunId, table.employeeId),
  index("payslip_org_period_idx").on(table.organizationId, table.period),
  index("payslip_employee_idx").on(table.organizationId, table.employeeId),
]);
