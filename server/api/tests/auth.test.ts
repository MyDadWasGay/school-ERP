import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "../../../lib/auth/types";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  revokeRefreshTokens: vi.fn(),
  getFirebaseAdminAuth: vi.fn(),
  getUserByFirebaseUid: vi.fn(),
  getPortalSnapshot: vi.fn(),
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
vi.mock(
  "../../../features/attendance/services/attendance-workspace.service",
  () => ({ listStudentAttendance: vi.fn() }),
);
vi.mock("../../../features/attendance/services/leave.service", () => ({
  createLeaveRequest: vi.fn(),
}));
vi.mock(
  "../../../features/communication/services/communication.service",
  () => ({
    listNotificationsPage: vi.fn(),
    markNotificationRead: vi.fn(),
  }),
);
vi.mock("../../../features/exams/services/exam-workspace.service", () => ({
  listStudentPublishedResults: vi.fn(),
}));
vi.mock("../../../features/finance/services/finance-workspace.service", () => ({
  listStudentInvoices: vi.fn(),
}));
vi.mock("../../../features/students/services/students.service", () => ({
  getStudentProfile: vi.fn(),
}));
vi.mock("../../../lib/audit/audit-log", () => ({ writeAuditLog: vi.fn() }));

import { buildApi } from "../app";

const user: CurrentUser = {
  id: "user-1",
  firebaseUid: "firebase-1",
  email: "user@example.com",
  displayName: "API User",
  role: "parent",
  organizationId: "org-1",
  organizationName: "School One",
  campusId: "campus-1",
  campusName: "Main Campus",
  campusIds: ["campus-1"],
  availableCampuses: [{ id: "campus-1", name: "Main Campus" }],
  linkedGuardianId: "guardian-1",
  emailVerified: true,
  permissions: ["portals:read"],
};

describe("Firebase Bearer authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFirebaseAdminAuth.mockReturnValue({
      verifyIdToken: mocks.verifyIdToken,
      revokeRefreshTokens: mocks.revokeRefreshTokens,
    });
    mocks.verifyIdToken.mockResolvedValue({
      uid: "firebase-1",
      email_verified: true,
    });
    mocks.getUserByFirebaseUid.mockResolvedValue(user);
    mocks.getPortalSnapshot.mockResolvedValue({
      metrics: [],
      students: [],
      recent: [],
      offlineNote: "Retry interrupted requests.",
    });
  });

  it("returns the server-authoritative user and permission context", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        id: "user-1",
        role: "parent",
        organization: { id: "org-1" },
        campus: { id: "campus-1" },
        permissions: ["portals:read"],
      },
    });
    expect(mocks.getUserByFirebaseUid).toHaveBeenCalledWith(
      "firebase-1",
      undefined,
    );
    await app.close();
  });

  it("revokes Firebase refresh tokens for mobile logout", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/revoke",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ data: { ok: true } });
    expect(mocks.revokeRefreshTokens).toHaveBeenCalledWith("firebase-1");
    await app.close();
  });

  it("rejects the removed transitional web credential scheme", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: "WebBearer invalid-token" },
    });

    expect(response.statusCode).toBe(401);
    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
    expect(mocks.getUserByFirebaseUid).not.toHaveBeenCalled();
    await app.close();
  });

  it("exposes the API-owned session exchange under the versioned boundary", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/session",
      payload: {},
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    await app.close();
  });

  it("returns non-ready when Firebase Admin is not configured", async () => {
    mocks.getFirebaseAdminAuth.mockReturnValue(null);
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: "Bearer token" },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      error: { code: "CONFIGURATION_ERROR" },
    });
    await app.close();
  });

  it("rejects expired or revoked Firebase credentials", async () => {
    mocks.verifyIdToken.mockRejectedValue(new Error("expired"));
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: "Bearer expired-token" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
    await app.close();
  });

  it("rejects unverified and inactive local users", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    mocks.verifyIdToken.mockResolvedValueOnce({
      uid: "firebase-1",
      email_verified: false,
    });
    const unverified = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: "Bearer token-1" },
    });
    mocks.getUserByFirebaseUid.mockResolvedValueOnce(null);
    const inactive = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: "Bearer token-2" },
    });

    expect(unverified.statusCode).toBe(403);
    expect(inactive.statusCode).toBe(403);
    await app.close();
  });

  it("accepts only a campus resolved as available by the server", async () => {
    mocks.getUserByFirebaseUid.mockResolvedValueOnce({
      ...user,
      campusId: "campus-1",
    });
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: "Bearer token", "x-campus-id": "campus-2" },
    });

    expect(response.statusCode).toBe(403);
    expect(mocks.getUserByFirebaseUid).toHaveBeenCalledWith(
      "firebase-1",
      "campus-2",
    );
    await app.close();
  });

  it("returns only the campuses resolved for the authenticated user", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/me/campuses",
      headers: { authorization: "Bearer token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        activeCampusId: "campus-1",
        campuses: [{ id: "campus-1", name: "Main Campus" }],
      },
    });
    await app.close();
  });

  it("enforces portal permission and direct-role selection", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const allowed = await app.inject({
      method: "GET",
      url: "/api/v1/portal/summary",
      headers: { authorization: "Bearer token" },
    });
    const crossRole = await app.inject({
      method: "GET",
      url: "/api/v1/portal/summary?portal=teacher",
      headers: { authorization: "Bearer token" },
    });
    mocks.getUserByFirebaseUid.mockResolvedValueOnce({
      ...user,
      permissions: [],
    });
    const denied = await app.inject({
      method: "GET",
      url: "/api/v1/portal/summary",
      headers: { authorization: "Bearer token" },
    });

    expect(allowed.statusCode).toBe(200);
    expect(allowed.json()).toMatchObject({
      data: { portal: "parent", metrics: [] },
    });
    expect(crossRole.statusCode).toBe(403);
    expect(denied.statusCode).toBe(403);
    expect(mocks.getPortalSnapshot).toHaveBeenCalledTimes(1);
    await app.close();
  });
});
