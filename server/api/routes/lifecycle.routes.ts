import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  certificateIssueSchema,
  enrollmentTransferSchema,
  guardianSchema,
  guardianUnlinkSchema,
  guardianUpdateSchema,
  medicalProfileSchema,
  studentSchema,
  studentUpdateSchema,
} from "../../../features/students/schemas/student.schema";
import {
  createGuardianAndLink,
  createStudentRecord,
  issueStudentCertificate,
  transferStudentEnrollment,
  unlinkGuardian,
  updateGuardian,
  updateStudentRecord,
  upsertStudentMedicalProfile,
} from "../../../features/students/services/students.service";
import {
  applicationReviewSchema,
  applicationSchema,
  assessmentResultSchema,
  assessmentSchema,
  enquirySchema,
  enquiryUpdateSchema,
  followUpCompleteSchema,
  followUpSchema,
} from "../../../features/admissions/schemas/admissions.schema";
import { admissionApprovalSchema } from "../../../features/admissions/schemas/approval.schema";
import {
  createApplication,
  createEnquiry,
  createEnquiryFollowUp,
  completeEnquiryFollowUp,
  getAdmissionOptions,
  getAdmissionSeatMatrix,
  listApplicationsPage,
  listApprovalQueue,
  listEnquiriesPage,
  recordAdmissionAssessment,
  reviewApplication,
  scheduleAdmissionAssessment,
  updateEnquiry,
} from "../../../features/admissions/services/admissions.service";
import { approveAdmission } from "../../../features/admissions/services/approval.service";
import { attendanceSchema } from "../../../features/attendance/schemas/attendance.schema";
import { staffAttendanceSchema } from "../../../features/attendance/schemas/attendance-extension.schema";
import { disciplineDecisionSchema, disciplineIncidentSchema } from "../../../features/attendance/schemas/discipline.schema";
import { markAttendanceRecord, reviewAttendanceCorrection } from "../../../features/attendance/services/attendance.service";
import { getAttendanceOverview, getAttendanceStudentOptions, listAttendanceCorrections, listAttendancePage } from "../../../features/attendance/services/attendance-workspace.service";
import { listEmployeeOptions, listLowAttendance, listStaffAttendance, recordStaffAttendance } from "../../../features/attendance/services/attendance-extension.service";
import { createDisciplineIncident, listDisciplineIncidents, updateDisciplineStatus } from "../../../features/attendance/services/discipline.service";
import { listLeaveRequests, reviewLeaveRequest } from "../../../features/attendance/services/leave.service";
import { clinicVisitSchema, healthProfileSchema } from "../../../features/health/schemas/health.schema";
import { createClinicVisit, listClinicVisits, listHealthProfiles, listHealthStudents, upsertHealthProfile } from "../../../features/health/services/health.service";
import { AppError } from "../../../lib/errors/app-error";
import { authenticateApiRequest, requireApiCsrf, requireApiPermission } from "../auth/bearer-auth";
import { apiCreated, apiSuccess, auditCommand, parseApiBody, pageQuery, queryString, routeSchema } from "./route-utils";

type IdParams = { id: string };
type StudentParams = { studentId: string };
type AssessmentParams = { id: string };
type ApplicationQuery = { page?: number; pageSize?: number; search?: string };

const authenticated = { preHandler: authenticateApiRequest };
const mutation = { preHandler: [authenticateApiRequest, requireApiCsrf] };
const decisionSchema = z.object({ decision: z.enum(["approved", "rejected"]) });

function bodyWithId(body: unknown, id: string) {
  return { ...(body as Record<string, unknown>), id };
}

export const lifecycleRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: unknown }>("/students", { ...mutation, schema: routeSchema("Create a student") }, async (request, reply) => {
    const user = requireApiPermission(request, "students:create");
    const input = parseApiBody(studentSchema, request.body);
    const row = await createStudentRecord(user, input);
    await auditCommand(user, { action: "create", module: "students", entityType: "student", entityId: row.id, campusId: row.campusId, after: row });
    return apiCreated(reply, request, { id: row.id });
  });

  app.patch<{ Params: IdParams; Body: unknown }>("/students/:id", { ...mutation, schema: routeSchema("Update a student") }, async (request) => {
    const user = requireApiPermission(request, "students:update");
    const input = parseApiBody(studentUpdateSchema, bodyWithId(request.body, request.params.id));
    const result = await updateStudentRecord(user, input);
    await auditCommand(user, { action: "update", module: "students", entityType: "student", entityId: result.updated.id, campusId: result.updated.campusId, before: result.existing, after: result.updated });
    return apiSuccess(request, { id: result.updated.id });
  });

  app.post<{ Params: StudentParams; Body: unknown }>("/students/:studentId/guardians", { ...mutation, schema: routeSchema("Link a guardian to a student") }, async (request, reply) => {
    const user = requireApiPermission(request, "students:update");
    const input = parseApiBody(guardianSchema, { ...(request.body as Record<string, unknown>), studentId: request.params.studentId });
    const result = await createGuardianAndLink(user, input);
    await auditCommand(user, { action: "create", module: "students", entityType: "guardian", entityId: result.guardian.id, campusId: result.guardian.campusId, after: { studentId: input.studentId, relationship: input.relationship, customRelationship: input.customRelationship, isPrimary: input.isPrimary, isEmergencyContact: input.isEmergencyContact, isBillingContact: input.isBillingContact } });
    return apiCreated(reply, request, { id: result.guardian.id });
  });

  app.patch<{ Params: StudentParams & IdParams; Body: unknown }>("/students/:studentId/guardians/:id", { ...mutation, schema: routeSchema("Update a student guardian") }, async (request) => {
    const user = requireApiPermission(request, "students:update");
    const input = parseApiBody(guardianUpdateSchema, { ...(request.body as Record<string, unknown>), studentId: request.params.studentId, id: request.params.id });
    const result = await updateGuardian(user, input);
    await auditCommand(user, { action: "update", module: "students", entityType: "guardian", entityId: result.guardian.id, campusId: result.guardian.campusId, after: { studentId: input.studentId, relationship: input.relationship, customRelationship: input.customRelationship, isPrimary: input.isPrimary, isEmergencyContact: input.isEmergencyContact, isBillingContact: input.isBillingContact } });
    return apiSuccess(request, { id: result.guardian.id });
  });

  app.delete<{ Params: StudentParams & IdParams }>("/students/:studentId/guardians/:id", mutation, async (request) => {
    const user = requireApiPermission(request, "students:update");
    const input = parseApiBody(guardianUnlinkSchema, { studentId: request.params.studentId, guardianId: request.params.id });
    const result = await unlinkGuardian(user, input);
    await auditCommand(user, { action: "delete", module: "students", entityType: "student_guardian_link", entityId: result.id, after: input });
    return apiSuccess(request, result);
  });

  app.post<{ Params: StudentParams; Body: unknown }>("/students/:studentId/enrollment", { ...mutation, schema: routeSchema("Transfer student enrollment") }, async (request) => {
    const user = requireApiPermission(request, "students:update");
    const input = parseApiBody(enrollmentTransferSchema, { ...(request.body as Record<string, unknown>), studentId: request.params.studentId });
    const result = await transferStudentEnrollment(user, input);
    if (result.changed) await auditCommand(user, { action: "update", module: "students", entityType: "enrollment", entityId: result.current.id, campusId: result.current.campusId, after: { studentId: input.studentId, previousEnrollmentId: result.previous?.id, enrollmentId: result.current.id } });
    return apiSuccess(request, { id: result.current.id, changed: result.changed });
  });

  app.put<{ Params: StudentParams; Body: unknown }>("/students/:studentId/medical", { ...mutation, schema: routeSchema("Save a sensitive student medical profile") }, async (request) => {
    const user = requireApiPermission(request, "students:update");
    if (!user.permissions.includes("students:view_sensitive") && !user.permissions.includes("*")) {
      throw new AppError("FORBIDDEN", "Sensitive student permission is required.");
    }
    const input = parseApiBody(medicalProfileSchema, { ...(request.body as Record<string, unknown>), studentId: request.params.studentId });
    const profile = await upsertStudentMedicalProfile(user, input);
    await auditCommand(user, { action: "update", module: "students", entityType: "student_medical_profile", entityId: profile.id, campusId: profile.campusId, metadata: { studentId: input.studentId, fieldsUpdated: ["allergies", "conditions", "medications", "emergencyNotes"] } });
    return apiSuccess(request, { id: profile.id });
  });

  app.post<{ Params: StudentParams; Body: unknown }>("/students/:studentId/certificates", { ...mutation, schema: routeSchema("Issue a student certificate") }, async (request, reply) => {
    const user = requireApiPermission(request, "students:update");
    const input = parseApiBody(certificateIssueSchema, { ...(request.body as Record<string, unknown>), studentId: request.params.studentId });
    const certificate = await issueStudentCertificate(user, input);
    await auditCommand(user, { action: "create", module: "students", entityType: "student_certificate", entityId: certificate.id, campusId: certificate.campusId, after: { studentId: input.studentId, certificateNumber: certificate.certificateNumber, certificateType: certificate.certificateType } });
    return apiCreated(reply, request, { id: certificate.id, certificateNumber: certificate.certificateNumber });
  });

  app.get<{ Querystring: { allCampuses?: string } }>("/admissions/options", authenticated, async (request) => {
    const user = requireApiPermission(request, "admissions:read");
    return apiSuccess(request, await getAdmissionOptions(user, { allAccessibleCampuses: request.query.allCampuses === "true" }));
  });

  app.get<{ Querystring: ApplicationQuery }>("/admissions/enquiries", authenticated, async (request) => {
    const user = requireApiPermission(request, "admissions:read");
    return apiSuccess(request, await listEnquiriesPage(user, { ...pageQuery(request.query), search: queryString(request.query.search) }));
  });

  app.post<{ Body: unknown }>("/admissions/enquiries", { ...mutation, schema: routeSchema("Create an admissions enquiry") }, async (request, reply) => {
    const user = requireApiPermission(request, "admissions:create");
    const input = parseApiBody(enquirySchema, request.body);
    const row = await createEnquiry(user, input);
    await auditCommand(user, { action: "create", module: "admissions", entityType: "enquiry", entityId: row.id, campusId: row.campusId, after: row });
    return apiCreated(reply, request, { id: row.id });
  });

  app.patch<{ Params: IdParams; Body: unknown }>("/admissions/enquiries/:id", { ...mutation, schema: routeSchema("Update an admissions enquiry") }, async (request) => {
    const user = requireApiPermission(request, "admissions:update");
    const result = await updateEnquiry(user, parseApiBody(enquiryUpdateSchema, bodyWithId(request.body, request.params.id)));
    await auditCommand(user, { action: "update", module: "admissions", entityType: "enquiry", entityId: result.updated.id, before: result.before, after: result.updated });
    return apiSuccess(request, { id: result.updated.id });
  });

  app.post<{ Params: IdParams; Body: unknown }>("/admissions/enquiries/:id/follow-ups", { ...mutation, schema: routeSchema("Schedule an admissions follow-up") }, async (request, reply) => {
    const user = requireApiPermission(request, "admissions:update");
    const row = await createEnquiryFollowUp(user, parseApiBody(followUpSchema, { ...(request.body as Record<string, unknown>), enquiryId: request.params.id }));
    await auditCommand(user, { action: "create", module: "admissions", entityType: "enquiry_follow_up", entityId: row.id, after: { enquiryId: row.enquiryId, dueAt: row.dueAt } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.post<{ Params: IdParams; Body: unknown }>("/admissions/follow-ups/:id/complete", { ...mutation, schema: routeSchema("Complete an admissions follow-up") }, async (request) => {
    const user = requireApiPermission(request, "admissions:update");
    const result = await completeEnquiryFollowUp(user, parseApiBody(followUpCompleteSchema, bodyWithId(request.body, request.params.id)));
    await auditCommand(user, { action: "update", module: "admissions", entityType: "enquiry_follow_up", entityId: result.updated.id, before: result.before, after: result.updated });
    return apiSuccess(request, { id: result.updated.id });
  });

  app.get<{ Querystring: ApplicationQuery }>("/admissions/applications", authenticated, async (request) => {
    const user = requireApiPermission(request, "admissions:read");
    return apiSuccess(request, await listApplicationsPage(user, { ...pageQuery(request.query), search: queryString(request.query.search) }));
  });

  app.post<{ Body: unknown }>("/admissions/applications", { ...mutation, schema: routeSchema("Create an admissions application") }, async (request, reply) => {
    const user = requireApiPermission(request, "admissions:create");
    const row = await createApplication(user, parseApiBody(applicationSchema, request.body));
    await auditCommand(user, { action: "create", module: "admissions", entityType: "application", entityId: row.id, campusId: row.campusId, after: row });
    return apiCreated(reply, request, { id: row.id, applicationNumber: row.applicationNumber });
  });

  app.patch<{ Params: IdParams; Body: unknown }>("/admissions/applications/:id/review", { ...mutation, schema: routeSchema("Review an admissions application") }, async (request) => {
    const input = parseApiBody(applicationReviewSchema, bodyWithId(request.body, request.params.id));
    const user = requireApiPermission(request, input.decision === "verified" ? "admissions:update" : "admissions:reject");
    const result = await reviewApplication(user, input);
    await auditCommand(user, { action: input.decision === "rejected" ? "reject" : "update", module: "admissions", entityType: "application", entityId: result.updated.id, before: result.before, after: result.updated });
    return apiSuccess(request, { id: result.updated.id });
  });

  app.get("/admissions/approvals", authenticated, async (request) => {
    const user = requireApiPermission(request, "admissions:read");
    return apiSuccess(request, await listApprovalQueue(user));
  });

  app.get<{ Querystring: { campusId?: string; academicYearId?: string; classId?: string; sectionId?: string } }>("/admissions/seat-matrix", authenticated, async (request) => {
    const user = requireApiPermission(request, "admissions:read");
    return apiSuccess(request, await getAdmissionSeatMatrix(user, request.query));
  });

  app.post<{ Params: IdParams; Body: unknown }>("/admissions/applications/:id/approve", { ...mutation, schema: routeSchema("Approve an admission and enroll the student") }, async (request) => {
    const user = requireApiPermission(request, "admissions:approve");
    const result = await approveAdmission(user, parseApiBody(admissionApprovalSchema, { ...(request.body as Record<string, unknown>), applicationId: request.params.id }));
    await auditCommand(user, { action: "approve", module: "admissions", entityType: "application", entityId: result.application.id, before: result.application, after: { status: "approved", studentId: result.student.id } });
    return apiSuccess(request, { studentId: result.student.id });
  });

  app.post<{ Params: IdParams; Body: unknown }>("/admissions/applications/:id/assessments", { ...mutation, schema: routeSchema("Schedule an admissions assessment") }, async (request, reply) => {
    const user = requireApiPermission(request, "admissions:update");
    const row = await scheduleAdmissionAssessment(user, parseApiBody(assessmentSchema, { ...(request.body as Record<string, unknown>), applicationId: request.params.id }));
    await auditCommand(user, { action: "create", module: "admissions", entityType: "assessment", entityId: row.id, after: { applicationId: row.applicationId, assessmentType: row.assessmentType, scheduledAt: row.scheduledAt } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.patch<{ Params: AssessmentParams; Body: unknown }>("/admissions/assessments/:id", { ...mutation, schema: routeSchema("Record an admissions assessment result") }, async (request) => {
    const user = requireApiPermission(request, "admissions:update");
    const result = await recordAdmissionAssessment(user, parseApiBody(assessmentResultSchema, bodyWithId(request.body, request.params.id)));
    await auditCommand(user, { action: "update", module: "admissions", entityType: "assessment", entityId: result.updated.id, before: result.before, after: { outcome: result.updated.outcome, score: result.updated.score } });
    return apiSuccess(request, { id: result.updated.id });
  });

  app.post<{ Body: unknown }>("/attendance/records", { ...mutation, schema: routeSchema("Mark student attendance") }, async (request) => {
    const user = requireApiPermission(request, "attendance:mark");
    const input = parseApiBody(attendanceSchema, request.body);
    const result = await markAttendanceRecord(user, input);
    await auditCommand(user, { action: result.kind === "correction" ? "create" : "update", module: "attendance", entityType: result.kind === "correction" ? "attendance_correction" : "student_attendance", entityId: result.row.id, after: result.row });
    return apiSuccess(request, { id: result.row.id, correctionRequested: result.kind === "correction" });
  });

  app.post<{ Params: IdParams; Body: unknown }>("/attendance/corrections/:id/review", { ...mutation, schema: routeSchema("Review an attendance correction") }, async (request) => {
    const user = requireApiPermission(request, "attendance:approve_correction");
    const body = parseApiBody(decisionSchema, request.body);
    const result = await reviewAttendanceCorrection(user, request.params.id, body.decision);
    await auditCommand(user, { action: body.decision === "approved" ? "approve" : "reject", module: "attendance", entityType: "attendance_correction", entityId: result.reviewed.id, before: result.attendance, after: result.reviewed });
    return apiSuccess(request, { id: result.reviewed.id });
  });

  app.get("/attendance/leave", authenticated, async (request) => {
    const user = requireApiPermission(request, "attendance:read");
    return apiSuccess(request, await listLeaveRequests(user));
  });

  app.post<{ Params: IdParams; Body: unknown }>("/leave-requests/:id/review", { ...mutation, schema: routeSchema("Review a leave request") }, async (request) => {
    const user = requireApiPermission(request, "attendance:approve_leave");
    const body = parseApiBody(decisionSchema, request.body);
    const result = await reviewLeaveRequest(user, request.params.id, body.decision);
    await auditCommand(user, { action: body.decision === "approved" ? "approve" : "reject", module: "attendance", entityType: "leave_request", entityId: result.row.id, before: result.before, after: result.row });
    return apiSuccess(request, { id: result.row.id });
  });

  app.get("/attendance/discipline", authenticated, async (request) => {
    const user = requireApiPermission(request, "safety:read");
    return apiSuccess(request, await listDisciplineIncidents(user));
  });

  app.post<{ Body: unknown }>("/attendance/discipline", { ...mutation, schema: routeSchema("Record a discipline incident") }, async (request, reply) => {
    const user = requireApiPermission(request, "safety:create");
    const input = parseApiBody(disciplineIncidentSchema, request.body);
    const row = await createDisciplineIncident(user, input);
    await auditCommand(user, { action: "create", module: "safety", entityType: "discipline_incident", entityId: row.id, campusId: row.campusId, after: { status: row.status } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.patch<{ Params: IdParams; Body: unknown }>("/attendance/discipline/:id", { ...mutation, schema: routeSchema("Update a discipline incident") }, async (request) => {
    const user = requireApiPermission(request, "safety:update");
    const input = parseApiBody(disciplineDecisionSchema, { ...(request.body as Record<string, unknown>), incidentId: request.params.id });
    const row = await updateDisciplineStatus(user, input.incidentId, input.status);
    await auditCommand(user, { action: "update", module: "safety", entityType: "discipline_incident", entityId: row.id, campusId: row.campusId, after: { status: row.status } });
    return apiSuccess(request, { id: row.id });
  });

  app.get("/attendance/staff", authenticated, async (request) => {
    const user = requireApiPermission(request, "attendance:read");
    return apiSuccess(request, await listStaffAttendance(user));
  });

  app.get("/attendance/staff/options", authenticated, async (request) => {
    const user = requireApiPermission(request, "attendance:read");
    return apiSuccess(request, await listEmployeeOptions(user));
  });

  app.get("/attendance/overview", authenticated, async (request) => {
    const user = requireApiPermission(request, "attendance:read");
    return apiSuccess(request, await getAttendanceOverview(user));
  });

  app.get<{ Querystring: { page?: number; pageSize?: number; date?: string } }>("/attendance/students", authenticated, async (request) => {
    const user = requireApiPermission(request, "attendance:read");
    return apiSuccess(request, await listAttendancePage(user, { ...pageQuery(request.query), date: queryString(request.query.date) }));
  });

  app.get<{ Querystring: { search?: string } }>("/attendance/students/options", authenticated, async (request) => {
    const user = requireApiPermission(request, "attendance:read");
    return apiSuccess(request, await getAttendanceStudentOptions(user, queryString(request.query.search)));
  });

  app.get("/attendance/corrections", authenticated, async (request) => {
    const user = requireApiPermission(request, "attendance:read");
    return apiSuccess(request, await listAttendanceCorrections(user));
  });

  app.get<{ Querystring: { threshold?: number } }>("/attendance/low", authenticated, async (request) => {
    const user = requireApiPermission(request, "attendance:read");
    const rawThreshold = request.query.threshold ?? 75;
    const threshold = Number.isFinite(rawThreshold) ? Math.min(100, Math.max(0, rawThreshold)) : 75;
    return apiSuccess(request, await listLowAttendance(user, threshold));
  });

  app.post<{ Body: unknown }>("/attendance/staff", { ...mutation, schema: routeSchema("Record staff attendance") }, async (request, reply) => {
    const user = requireApiPermission(request, "attendance:mark");
    const input = parseApiBody(staffAttendanceSchema, request.body);
    const row = await recordStaffAttendance(user, input);
    await auditCommand(user, { action: "create", module: "attendance", entityType: "staff_attendance", entityId: row.id, campusId: row.campusId, after: { employeeId: input.employeeId, state: input.state, attendanceDate: input.attendanceDate } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.get("/health/students", authenticated, async (request) => {
    const user = requireApiPermission(request, "health:read");
    return apiSuccess(request, await listHealthStudents(user));
  });

  app.get("/health/profiles", authenticated, async (request) => {
    const user = requireApiPermission(request, "health:read");
    return apiSuccess(request, await listHealthProfiles(user));
  });

  app.put<{ Params: StudentParams; Body: unknown }>("/health/students/:studentId/profile", { ...mutation, schema: routeSchema("Save a student health profile") }, async (request) => {
    const user = requireApiPermission(request, "health:update");
    const input = parseApiBody(healthProfileSchema, { ...(request.body as Record<string, unknown>), studentId: request.params.studentId });
    const row = await upsertHealthProfile(user, input);
    await auditCommand(user, { action: "update", module: "health", entityType: "health_profile", entityId: row.id, campusId: row.campusId, metadata: { studentId: row.studentId } });
    return apiSuccess(request, { id: row.id });
  });

  app.get("/health/clinic-visits", authenticated, async (request) => {
    const user = requireApiPermission(request, "health:read");
    return apiSuccess(request, await listClinicVisits(user));
  });

  app.post<{ Body: unknown }>("/health/clinic-visits", { ...mutation, schema: routeSchema("Record a clinic visit") }, async (request, reply) => {
    const user = requireApiPermission(request, "health:update");
    const input = parseApiBody(clinicVisitSchema, request.body);
    const row = await createClinicVisit(user, input);
    await auditCommand(user, { action: "create", module: "health", entityType: "clinic_visit", entityId: row.id, campusId: row.campusId, metadata: { studentId: row.studentId } });
    return apiCreated(reply, request, { id: row.id });
  });
};
