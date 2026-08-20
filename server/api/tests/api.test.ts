import { describe, expect, it } from "vitest";
import { buildApi } from "../app";

describe("Fastify shared web and Flutter API foundation", () => {
  it("serves the Render liveness probe without database credentials", async () => {
    const app = await buildApi({ logger: false });
    const response = await app.inject({ method: "GET", url: "/health/live" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: { status: "ok", service: "school-erp-api" },
    });
    expect(response.headers["x-request-id"]).toBeDefined();
    await app.close();
  });

  it("fails readiness closed when database configuration is missing", async () => {
    const previousUrl = process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_DATABASE_URL;
    const app = await buildApi({ logger: false });
    const response = await app.inject({ method: "GET", url: "/health/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: { code: "NOT_READY" } });
    await app.close();
    if (previousUrl === undefined) delete process.env.TURSO_DATABASE_URL;
    else process.env.TURSO_DATABASE_URL = previousUrl;
  });

  it("rejects the shared identity endpoint without a Bearer token", async () => {
    const app = await buildApi({ logger: false });
    const response = await app.inject({ method: "GET", url: "/api/v1/me" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
    await app.close();
  });

  it("exposes the versioned API capability contract", async () => {
    const app = await buildApi({ logger: false });
    const response = await app.inject({ method: "GET", url: "/api/v1" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        version: "v1",
        capabilities: expect.arrayContaining([
          "auth.me",
          "auth.campuses",
          "portal.summary",
          "students.profile",
          "attendance.student",
          "attendance.bulk_mark",
          "attendance.leave_request",
          "finance.student_invoices",
          "finance.collect_payment",
          "finance.fee_aging",
          "finance.razorpay_checkout",
          "finance.razorpay_refunds",
          "exams.student_results",
          "exams.student_admit_cards",
          "communication.notifications",
          "communication.notification_read",
          "documents.student",
          "documents.upload_signature",
          "documents.save_metadata",
          "academics.records",
          "academics.syllabus_progress",
          "transport.boarding_checklist",
          "transport.live_location",
        ]),
      },
    });
    await app.close();
  });

  it("publishes an OpenAPI contract for every released endpoint", async () => {
    const app = await buildApi({ logger: false });
    const response = await app.inject({
      method: "GET",
      url: "/documentation/json",
    });
    const contract = response.json();

    expect(response.statusCode).toBe(200);
    expect(contract.openapi).toBe("3.0.3");
    expect(contract.paths).toHaveProperty("/api/v1/me");
    expect(contract.paths).toHaveProperty("/api/v1/me/campuses");
    expect(contract.paths).toHaveProperty("/api/v1/portal/summary");
    expect(contract.paths).toHaveProperty("/api/v1/students/{studentId}");
    expect(contract.paths).toHaveProperty("/api/v1/students/options");
    expect(contract.paths).toHaveProperty("/api/v1/students/{studentId}/medical");
    expect(contract.paths).toHaveProperty(
      "/api/v1/students/{studentId}/attendance",
    );
    expect(contract.paths).toHaveProperty(
      "/api/v1/students/{studentId}/discipline",
    );
    expect(contract.paths).toHaveProperty(
      "/api/v1/students/{studentId}/invoices",
    );
    expect(contract.paths).toHaveProperty(
      "/api/v1/students/{studentId}/results",
    );
    expect(contract.paths).toHaveProperty(
      "/api/v1/students/{studentId}/admit-cards",
    );
    expect(contract.paths).toHaveProperty("/api/v1/notifications");
    expect(contract.paths).toHaveProperty("/api/v1/communication/notifications");
    expect(contract.paths).toHaveProperty("/api/v1/communication/notification-delivery");
    expect(contract.paths).toHaveProperty("/api/v1/attendance/students");
    expect(contract.paths).toHaveProperty("/api/v1/attendance/bulk");
    expect(contract.paths).toHaveProperty("/api/v1/attendance/students/options");
    expect(contract.paths).toHaveProperty("/api/v1/attendance/corrections");
    expect(contract.paths).toHaveProperty("/api/v1/admissions/seat-matrix");
    expect(contract.paths).toHaveProperty("/api/v1/imports/students");
    expect(contract.paths).toHaveProperty("/api/v1/leave-requests");
    expect(contract.paths).toHaveProperty(
      "/api/v1/notifications/{notificationId}/read",
    );
    expect(contract.paths).toHaveProperty("/api/v1/payments");
    expect(contract.paths).toHaveProperty("/api/v1/payments/razorpay/orders");
    expect(contract.paths).toHaveProperty("/api/v1/payments/razorpay/verify");
    expect(contract.paths).toHaveProperty("/api/v1/payments/refunds");
    expect(contract.paths).toHaveProperty("/api/v1/uploads/signature");
    expect(contract.paths).toHaveProperty("/api/v1/documents");
    expect(contract.paths).toHaveProperty(
      "/api/v1/students/{studentId}/documents",
    );
    expect(contract.paths).toHaveProperty("/api/v1/academics/{kind}");
    expect(contract.paths).toHaveProperty("/api/v1/academics/syllabus/progress");
    expect(contract.paths).toHaveProperty("/api/v1/academics/lesson-plans/{id}/status");
    expect(contract.paths).toHaveProperty("/api/v1/academics/{kind}/{id}/archive");
    expect(contract.paths).toHaveProperty("/health/ready");
    expect(contract.paths).toHaveProperty("/api/v1/health/live");
    expect(contract.paths).toHaveProperty("/api/v1/health/ready");
    expect(contract.paths).toHaveProperty("/api/v1/auth/session");
    expect(contract.paths).toHaveProperty("/api/v1/catalog/records");
    expect(contract.paths).toHaveProperty("/api/v1/integrations/providers/health");
    expect(contract.paths).toHaveProperty("/api/v1/attendance/webhooks/hardware");
    expect(contract.paths).toHaveProperty("/api/v1/fees/aging");
    expect(contract.paths).toHaveProperty("/api/v1/transport/routes/{routeId}/checklist");
    expect(contract.paths).toHaveProperty("/api/v1/transport/boarding-events");
    expect(contract.paths).toHaveProperty("/api/v1/transport/location");
    expect(contract.paths).toHaveProperty("/api/v1/transport/routes/{routeId}/location");
    expect(contract.paths).toHaveProperty("/api/v1/platform/me");
    expect(contract.components.securitySchemes.firebaseBearer).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
    await app.close();
  });

  it("protects academic records with the shared API authentication boundary", async () => {
    const app = await buildApi({ logger: false });
    const response = await app.inject({ method: "GET", url: "/api/v1/academics/curriculum" });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: "UNAUTHENTICATED" } });
    await app.close();
  });

  it("accepts bounded request IDs and replaces unsafe values", async () => {
    const app = await buildApi({ logger: false });
    const accepted = await app.inject({
      method: "GET",
      url: "/api/v1",
      headers: { "x-request-id": "mobile-request-123" },
    });
    const replaced = await app.inject({
      method: "GET",
      url: "/api/v1",
      headers: { "x-request-id": "bad id with spaces" },
    });

    expect(accepted.headers["x-request-id"]).toBe("mobile-request-123");
    expect(replaced.headers["x-request-id"]).not.toBe("bad id with spaces");
    expect(replaced.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    await app.close();
  });
});
