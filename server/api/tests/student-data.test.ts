import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "../../../lib/auth/types";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  getFirebaseAdminAuth: vi.fn(),
  getUserByFirebaseUid: vi.fn(),
  getPortalSnapshot: vi.fn(),
  getStudentProfile: vi.fn(),
  listStudentAttendance: vi.fn(),
  listStudentInvoices: vi.fn(),
  listStudentPublishedResults: vi.fn(),
  listNotificationsPage: vi.fn(),
  createLeaveRequest: vi.fn(),
  markNotificationRead: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock("../../../lib/auth/firebase-admin-core", () => ({
  getFirebaseAdminAuth: mocks.getFirebaseAdminAuth,
}));
vi.mock("../../../lib/auth/user-context", () => ({
  getUserByFirebaseUid: mocks.getUserByFirebaseUid,
}));
vi.mock("../../../features/portals/services/portal.service", () => ({
  getPortalSnapshot: mocks.getPortalSnapshot,
}));
vi.mock("../../../features/students/services/students.service", () => ({
  getStudentProfile: mocks.getStudentProfile,
}));
vi.mock(
  "../../../features/attendance/services/attendance-workspace.service",
  () => ({ listStudentAttendance: mocks.listStudentAttendance }),
);
vi.mock("../../../features/attendance/services/leave.service", () => ({
  createLeaveRequest: mocks.createLeaveRequest,
}));
vi.mock("../../../features/finance/services/finance-workspace.service", () => ({
  listStudentInvoices: mocks.listStudentInvoices,
}));
vi.mock("../../../features/exams/services/exam-workspace.service", () => ({
  listStudentPublishedResults: mocks.listStudentPublishedResults,
}));
vi.mock(
  "../../../features/communication/services/communication.service",
  () => ({
    listNotificationsPage: mocks.listNotificationsPage,
    markNotificationRead: mocks.markNotificationRead,
  }),
);
vi.mock("../../../lib/audit/audit-log", () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

import { buildApi } from "../app";

const permissions = [
  "students:read",
  "attendance:read",
  "attendance:request_leave",
  "fees:read",
  "exams:read",
  "communication:read",
];

const user: CurrentUser = {
  id: "user-1",
  firebaseUid: "firebase-1",
  email: "parent@example.com",
  displayName: "Parent User",
  role: "parent",
  organizationId: "org-1",
  campusId: "campus-1",
  campusIds: ["campus-1"],
  linkedGuardianId: "guardian-1",
  emailVerified: true,
  permissions,
};

const pageResult = {
  rows: [],
  pageInfo: { page: 1, pageSize: 20, total: 0, pageCount: 0 },
};

describe("shared student data API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFirebaseAdminAuth.mockReturnValue({
      verifyIdToken: mocks.verifyIdToken,
    });
    mocks.verifyIdToken.mockResolvedValue({
      uid: "firebase-1",
      email_verified: true,
    });
    mocks.getUserByFirebaseUid.mockResolvedValue(user);
    mocks.getStudentProfile.mockResolvedValue({
      student: {
        id: "student-1",
        organizationId: "org-1",
        campusId: "campus-1",
        admissionNumber: "ADM-1",
        firstName: "Asha",
        lastName: "Rao",
        dateOfBirth: new Date("2012-04-05T00:00:00.000Z"),
        gender: "female",
        email: null,
        phone: null,
        photoUrl: null,
        bloodGroup: "O+",
        joinedOn: new Date("2025-06-01T00:00:00.000Z"),
        status: "active",
      },
      campusName: "Main Campus",
      guardians: [
        {
          id: "guardian-1",
          firstName: "Nina",
          lastName: "Rao",
          relationship: "mother",
          isPrimary: true,
          phone: "0000000000",
        },
      ],
      enrollments: [
        {
          id: "enrollment-1",
          academicYearId: "year-1",
          classId: "class-1",
          sectionId: "section-1",
          className: "Class 5",
          sectionName: "A",
          rollNumber: "10",
          startsOn: new Date("2025-06-01T00:00:00.000Z"),
          endsOn: null,
          status: "active",
        },
      ],
      timeline: [
        {
          id: "event-1",
          eventType: "student_created",
          title: "Student record created",
          occurredAt: new Date("2025-06-01T00:00:00.000Z"),
          status: "active",
        },
      ],
      certificates: [],
    });
    mocks.listStudentAttendance.mockResolvedValue(pageResult);
    mocks.listStudentInvoices.mockResolvedValue(pageResult);
    mocks.listStudentPublishedResults.mockResolvedValue(pageResult);
    mocks.listNotificationsPage.mockResolvedValue(pageResult);
    mocks.createLeaveRequest.mockResolvedValue({
      id: "leave-1",
      campusId: "campus-1",
      requesterType: "student",
      requesterId: "student-1",
      startsOn: new Date("2026-08-10T00:00:00.000Z"),
      endsOn: new Date("2026-08-11T00:00:00.000Z"),
      reason: "Family event",
      status: "pending",
    });
    mocks.markNotificationRead.mockResolvedValue({
      id: "notification-1",
      campusId: "campus-1",
      readAt: new Date("2026-08-09T10:00:00.000Z"),
      status: "read",
    });
  });

  it("returns only the public student profile contract", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/students/student-1",
      headers: { authorization: "Bearer token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        student: {
          id: "student-1",
          admissionNumber: "ADM-1",
          campusName: "Main Campus",
        },
        guardians: [{ id: "guardian-1", isPrimary: true }],
        enrollments: [{ className: "Class 5", sectionName: "A" }],
      },
    });
    expect(response.json().data.student).not.toHaveProperty("organizationId");
    expect(mocks.getStudentProfile).toHaveBeenCalledWith(user, "student-1");
    await app.close();
  });

  it("passes bounded pagination to each authorized student read service", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const headers = { authorization: "Bearer token" };

    const attendance = await app.inject({
      method: "GET",
      url: "/api/v1/students/student-1/attendance?page=2&pageSize=5",
      headers,
    });
    const invoices = await app.inject({
      method: "GET",
      url: "/api/v1/students/student-1/invoices",
      headers,
    });
    const results = await app.inject({
      method: "GET",
      url: "/api/v1/students/student-1/results",
      headers,
    });
    const notifications = await app.inject({
      method: "GET",
      url: "/api/v1/notifications",
      headers,
    });

    expect([
      attendance.statusCode,
      invoices.statusCode,
      results.statusCode,
      notifications.statusCode,
    ]).toEqual([200, 200, 200, 200]);
    expect(mocks.listStudentAttendance).toHaveBeenCalledWith(
      user,
      "student-1",
      { page: 2, pageSize: 5 },
    );
    expect(mocks.listStudentInvoices).toHaveBeenCalledWith(user, "student-1", {
      page: 1,
      pageSize: 20,
    });
    expect(mocks.listStudentPublishedResults).toHaveBeenCalledWith(
      user,
      "student-1",
      { page: 1, pageSize: 20 },
    );
    expect(mocks.listNotificationsPage).toHaveBeenCalledWith(user, {
      page: 1,
      pageSize: 20,
    });
    await app.close();
  });

  it("rejects missing permissions and invalid pagination before data access", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    mocks.getUserByFirebaseUid.mockResolvedValueOnce({
      ...user,
      permissions: [],
    });
    const forbidden = await app.inject({
      method: "GET",
      url: "/api/v1/students/student-1/attendance",
      headers: { authorization: "Bearer token" },
    });
    const invalid = await app.inject({
      method: "GET",
      url: "/api/v1/students/student-1/invoices?pageSize=101",
      headers: { authorization: "Bearer token" },
    });

    expect(forbidden.statusCode).toBe(403);
    expect(invalid.statusCode).toBe(422);
    expect(mocks.listStudentAttendance).not.toHaveBeenCalled();
    expect(mocks.listStudentInvoices).not.toHaveBeenCalled();
    await app.close();
  });

  it("submits scoped leave and marks only the recipient notification read", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const headers = {
      authorization: "Bearer token",
      "content-type": "application/json",
    };
    const leave = await app.inject({
      method: "POST",
      url: "/api/v1/leave-requests",
      headers,
      payload: {
        studentId: "student-1",
        startsOn: "2026-08-10",
        endsOn: "2026-08-11",
        reason: "Family event",
      },
    });
    const notification = await app.inject({
      method: "PATCH",
      url: "/api/v1/notifications/notification-1/read",
      headers: { authorization: "Bearer token" },
    });

    expect(leave.statusCode).toBe(201);
    expect(leave.json()).toMatchObject({
      data: { id: "leave-1", requesterId: "student-1", status: "pending" },
    });
    expect(notification.statusCode, notification.body).toBe(200);
    expect(notification.json()).toMatchObject({
      data: { id: "notification-1", status: "read" },
    });
    expect(mocks.createLeaveRequest).toHaveBeenCalledWith(
      user,
      expect.objectContaining({
        studentId: "student-1",
        startsOn: expect.any(Date),
        endsOn: expect.any(Date),
      }),
    );
    expect(mocks.markNotificationRead).toHaveBeenCalledWith(
      user,
      "notification-1",
    );
    expect(mocks.writeAuditLog).toHaveBeenCalledTimes(2);
    await app.close();
  });

  it("rejects reversed leave dates before the service mutation", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/leave-requests",
      headers: {
        authorization: "Bearer token",
        "content-type": "application/json",
      },
      payload: {
        studentId: "student-1",
        startsOn: "2026-08-12",
        endsOn: "2026-08-10",
        reason: "Family event",
      },
    });

    expect(response.statusCode).toBe(422);
    expect(mocks.createLeaveRequest).not.toHaveBeenCalled();
    await app.close();
  });
});
