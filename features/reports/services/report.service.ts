import { and, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm/column";
import { getDb } from "@/db/client";
import {
  admissionAssessments,
  admissionFollowUps,
  admissionsEnquiries,
  applications,
  attendanceCorrectionRequests,
  exams,
  feeInvoices,
  hostelAllotments,
  hostelRooms,
  inventoryItems,
  libraryIssueTransactions,
  libraryItems,
  marksEntries,
  notificationEvents,
  payrollPayslips,
  routeAllocations,
  studentAttendanceRecords,
  students,
  transportRoutes,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import type { ReportQuery, ReportType } from "../schemas/report.schema";

export type ReportRow = Record<string, string | number | null>;

export type ReportDefinition = {
  key: ReportType;
  label: string;
  description: string;
  columns: string[];
};

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  { key: "students", label: "Student register", description: "Active and inactive student records in the current scope.", columns: ["admissionNumber", "name", "campusId", "status"] },
  { key: "admissions", label: "Admissions pipeline", description: "Enquiry, application, follow-up, and assessment status counts.", columns: ["dataset", "status", "count"] },
  { key: "attendance", label: "Attendance summary", description: "Attendance states, correction queue, and recorded totals.", columns: ["dataset", "state", "count"] },
  { key: "finance", label: "Finance and defaulters", description: "Outstanding invoices and posted collection totals by student.", columns: ["invoiceNumber", "student", "totalMinor", "balanceMinor", "dueOn", "status"] },
  { key: "exams", label: "Exam marks coverage", description: "Exam and marks-entry coverage for the current tenant scope.", columns: ["exam", "status", "marksEntries", "studentsWithMarks"] },
  { key: "payroll", label: "Payroll register", description: "Issued payroll snapshots with gross, deductions, and net totals.", columns: ["period", "employeeNumber", "employeeName", "grossMinor", "deductionsMinor", "netMinor", "status"] },
  { key: "inventory", label: "Inventory and reorder", description: "Current stock and items at or below reorder level.", columns: ["sku", "name", "quantity", "reorderLevel", "status"] },
  { key: "library", label: "Library circulation", description: "Catalogue availability and open circulation records.", columns: ["dataset", "title", "totalCopies", "availableCopies", "openLoans", "status"] },
  { key: "transport", label: "Transport utilization", description: "Active route capacity compared with student allocations.", columns: ["route", "capacity", "allocated", "utilizationPercent", "status"] },
  { key: "hostel", label: "Hostel occupancy", description: "Room capacity compared with active allotments.", columns: ["building", "roomNumber", "capacity", "occupied", "occupancyPercent", "status"] },
  { key: "communication", label: "Communication delivery", description: "Notification delivery status by channel.", columns: ["channel", "status", "count"] },
];

const definitionMap = new Map(REPORT_DEFINITIONS.map((definition) => [definition.key, definition]));

function rowScope(user: CurrentUser, table: { organizationId: AnyColumn; campusId: AnyColumn }) {
  return and(
    eq(table.organizationId, user.organizationId),
    user.campusId ? eq(table.campusId, user.campusId) : undefined,
  );
}

async function studentRows(user: CurrentUser, limit: number): Promise<ReportRow[]> {
  const rows = await getDb().select({
    admissionNumber: students.admissionNumber,
    name: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
    campusId: students.campusId,
    status: students.status,
  }).from(students).where(rowScope(user, students)).orderBy(students.admissionNumber).limit(limit);
  return rows;
}

async function admissionsRows(user: CurrentUser): Promise<ReportRow[]> {
  const [enquiryRows, applicationRows, followUpRows, assessmentRows] = await Promise.all([
    getDb().select({ status: admissionsEnquiries.status, count: count() }).from(admissionsEnquiries).where(rowScope(user, admissionsEnquiries)).groupBy(admissionsEnquiries.status),
    getDb().select({ status: applications.status, count: count() }).from(applications).where(rowScope(user, applications)).groupBy(applications.status),
    getDb().select({ status: admissionFollowUps.status, count: count() }).from(admissionFollowUps).where(rowScope(user, admissionFollowUps)).groupBy(admissionFollowUps.status),
    getDb().select({ status: admissionAssessments.status, count: count() }).from(admissionAssessments).where(rowScope(user, admissionAssessments)).groupBy(admissionAssessments.status),
  ]);
  return [
    ...enquiryRows.map((row) => ({ dataset: "enquiries", status: row.status, count: row.count })),
    ...applicationRows.map((row) => ({ dataset: "applications", status: row.status, count: row.count })),
    ...followUpRows.map((row) => ({ dataset: "follow-ups", status: row.status, count: row.count })),
    ...assessmentRows.map((row) => ({ dataset: "assessments", status: row.status, count: row.count })),
  ];
}

async function attendanceRows(user: CurrentUser): Promise<ReportRow[]> {
  const [states, corrections] = await Promise.all([
    getDb().select({ state: studentAttendanceRecords.state, count: count() }).from(studentAttendanceRecords).where(rowScope(user, studentAttendanceRecords)).groupBy(studentAttendanceRecords.state),
    getDb().select({ state: attendanceCorrectionRequests.status, count: count() }).from(attendanceCorrectionRequests).where(rowScope(user, attendanceCorrectionRequests)).groupBy(attendanceCorrectionRequests.status),
  ]);
  return [
    ...states.map((row) => ({ dataset: "attendance", state: row.state, count: row.count })),
    ...corrections.map((row) => ({ dataset: "corrections", state: row.state, count: row.count })),
  ];
}

async function financeRows(user: CurrentUser, limit: number): Promise<ReportRow[]> {
  const rows = await getDb().select({
    invoiceNumber: feeInvoices.invoiceNumber,
    student: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
    totalMinor: feeInvoices.totalMinor,
    balanceMinor: feeInvoices.balanceMinor,
    dueOn: feeInvoices.dueOn,
    status: feeInvoices.status,
  }).from(feeInvoices).innerJoin(students, and(
    eq(students.id, feeInvoices.studentId),
    eq(students.organizationId, user.organizationId),
    user.campusId ? eq(students.campusId, user.campusId) : undefined,
  )).where(and(
    eq(feeInvoices.organizationId, user.organizationId),
    user.campusId ? eq(feeInvoices.campusId, user.campusId) : undefined,
    gt(feeInvoices.balanceMinor, 0),
  )).orderBy(desc(feeInvoices.dueOn)).limit(limit);
  return rows.map((row) => ({ ...row, dueOn: row.dueOn.toISOString() }));
}

async function examRows(user: CurrentUser, limit: number): Promise<ReportRow[]> {
  const rows = await getDb().select({
    examId: exams.id,
    exam: exams.name,
    status: exams.status,
    marksEntries: sql<number>`count(${marksEntries.id})`,
    studentsWithMarks: sql<number>`count(distinct ${marksEntries.studentId})`,
  }).from(exams).leftJoin(marksEntries, and(
    eq(marksEntries.examId, exams.id),
    eq(marksEntries.organizationId, user.organizationId),
    user.campusId ? eq(marksEntries.campusId, user.campusId) : undefined,
  )).where(and(
    eq(exams.organizationId, user.organizationId),
    user.campusId ? eq(exams.campusId, user.campusId) : undefined,
  )).groupBy(exams.id).orderBy(desc(exams.createdAt)).limit(limit);
  return rows.map((row) => ({ exam: row.exam, status: row.status, marksEntries: row.marksEntries, studentsWithMarks: row.studentsWithMarks }));
}

async function payrollRows(user: CurrentUser, limit: number): Promise<ReportRow[]> {
  const rows = await getDb().select({
    period: payrollPayslips.period,
    employeeNumber: payrollPayslips.employeeNumber,
    employeeName: payrollPayslips.employeeName,
    grossMinor: payrollPayslips.grossMinor,
    deductionsMinor: payrollPayslips.deductionsMinor,
    netMinor: payrollPayslips.netMinor,
    status: payrollPayslips.status,
  }).from(payrollPayslips).where(rowScope(user, payrollPayslips)).orderBy(desc(payrollPayslips.issuedAt)).limit(limit);
  return rows;
}

async function inventoryRows(user: CurrentUser, limit: number): Promise<ReportRow[]> {
  const rows = await getDb().select({
    sku: inventoryItems.sku,
    name: inventoryItems.name,
    quantity: inventoryItems.quantity,
    reorderLevel: inventoryItems.reorderLevel,
    status: inventoryItems.status,
  }).from(inventoryItems).where(and(
    rowScope(user, inventoryItems),
    sql`${inventoryItems.quantity} <= ${inventoryItems.reorderLevel}`,
  )).orderBy(inventoryItems.name).limit(limit);
  return rows;
}

async function libraryRows(user: CurrentUser, limit: number): Promise<ReportRow[]> {
  const [catalogue, loans] = await Promise.all([
    getDb().select({ title: libraryItems.title, totalCopies: libraryItems.totalCopies, availableCopies: libraryItems.availableCopies, status: libraryItems.status }).from(libraryItems).where(rowScope(user, libraryItems)).orderBy(libraryItems.title).limit(limit),
    getDb().select({ dataset: sql<string>`'open_loans'`, title: sql<string>`'All catalogue items'`, totalCopies: sql<number>`0`, availableCopies: sql<number>`0`, openLoans: count(), status: libraryIssueTransactions.status }).from(libraryIssueTransactions).where(and(
      rowScope(user, libraryIssueTransactions),
      isNull(libraryIssueTransactions.returnedAt),
    )).groupBy(libraryIssueTransactions.status),
  ]);
  return [
    ...catalogue.map((row) => ({ dataset: "catalogue", ...row, openLoans: null })),
    ...loans.map((row) => ({ ...row, openLoans: row.openLoans })),
  ];
}

async function transportRows(user: CurrentUser, limit: number): Promise<ReportRow[]> {
  const routes = await getDb().select({ id: transportRoutes.id, route: transportRoutes.name, capacity: transportRoutes.capacity, status: transportRoutes.status }).from(transportRoutes).where(rowScope(user, transportRoutes)).orderBy(transportRoutes.name).limit(limit);
  const allocations = await getDb().select({ routeId: routeAllocations.routeId, allocated: count() }).from(routeAllocations).where(and(
    rowScope(user, routeAllocations),
    eq(routeAllocations.status, "active"),
  )).groupBy(routeAllocations.routeId);
  const allocatedByRoute = new Map(allocations.map((row) => [row.routeId, row.allocated]));
  return routes.map((row) => ({
    route: row.route,
    capacity: row.capacity,
    allocated: allocatedByRoute.get(row.id) ?? 0,
    utilizationPercent: row.capacity ? Number((((allocatedByRoute.get(row.id) ?? 0) / row.capacity) * 100).toFixed(1)) : 0,
    status: row.status,
  }));
}

async function hostelRows(user: CurrentUser, limit: number): Promise<ReportRow[]> {
  const rooms = await getDb().select({ id: hostelRooms.id, building: hostelRooms.building, roomNumber: hostelRooms.roomNumber, capacity: hostelRooms.capacity, status: hostelRooms.status }).from(hostelRooms).where(rowScope(user, hostelRooms)).orderBy(hostelRooms.building, hostelRooms.roomNumber).limit(limit);
  const allotments = await getDb().select({ roomId: hostelAllotments.roomId, occupied: count() }).from(hostelAllotments).where(and(
    rowScope(user, hostelAllotments),
    eq(hostelAllotments.status, "active"),
  )).groupBy(hostelAllotments.roomId);
  const occupiedByRoom = new Map(allotments.map((row) => [row.roomId, row.occupied]));
  return rooms.map((row) => ({
    building: row.building,
    roomNumber: row.roomNumber,
    capacity: row.capacity,
    occupied: occupiedByRoom.get(row.id) ?? 0,
    occupancyPercent: row.capacity ? Number((((occupiedByRoom.get(row.id) ?? 0) / row.capacity) * 100).toFixed(1)) : 0,
    status: row.status,
  }));
}

async function communicationRows(user: CurrentUser): Promise<ReportRow[]> {
  const rows = await getDb().select({ channel: notificationEvents.channel, status: notificationEvents.status, count: count() }).from(notificationEvents).where(rowScope(user, notificationEvents)).groupBy(notificationEvents.channel, notificationEvents.status).orderBy(notificationEvents.channel, notificationEvents.status);
  return rows;
}

export function getReportDefinition(type: ReportType) {
  return definitionMap.get(type) ?? REPORT_DEFINITIONS[0];
}

export async function getReportRows(user: CurrentUser, query: ReportQuery) {
  const limit = query.limit;
  let rows: ReportRow[];
  switch (query.report) {
    case "students": rows = await studentRows(user, limit); break;
    case "admissions": rows = await admissionsRows(user); break;
    case "attendance": rows = await attendanceRows(user); break;
    case "finance": rows = await financeRows(user, limit); break;
    case "exams": rows = await examRows(user, limit); break;
    case "payroll": rows = await payrollRows(user, limit); break;
    case "inventory": rows = await inventoryRows(user, limit); break;
    case "library": rows = await libraryRows(user, limit); break;
    case "transport": rows = await transportRows(user, limit); break;
    case "hostel": rows = await hostelRows(user, limit); break;
    case "communication": rows = await communicationRows(user); break;
  }
  return { definition: getReportDefinition(query.report), rows };
}
