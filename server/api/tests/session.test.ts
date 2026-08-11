import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "../../../lib/auth/types";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  verifySessionCookie: vi.fn(),
  createSessionCookie: vi.fn(),
  getFirebaseAdminAuth: vi.fn(),
  getUserByFirebaseUid: vi.fn(),
  getPlatformAdminByFirebaseUid: vi.fn(),
  getDb: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock("../../../lib/auth/firebase-admin-core", () => ({ getFirebaseAdminAuth: mocks.getFirebaseAdminAuth }));
vi.mock("../../../lib/auth/user-context", () => ({ getUserByFirebaseUid: mocks.getUserByFirebaseUid }));
vi.mock("../../../lib/auth/platform-context", () => ({ getPlatformAdminByFirebaseUid: mocks.getPlatformAdminByFirebaseUid }));
vi.mock("../../../db/client", () => ({ getDb: mocks.getDb }));
vi.mock("../../../lib/audit/audit-log", () => ({ writeAuditLog: mocks.writeAuditLog }));

import { buildApi } from "../app";

const user: CurrentUser = {
  id: "user-1",
  firebaseUid: "firebase-1",
  email: "admin@example.com",
  displayName: "School Admin",
  role: "super_admin",
  organizationId: "org-1",
  organizationName: "School One",
  campusId: "campus-1",
  campusName: "Main Campus",
  campusIds: ["campus-1"],
  availableCampuses: [{ id: "campus-1", name: "Main Campus" }, { id: "campus-2", name: "Second Campus" }],
  emailVerified: true,
  permissions: ["campuses:read", "campuses:update"],
};

function mutationChain() {
  return { set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) };
}

describe("API-owned browser session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const transaction = {
      update: vi.fn(() => mutationChain()),
      insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    };
    mocks.getDb.mockReturnValue({
      transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
      query: { sessionLogs: { findFirst: vi.fn().mockResolvedValue({ id: "session-log-1" }) } },
      update: vi.fn(() => mutationChain()),
    });
    mocks.getFirebaseAdminAuth.mockReturnValue({
      verifyIdToken: mocks.verifyIdToken,
      createSessionCookie: mocks.createSessionCookie,
      verifySessionCookie: mocks.verifySessionCookie,
    });
    mocks.verifyIdToken.mockResolvedValue({ uid: "firebase-1", email_verified: true });
    mocks.verifySessionCookie.mockResolvedValue({ uid: "firebase-1" });
    mocks.createSessionCookie.mockResolvedValue("firebase-session-cookie");
    mocks.getUserByFirebaseUid.mockResolvedValue(user);
    mocks.getPlatformAdminByFirebaseUid.mockResolvedValue(null);
  });

  it("exchanges Firebase identity for an API session and readable CSRF cookie", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/session",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      payload: { idToken: "firebase-id-token-that-is-long-enough" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.headers["set-cookie"]).toEqual(expect.arrayContaining([
      expect.stringContaining("school_erp_session=firebase-session-cookie"),
      expect.stringContaining("school_erp_csrf="),
    ]));
    expect(response.json()).toMatchObject({ data: { redirectTo: "/dashboard" } });
    expect(mocks.createSessionCookie).toHaveBeenCalledWith("firebase-id-token-that-is-long-enough", expect.any(Object));
    await app.close();
  });

  it("requires CSRF for cookie-authenticated mutations", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/session",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      payload: { idToken: "firebase-id-token-that-is-long-enough" },
    });
    const setCookie = login.headers["set-cookie"] as string[];
    const session = setCookie.find((value) => value.startsWith("school_erp_session="))?.split(";", 1)[0];
    const csrf = setCookie.find((value) => value.startsWith("school_erp_csrf="))?.split(";", 1)[0];
    const cookie = [session, csrf].filter(Boolean).join("; ");

    const denied = await app.inject({
      method: "POST",
      url: "/api/v1/auth/campus",
      headers: { cookie, "content-type": "application/json", origin: "http://localhost:3000" },
      payload: { campusId: "campus-2" },
    });
    expect(denied.statusCode).toBe(403);

    const allowed = await app.inject({
      method: "POST",
      url: "/api/v1/auth/campus",
      headers: { cookie, "x-csrf-token": csrf?.split("=", 2)[1], "content-type": "application/json", origin: "http://localhost:3000" },
      payload: { campusId: "campus-2" },
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json()).toMatchObject({ data: { campus: { id: "campus-2" } } });
    await app.close();
  });
});
