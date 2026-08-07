import "server-only";

import { and, count, eq, inArray, isNull, sql, sum } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  assignments,
  feeInvoices,
  enrollments,
  libraryIssueTransactions,
  lessonPlans,
  marksEntries,
  notificationEvents,
  resultPublications,
  routeAllocations,
  studentAttendanceRecords,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import { listStudentsPage, resolvePermittedStudentIds } from "@/features/students/services/students.service";

export type PortalMetric = { label: string; value: string; detail: string; href: string };

export type PortalSnapshot = {
  metrics: PortalMetric[];
  students: Array<{ id: string; name: string; detail: string; status: string }>;
  recent: Array<{ title: string; detail: string; href: string }>;
  offlineNote: string;
};

export async function getPortalSnapshot(user: CurrentUser, portal: "teacher" | "student" | "parent"): Promise<PortalSnapshot> {
  const permittedIds = await resolvePermittedStudentIds(user);
  const studentsPage = await listStudentsPage(user, { pageSize: 100 });
  const studentsInScope = studentsPage.rows;
  const emptyLinkedScope = permittedIds !== undefined && permittedIds.length === 0;
  const studentRecordScope = and(
    eq(studentAttendanceRecords.organizationId, user.organizationId),
    user.campusId ? eq(studentAttendanceRecords.campusId, user.campusId) : undefined,
    permittedIds ? permittedIds.length ? inArray(studentAttendanceRecords.studentId, permittedIds) : eq(studentAttendanceRecords.studentId, "__no_linked_student__") : undefined,
  );
  const [attendance, present, outstanding, assignmentCount, resultCount, unread, transportCount, openLoans, lessonPlanCount] = await Promise.all([
    emptyLinkedScope ? [{ value: 0 }] : getDb().select({ value: count() }).from(studentAttendanceRecords).where(studentRecordScope),
    emptyLinkedScope ? [{ value: 0 }] : getDb().select({ value: count() }).from(studentAttendanceRecords).where(and(studentRecordScope, eq(studentAttendanceRecords.state, "present"))),
    emptyLinkedScope ? [{ value: 0 }] : getDb().select({ value: sum(feeInvoices.balanceMinor) }).from(feeInvoices).where(and(
      eq(feeInvoices.organizationId, user.organizationId),
      user.campusId ? eq(feeInvoices.campusId, user.campusId) : undefined,
      permittedIds ? permittedIds.length ? inArray(feeInvoices.studentId, permittedIds) : eq(feeInvoices.studentId, "__no_linked_student__") : undefined,
      eq(feeInvoices.status, "open"),
    )),
    portal === "teacher" ? getDb().select({ value: count() }).from(assignments).where(and(eq(assignments.organizationId, user.organizationId), eq(assignments.teacherId, user.id), eq(assignments.status, "published"), user.campusId ? eq(assignments.campusId, user.campusId) : undefined)) : emptyLinkedScope ? [{ value: 0 }] : getDb().select({ value: sql<number>`count(distinct ${assignments.id})` }).from(assignments).innerJoin(enrollments, and(eq(enrollments.classId, assignments.classId), eq(enrollments.organizationId, user.organizationId), eq(enrollments.status, "active"), user.campusId ? eq(enrollments.campusId, user.campusId) : undefined)).where(and(eq(assignments.organizationId, user.organizationId), user.campusId ? eq(assignments.campusId, user.campusId) : undefined, permittedIds ? permittedIds.length ? inArray(enrollments.studentId, permittedIds) : eq(enrollments.studentId, "__no_linked_student__") : undefined, eq(assignments.status, "published"))),
    emptyLinkedScope || portal === "teacher" ? [{ value: 0 }] : getDb().select({ value: count() }).from(marksEntries).innerJoin(resultPublications, and(eq(resultPublications.examId, marksEntries.examId), eq(resultPublications.organizationId, user.organizationId), eq(resultPublications.status, "published"))).where(and(eq(marksEntries.organizationId, user.organizationId), user.campusId ? eq(marksEntries.campusId, user.campusId) : undefined, permittedIds?.length ? inArray(marksEntries.studentId, permittedIds) : eq(marksEntries.studentId, "__no_linked_student__"))),
    getDb().select({ value: count() }).from(notificationEvents).where(and(eq(notificationEvents.organizationId, user.organizationId), user.id ? eq(notificationEvents.recipientUserId, user.id) : undefined, isNull(notificationEvents.readAt), user.campusId ? eq(notificationEvents.campusId, user.campusId) : undefined)),
    emptyLinkedScope ? [{ value: 0 }] : getDb().select({ value: count() }).from(routeAllocations).where(and(eq(routeAllocations.organizationId, user.organizationId), eq(routeAllocations.status, "active"), permittedIds ? permittedIds.length ? inArray(routeAllocations.studentId, permittedIds) : eq(routeAllocations.studentId, "__no_linked_student__") : undefined, user.campusId ? eq(routeAllocations.campusId, user.campusId) : undefined)),
    emptyLinkedScope ? [{ value: 0 }] : getDb().select({ value: count() }).from(libraryIssueTransactions).where(and(eq(libraryIssueTransactions.organizationId, user.organizationId), eq(libraryIssueTransactions.borrowerType, "student"), eq(libraryIssueTransactions.status, "issued"), isNull(libraryIssueTransactions.returnedAt), permittedIds ? permittedIds.length ? inArray(libraryIssueTransactions.borrowerId, permittedIds) : eq(libraryIssueTransactions.borrowerId, "__no_linked_student__") : undefined, user.campusId ? eq(libraryIssueTransactions.campusId, user.campusId) : undefined)),
    portal === "teacher" ? getDb().select({ value: count() }).from(lessonPlans).where(and(eq(lessonPlans.organizationId, user.organizationId), eq(lessonPlans.teacherId, user.id), user.campusId ? eq(lessonPlans.campusId, user.campusId) : undefined)) : [{ value: 0 }],
  ]);
  const totalAttendance = Number(attendance[0]?.value ?? 0);
  const presentAttendance = Number(present[0]?.value ?? 0);
  const metrics: PortalMetric[] = portal === "teacher" ? [
    { label: "Assigned students", value: studentsPage.pageInfo.total.toLocaleString("en-IN"), detail: "Current class/section scope", href: "/students" },
    { label: "Published assignments", value: Number(assignmentCount[0]?.value ?? 0).toLocaleString("en-IN"), detail: "Owned by your teacher account", href: "/academics/assignments" },
    { label: "Lesson plans", value: Number(lessonPlanCount[0]?.value ?? 0).toLocaleString("en-IN"), detail: "Your planned lessons", href: "/academics/lesson-plans" },
    { label: "Unread messages", value: Number(unread[0]?.value ?? 0).toLocaleString("en-IN"), detail: "Requires review", href: "/communication/messages" },
    { label: "Leave", value: "Open", detail: "Review leave workspace", href: "/attendance/leave" },
  ] : [
    { label: "Attendance", value: `${totalAttendance ? ((presentAttendance / totalAttendance) * 100).toFixed(1) : "0.0"}%`, detail: `${presentAttendance}/${totalAttendance} recorded present`, href: "/attendance/students" },
    { label: "Assignments", value: Number(assignmentCount[0]?.value ?? 0).toLocaleString("en-IN"), detail: "Published for your linked student scope", href: "/academics/assignments" },
    { label: "Results", value: Number(resultCount[0]?.value ?? 0).toLocaleString("en-IN"), detail: "Published result entries", href: "/exams/results" },
    { label: "Fee balance", value: `₹${Number(outstanding[0]?.value ?? 0).toLocaleString("en-IN")}`, detail: "Outstanding invoices", href: "/fees/receipts" },
    { label: "Transport", value: Number(transportCount[0]?.value ?? 0).toLocaleString("en-IN"), detail: "Active route allocations", href: "/transport/allocations" },
  ];
  const recent = portal === "teacher" ? [
    { title: "Mark attendance", detail: "Open the scoped attendance workspace.", href: "/attendance/students" },
    { title: "Review assignments", detail: "Open published assignments for your classes.", href: "/academics/assignments" },
    { title: "Enter marks", detail: "Only assigned class/subject records are writable.", href: "/exams/marks" },
  ] : [
    { title: "My records", detail: "Open profile, documents, and history.", href: "/students" },
    { title: "Library", detail: `${Number(openLoans[0]?.value ?? 0)} open loan(s) in your linked scope.`, href: "/library/issue-return" },
    { title: "Notices", detail: "Read published school communication.", href: "/communication/notices" },
  ];
  return { metrics, students: studentsInScope, recent, offlineNote: "Portal data is read from authorized server queries. If connectivity is interrupted, retry rather than assuming a write was accepted." };
}
