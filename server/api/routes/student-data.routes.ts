import type { FastifyPluginAsync } from "fastify";
import { listStudentAttendance } from "../../../features/attendance/services/attendance-workspace.service";
import { createLeaveRequest } from "../../../features/attendance/services/leave.service";
import { leaveRequestSchema } from "../../../features/attendance/schemas/leave.schema";
import { listNotificationsPage } from "../../../features/communication/services/communication.service";
import { markNotificationRead } from "../../../features/communication/services/communication.service";
import { listStudentPublishedResults } from "../../../features/exams/services/exam-workspace.service";
import { listStudentReportCards } from "../../../features/exams/services/deep-feature.service";
import { listStudentInvoices, listStudentPayments } from "../../../features/finance/services/finance-workspace.service";
import { getStudentFormOptions, getStudentMedicalProfile, getStudentProfile, listStudents, listStudentsPage } from "../../../features/students/services/students.service";
import { writeAuditLog } from "../../../lib/audit/audit-log";
import {
  authenticateApiRequest,
  requireApiCsrf,
  requireApiPermission,
} from "../auth/bearer-auth";
import {
  notificationsSchema,
  createLeaveRequestSchema,
  markNotificationReadSchema,
  studentAttendanceSchema,
  studentInvoicesSchema,
  studentPaymentsSchema,
  studentReportCardsSchema,
  studentProfileSchema,
  studentResultsSchema,
} from "../schemas/student-data.schemas";
import { apiSuccess, pageQuery, queryString, routeSchema } from "./route-utils";
import { hasPermission } from "../../../lib/rbac/permissions";

type StudentParams = { studentId: string };
type PaginationQuery = { page?: number; pageSize?: number };
type LeaveRequestBody = {
  studentId?: string;
  startsOn: string;
  endsOn: string;
  reason: string;
};
type NotificationParams = { notificationId: string };

export const studentDataRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: PaginationQuery & { search?: string } }>(
    "/students",
    { preHandler: authenticateApiRequest, schema: routeSchema("List scoped students") },
    async (request) => {
      const user = requireApiPermission(request, "students:read");
      return apiSuccess(request, await listStudentsPage(user, {
        ...pageQuery(request.query),
        search: queryString(request.query.search),
      }));
    },
  );

  app.get(
    "/students/form-options",
    { preHandler: authenticateApiRequest, schema: routeSchema("Read student form options") },
    async (request) => {
      const user = requireApiPermission(request, "students:create");
      return apiSuccess(request, await getStudentFormOptions(user));
    },
  );

  app.get(
    "/students/options",
    { preHandler: authenticateApiRequest, schema: routeSchema("List scoped student options") },
    async (request) => {
      const user = requireApiPermission(request, "students:read");
      return apiSuccess(request, await listStudents(user));
    },
  );

  app.get<{ Params: StudentParams }>(
    "/students/:studentId",
    { preHandler: authenticateApiRequest, schema: studentProfileSchema },
    async (request) => {
      const user = requireApiPermission(request, "students:read");
      const profile = await getStudentProfile(user, request.params.studentId);
      const canViewSensitiveGuardianData = hasPermission(user, "students:view_sensitive") || hasPermission(user, "*");
      return {
        data: {
          student: {
            id: profile.student.id,
            admissionNumber: profile.student.admissionNumber,
            firstName: profile.student.firstName,
            lastName: profile.student.lastName,
            dateOfBirth: profile.student.dateOfBirth?.toISOString() ?? null,
            gender: profile.student.gender,
            email: profile.student.email,
            phone: profile.student.phone,
            photoUrl: profile.student.photoUrl,
            bloodGroup: profile.student.bloodGroup,
            campusId: profile.student.campusId,
            joinedOn: profile.student.joinedOn.toISOString(),
            status: profile.student.status,
          },
          guardians: profile.guardians.map((guardian) => ({
            id: guardian.id,
            linkId: guardian.linkId ?? guardian.id,
            firstName: guardian.firstName,
            lastName: guardian.lastName,
            relationship: guardian.relationship,
            customRelationship: guardian.customRelationship ?? null,
            isPrimary: Boolean(guardian.isPrimary),
            isEmergencyContact: Boolean(guardian.isEmergencyContact),
            isBillingContact: Boolean(guardian.isBillingContact),
            email: canViewSensitiveGuardianData || guardian.id === user.linkedGuardianId ? guardian.email ?? null : null,
            phone: canViewSensitiveGuardianData || guardian.id === user.linkedGuardianId ? guardian.phone ?? null : null,
            occupation: canViewSensitiveGuardianData ? guardian.occupation ?? null : null,
            address: canViewSensitiveGuardianData ? guardian.address ?? null : null,
            custodyNotes: canViewSensitiveGuardianData ? guardian.custodyNotes ?? null : null,
          })),
          enrollments: profile.enrollments.map((enrollment) => ({
            id: enrollment.id,
            academicYearId: enrollment.academicYearId,
            classId: enrollment.classId,
            sectionId: enrollment.sectionId,
            rollNumber: enrollment.rollNumber,
            startsOn: enrollment.startsOn.toISOString(),
            endsOn: enrollment.endsOn?.toISOString() ?? null,
            status: enrollment.status,
          })),
          timeline: profile.timeline.map((event) => ({
            id: event.id,
            eventType: event.eventType,
            title: event.title,
            occurredAt: event.occurredAt.toISOString(),
            status: event.status,
          })),
          certificates: profile.certificates.map((certificate) => ({
            id: certificate.id,
            certificateNumber: certificate.certificateNumber,
            certificateType: certificate.certificateType,
            verificationCode: certificate.verificationCode,
            issuedAt: certificate.issuedAt.toISOString(),
            status: certificate.status,
          })),
        },
        meta: { requestId: request.id },
      };
    },
  );

  app.get<{ Params: StudentParams }>(
    "/students/:studentId/medical",
    { preHandler: authenticateApiRequest, schema: routeSchema("Read a sensitive student medical profile") },
    async (request) => {
      const user = requireApiPermission(request, "students:view_sensitive");
      const profile = await getStudentMedicalProfile(user, request.params.studentId);
      await writeAuditLog(user, {
        action: "view_sensitive",
        module: "students",
        entityType: "student_medical_profile",
        entityId: request.params.studentId,
        campusId: user.campusId,
        metadata: { fields: "restricted_health_summary" },
      });
      return apiSuccess(request, profile);
    },
  );

  app.get<{ Params: StudentParams; Querystring: PaginationQuery }>(
    "/students/:studentId/attendance",
    { preHandler: authenticateApiRequest, schema: studentAttendanceSchema },
    async (request) => {
      const user = requireApiPermission(request, "attendance:read");
      const result = await listStudentAttendance(
        user,
        request.params.studentId,
        request.query,
      );
      return {
        data: { studentId: request.params.studentId, ...result },
        meta: { requestId: request.id },
      };
    },
  );

  app.get<{ Params: StudentParams; Querystring: PaginationQuery }>(
    "/students/:studentId/invoices",
    { preHandler: authenticateApiRequest, schema: studentInvoicesSchema },
    async (request) => {
      const user = requireApiPermission(request, "fees:read");
      const result = await listStudentInvoices(
        user,
        request.params.studentId,
        request.query,
      );
      return {
        data: { studentId: request.params.studentId, ...result },
        meta: { requestId: request.id },
      };
    },
  );

  app.get<{ Params: StudentParams; Querystring: PaginationQuery }>(
    "/students/:studentId/payments",
    { preHandler: authenticateApiRequest, schema: studentPaymentsSchema },
    async (request) => {
      const user = requireApiPermission(request, "fees:read");
      const result = await listStudentPayments(
        user,
        request.params.studentId,
        request.query,
      );
      return {
        data: { studentId: request.params.studentId, ...result },
        meta: { requestId: request.id },
      };
    },
  );

  app.get<{ Params: StudentParams; Querystring: PaginationQuery }>(
    "/students/:studentId/results",
    { preHandler: authenticateApiRequest, schema: studentResultsSchema },
    async (request) => {
      const user = requireApiPermission(request, "exams:read");
      const result = await listStudentPublishedResults(
        user,
        request.params.studentId,
        request.query,
      );
      return {
        data: { studentId: request.params.studentId, ...result },
        meta: { requestId: request.id },
      };
    },
  );

  app.get<{ Params: StudentParams }>(
    "/students/:studentId/report-cards",
    { preHandler: authenticateApiRequest, schema: studentReportCardsSchema },
    async (request) => {
      const user = requireApiPermission(request, "exams:read");
      return {
        data: await listStudentReportCards(user, request.params.studentId),
        meta: { requestId: request.id },
      };
    },
  );

  app.get<{ Querystring: PaginationQuery }>(
    "/notifications",
    { preHandler: authenticateApiRequest, schema: notificationsSchema },
    async (request) => {
      const user = requireApiPermission(request, "communication:read");
      const result = await listNotificationsPage(user, request.query);
      return { data: result, meta: { requestId: request.id } };
    },
  );

  app.post<{ Body: LeaveRequestBody }>(
    "/leave-requests",
    { preHandler: [authenticateApiRequest, requireApiCsrf], schema: createLeaveRequestSchema },
    async (request, reply) => {
      const user = requireApiPermission(request, "attendance:request_leave");
      const input = leaveRequestSchema.parse(request.body);
      const row = await createLeaveRequest(user, input);
      await writeAuditLog(user, {
        action: "create",
        module: "attendance",
        entityType: "leave_request",
        entityId: row.id,
        campusId: row.campusId,
        after: row,
      });
      return reply.code(201).send({
        data: {
          id: row.id,
          requesterType: row.requesterType,
          requesterId: row.requesterId,
          startsOn: row.startsOn.toISOString(),
          endsOn: row.endsOn.toISOString(),
          reason: row.reason,
          status: row.status,
        },
        meta: { requestId: request.id },
      });
    },
  );

  app.patch<{ Params: NotificationParams }>(
    "/notifications/:notificationId/read",
    { preHandler: [authenticateApiRequest, requireApiCsrf], schema: markNotificationReadSchema },
    async (request) => {
      const user = requireApiPermission(request, "communication:read");
      const row = await markNotificationRead(
        user,
        request.params.notificationId,
      );
      await writeAuditLog(user, {
        action: "update",
        module: "communication",
        entityType: "notification",
        entityId: row.id,
        campusId: row.campusId,
        after: { status: row.status, readAt: row.readAt },
      });
      return {
        data: {
          id: row.id,
          readAt: row.readAt!.toISOString(),
          status: row.status,
        },
        meta: { requestId: request.id },
      };
    },
  );
};
