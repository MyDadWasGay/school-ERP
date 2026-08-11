import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "../../../lib/auth/types";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  getFirebaseAdminAuth: vi.fn(),
  getUserByFirebaseUid: vi.fn(),
  collectPayment: vi.fn(),
  refundPayment: vi.fn(),
  createRazorpayOrder: vi.fn(),
  verifyRazorpayPayment: vi.fn(),
  createDocumentUploadSignature: vi.fn(),
  saveDocumentMetadata: vi.fn(),
  listStudentDocuments: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock("../../../lib/auth/firebase-admin-core", () => ({
  getFirebaseAdminAuth: mocks.getFirebaseAdminAuth,
}));
vi.mock("../../../lib/auth/user-context", () => ({
  getUserByFirebaseUid: mocks.getUserByFirebaseUid,
}));
vi.mock("../../../features/finance/services/payment.service", () => ({
  collectPayment: mocks.collectPayment,
}));
vi.mock("../../../features/finance/services/refund.service", () => ({
  refundPayment: mocks.refundPayment,
}));
vi.mock(
  "../../../features/finance/services/razorpay-payment.service",
  async () => {
    const actual = await vi.importActual<
      typeof import("../../../features/finance/services/razorpay-payment.service")
    >("../../../features/finance/services/razorpay-payment.service");
    return {
      ...actual,
      createRazorpayOrder: mocks.createRazorpayOrder,
      verifyRazorpayPayment: mocks.verifyRazorpayPayment,
    };
  },
);
vi.mock("../../../features/documents/services/document.service", async () => {
  const actual = await vi.importActual<
    typeof import("../../../features/documents/services/document.service")
  >("../../../features/documents/services/document.service");
  return {
    ...actual,
    createDocumentUploadSignature: mocks.createDocumentUploadSignature,
    saveDocumentMetadata: mocks.saveDocumentMetadata,
    listStudentDocuments: mocks.listStudentDocuments,
  };
});
vi.mock("../../../lib/audit/audit-log", () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

import { buildApi } from "../app";

const user: CurrentUser = {
  id: "user-1",
  firebaseUid: "firebase-1",
  email: "accountant@example.com",
  displayName: "Accountant",
  role: "accountant",
  organizationId: "org-1",
  campusId: "campus-1",
  campusIds: ["campus-1"],
  emailVerified: true,
  permissions: [
    "fees:collect",
    "fees:pay_online",
    "fees:refund",
    "documents:create",
    "documents:read",
  ],
};

describe("shared payment and document API", () => {
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
    mocks.collectPayment.mockResolvedValue({
      id: "payment-1",
      campusId: "campus-1",
      invoiceId: "invoice-1",
      studentId: "student-1",
      receiptNumber: "RCPT-1",
      amountMinor: 12500,
      method: "cash",
      providerReference: null,
      paidAt: new Date("2026-08-09T10:00:00.000Z"),
      status: "posted",
    });
    mocks.createRazorpayOrder.mockResolvedValue({
      paymentRequestId: "provider-order-1",
      keyId: "rzp_test_school",
      orderId: "order_school123",
      amountMinor: 12500,
      currency: "INR",
      name: "School One",
      description: "Fee payment",
      prefill: { name: "Student One" },
      status: "created",
    });
    mocks.verifyRazorpayPayment.mockResolvedValue({
      order: { id: "provider-order-1", status: "posted" },
      payment: {
        id: "payment-online-1",
        campusId: "campus-1",
        invoiceId: "invoice-1",
        studentId: "student-1",
        receiptNumber: "RCPT-ONLINE-1",
        amountMinor: 12500,
        method: "online",
        providerReference: "pay_school123",
        paidAt: new Date("2026-08-09T10:00:00.000Z"),
        status: "posted",
      },
    });
    mocks.refundPayment.mockResolvedValue({
      refund: {
        id: "refund-1",
        campusId: "campus-1",
        paymentId: "payment-online-1",
        amountMinor: 2500,
        provider: "razorpay",
        providerRefundId: "rfnd_school123",
        providerStatus: "pending",
        status: "pending",
      },
    });
    mocks.createDocumentUploadSignature.mockResolvedValue({
      timestamp: 123,
      folder: "school-erp/org-1/student/student-1",
      type: "authenticated",
      allowed_formats: "pdf,doc,docx,xls,xlsx,csv",
      signature: "signature",
      apiKey: "api-key",
      cloudName: "school-cloud",
    });
    mocks.saveDocumentMetadata.mockResolvedValue({
      id: "document-1",
      organizationId: "org-1",
      campusId: "campus-1",
      entityType: "student",
      entityId: "student-1",
      category: "identity",
      status: "active",
    });
    mocks.listStudentDocuments.mockResolvedValue([
      {
        id: "document-1",
        category: "identity",
        secureUrl: "https://res.cloudinary.com/demo/image/upload/doc.pdf",
        resourceType: "raw",
        format: "pdf",
        bytes: 1000,
        originalFilename: "identity.pdf",
        accessPolicy: "private",
        createdAt: new Date("2026-08-09T10:00:00.000Z"),
        status: "active",
      },
    ]);
  });

  it("records an idempotent staff-authorized payment", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/payments",
      headers: {
        authorization: "Bearer token",
        "content-type": "application/json",
      },
      payload: {
        invoiceId: "invoice-1",
        studentId: "student-1",
        amountMinor: 12500,
        method: "cash",
        idempotencyKey: "request-12345",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      data: { id: "payment-1", receiptNumber: "RCPT-1", amountMinor: 12500 },
    });
    expect(mocks.collectPayment).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ idempotencyKey: "request-12345" }),
    );
    expect(mocks.writeAuditLog).toHaveBeenCalledOnce();
    await app.close();
  });

  it("rejects payment requests without an idempotency key", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/payments",
      headers: {
        authorization: "Bearer token",
        "content-type": "application/json",
      },
      payload: {
        invoiceId: "invoice-1",
        studentId: "student-1",
        amountMinor: 12500,
        method: "cash",
      },
    });

    expect(response.statusCode).toBe(422);
    expect(mocks.collectPayment).not.toHaveBeenCalled();
    await app.close();
  });

  it("creates and verifies a scoped Razorpay checkout payment", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const headers = {
      authorization: "Bearer token",
      "content-type": "application/json",
    };
    const order = await app.inject({
      method: "POST",
      url: "/api/v1/payments/razorpay/orders",
      headers,
      payload: {
        invoiceId: "invoice-1",
        studentId: "student-1",
        amountMinor: 12500,
        idempotencyKey: "razorpay-request-1",
      },
    });
    const verified = await app.inject({
      method: "POST",
      url: "/api/v1/payments/razorpay/verify",
      headers,
      payload: {
        razorpayOrderId: "order_school123",
        razorpayPaymentId: "pay_school123",
        razorpaySignature: "a".repeat(64),
      },
    });

    expect(order.statusCode).toBe(201);
    expect(order.json()).toMatchObject({
      data: { orderId: "order_school123", amountMinor: 12500 },
    });
    expect(verified.statusCode).toBe(200);
    expect(verified.json()).toMatchObject({
      data: {
        id: "payment-online-1",
        providerReference: "pay_school123",
      },
    });
    expect(mocks.createRazorpayOrder).toHaveBeenCalledOnce();
    expect(mocks.verifyRazorpayPayment).toHaveBeenCalledOnce();
    expect(mocks.writeAuditLog).toHaveBeenCalledTimes(2);
    await app.close();
  });

  it("creates an idempotent provider-backed refund", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/payments/refunds",
      headers: {
        authorization: "Bearer token",
        "content-type": "application/json",
      },
      payload: {
        paymentId: "payment-online-1",
        amountMinor: 2500,
        reason: "Approved correction",
        idempotencyKey: "refund-request-1",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      data: {
        id: "refund-1",
        provider: "razorpay",
        providerStatus: "pending",
        status: "pending",
      },
    });
    expect(mocks.refundPayment).toHaveBeenCalledOnce();
    expect(mocks.writeAuditLog).toHaveBeenCalledOnce();
    await app.close();
  });

  it("shares the scoped upload and document metadata workflow", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const headers = {
      authorization: "Bearer token",
      "content-type": "application/json",
    };
    const signature = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/signature",
      headers,
      payload: {
        entityType: "student",
        entityId: "student-1",
        resourceType: "raw",
        format: "pdf",
        bytes: 1000,
      },
    });
    const saved = await app.inject({
      method: "POST",
      url: "/api/v1/documents",
      headers,
      payload: {
        entityType: "student",
        entityId: "student-1",
        category: "identity",
        publicId: "school-erp/org-1/student/student-1/document-1",
        secureUrl: "https://res.cloudinary.com/demo/raw/upload/document-1.pdf",
        resourceType: "raw",
        format: "pdf",
        bytes: 1000,
      },
    });
    const listed = await app.inject({
      method: "GET",
      url: "/api/v1/students/student-1/documents",
      headers: { authorization: "Bearer token" },
    });

    expect([signature.statusCode, saved.statusCode, listed.statusCode]).toEqual(
      [200, 201, 200],
    );
    expect(signature.json()).toMatchObject({ data: { type: "authenticated" } });
    expect(saved.json()).toMatchObject({ data: { id: "document-1" } });
    expect(listed.json()).toMatchObject({
      data: { studentId: "student-1", documents: [{ id: "document-1" }] },
    });
    expect(mocks.saveDocumentMetadata).toHaveBeenCalledOnce();
    expect(mocks.writeAuditLog).toHaveBeenCalledOnce();
    await app.close();
  });
});
