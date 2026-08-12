import { and, count, eq, gte, sql, sum } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  alerts,
  employees,
  feeInvoices,
  hostelAllotments,
  hostelRooms,
  routeAllocations,
  studentAttendanceRecords,
  students,
  transportRoutes,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";

export type DashboardMetrics = {
  students: number;
  attendanceRate: number;
  collectionRate: number;
  pendingMinor: number;
  staff: number;
  transportUtilization: number;
  hostelOccupancy: number;
  openAlerts: number;
};

export type DashboardTrend = { month: string; attendance: number; collection: number };

export async function getDashboardMetrics(user: CurrentUser): Promise<DashboardMetrics> {
  const tenant = eq(students.organizationId, user.organizationId);
  const campus = user.campusId ? eq(students.campusId, user.campusId) : undefined;
  const [
    studentRows, attendanceRows, invoiceRows, staffRows, routeRows,
    allocationRows, roomRows, allotmentRows, alertRows,
  ] = await Promise.all([
    getDb().select({ value: count() }).from(students).where(and(tenant, campus, eq(students.status, "active"))),
    getDb().select({
      total: count(),
      present: sql<number>`sum(case when ${studentAttendanceRecords.state} = 'present' then 1 else 0 end)`,
    }).from(studentAttendanceRecords).where(and(
      eq(studentAttendanceRecords.organizationId, user.organizationId),
      user.campusId ? eq(studentAttendanceRecords.campusId, user.campusId) : undefined,
    )),
    getDb().select({ total: sum(feeInvoices.totalMinor), balance: sum(feeInvoices.balanceMinor) }).from(feeInvoices).where(and(
      eq(feeInvoices.organizationId, user.organizationId),
      user.campusId ? eq(feeInvoices.campusId, user.campusId) : undefined,
    )),
    getDb().select({ value: count() }).from(employees).where(and(eq(employees.organizationId, user.organizationId), user.campusId ? eq(employees.campusId, user.campusId) : undefined, eq(employees.status, "active"))),
    getDb().select({ capacity: sum(transportRoutes.capacity) }).from(transportRoutes).where(and(eq(transportRoutes.organizationId, user.organizationId), user.campusId ? eq(transportRoutes.campusId, user.campusId) : undefined, eq(transportRoutes.status, "active"))),
    getDb().select({ value: count() }).from(routeAllocations).where(and(eq(routeAllocations.organizationId, user.organizationId), user.campusId ? eq(routeAllocations.campusId, user.campusId) : undefined, eq(routeAllocations.status, "active"))),
    getDb().select({ capacity: sum(hostelRooms.capacity) }).from(hostelRooms).where(and(eq(hostelRooms.organizationId, user.organizationId), user.campusId ? eq(hostelRooms.campusId, user.campusId) : undefined, eq(hostelRooms.status, "active"))),
    getDb().select({ value: count() }).from(hostelAllotments).where(and(eq(hostelAllotments.organizationId, user.organizationId), user.campusId ? eq(hostelAllotments.campusId, user.campusId) : undefined, eq(hostelAllotments.status, "active"))),
    getDb().select({ value: count() }).from(alerts).where(and(eq(alerts.organizationId, user.organizationId), user.campusId ? eq(alerts.campusId, user.campusId) : undefined, eq(alerts.status, "open"))),
  ]);
  // Keep the total and present counts in one tenant-scoped scan.
  const totalAttendance = Number(attendanceRows[0]?.total ?? 0);
  const presentAttendance = Number(attendanceRows[0]?.present ?? 0);
  const totalMinor = Number(invoiceRows[0]?.total ?? 0);
  const pendingMinor = Number(invoiceRows[0]?.balance ?? 0);
  const routeCapacity = Number(routeRows[0]?.capacity ?? 0);
  const hostelCapacity = Number(roomRows[0]?.capacity ?? 0);
  return {
    students: studentRows[0]?.value ?? 0,
    attendanceRate: totalAttendance ? (presentAttendance / totalAttendance) * 100 : 0,
    collectionRate: totalMinor ? ((totalMinor - pendingMinor) / totalMinor) * 100 : 0,
    pendingMinor,
    staff: staffRows[0]?.value ?? 0,
    transportUtilization: routeCapacity ? ((allocationRows[0]?.value ?? 0) / routeCapacity) * 100 : 0,
    hostelOccupancy: hostelCapacity ? ((allotmentRows[0]?.value ?? 0) / hostelCapacity) * 100 : 0,
    openAlerts: alertRows[0]?.value ?? 0,
  };
}

export async function getDashboardTrends(user: CurrentUser): Promise<DashboardTrend[]> {
  const start = new Date();
  start.setMonth(start.getMonth() - 5, 1);
  start.setHours(0, 0, 0, 0);
  const attendanceMonth = sql<string>`strftime('%Y-%m', ${studentAttendanceRecords.attendanceDate}, 'unixepoch')`;
  const invoiceMonth = sql<string>`strftime('%Y-%m', ${feeInvoices.issuedOn}, 'unixepoch')`;
  const [attendanceRows, invoiceRows] = await Promise.all([
    getDb().select({
      month: attendanceMonth,
      total: count(),
      present: sql<number>`sum(case when ${studentAttendanceRecords.state} = 'present' then 1 else 0 end)`,
    }).from(studentAttendanceRecords).where(and(
      eq(studentAttendanceRecords.organizationId, user.organizationId),
      user.campusId ? eq(studentAttendanceRecords.campusId, user.campusId) : undefined,
      gte(studentAttendanceRecords.attendanceDate, start),
    )).groupBy(attendanceMonth),
    getDb().select({
      month: invoiceMonth,
      total: sum(feeInvoices.totalMinor),
      balance: sum(feeInvoices.balanceMinor),
    }).from(feeInvoices).where(and(
      eq(feeInvoices.organizationId, user.organizationId),
      user.campusId ? eq(feeInvoices.campusId, user.campusId) : undefined,
      gte(feeInvoices.issuedOn, start),
    )).groupBy(invoiceMonth),
  ]);
  const attendanceByMonth = new Map(attendanceRows.map((row) => [
    row.month,
    row.total ? Number(row.present ?? 0) / Number(row.total) * 100 : 0,
  ]));
  const collectionByMonth = new Map(invoiceRows.map((row) => {
    const total = Number(row.total ?? 0);
    const balance = Number(row.balance ?? 0);
    return [row.month, total ? (total - balance) / total * 100 : 0] as const;
  }));
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      month: date.toLocaleDateString("en", { month: "short" }),
      attendance: Number((attendanceByMonth.get(key) ?? 0).toFixed(1)),
      collection: Number((collectionByMonth.get(key) ?? 0).toFixed(1)),
    };
  });
}
