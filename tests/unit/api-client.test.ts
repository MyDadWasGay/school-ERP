import { describe, expect, it, vi } from "vitest";
import { SchoolErpApiClient, SchoolErpApiError } from "@/lib/api-client/client";

describe("shared School ERP API client", () => {
  it("binds the browser fetch receiver when no adapter is supplied", async () => {
    const fetchMock = vi.fn(function (this: typeof globalThis) {
      if (this !== globalThis) throw new Error("fetch receiver was lost");
      return Promise.resolve(new Response(JSON.stringify({ data: { id: "user-1" }, meta: { requestId: "request-default-fetch" } }), { status: 200, headers: { "content-type": "application/json" } }));
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const client = new SchoolErpApiClient({
        baseUrl: "https://api.example.com",
        getFirebaseIdToken: async () => "firebase-token",
      });
      await expect(client.getMe()).resolves.toMatchObject({ id: "user-1" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("sends only Firebase and selected-campus authority headers", async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              activeCampusId: "campus-1",
              campuses: [{ id: "campus-1", name: "Main" }],
            },
            meta: { requestId: "request-1" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    const client = new SchoolErpApiClient({
      baseUrl: "https://api.example.com/",
      getFirebaseIdToken: async () => "firebase-token",
      getCampusId: () => "campus-1",
      fetch: fetchMock,
    });

    await expect(client.getCampuses()).resolves.toMatchObject({
      activeCampusId: "campus-1",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/me/campuses",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer firebase-token",
          "x-campus-id": "campus-1",
        }),
      }),
    );
  });

  it("preserves stable API error details and request IDs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "Not allowed.",
            requestId: "request-2",
          },
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new SchoolErpApiClient({
      baseUrl: "https://api.example.com",
      getFirebaseIdToken: async () => "firebase-token",
      fetch: fetchMock,
    });

    const error = await client
      .getPortalSummary()
      .catch((value: unknown) => value);
    expect(error).toBeInstanceOf(SchoolErpApiError);
    expect(error).toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      requestId: "request-2",
    });
  });

  it("does not make a request without a Firebase token", async () => {
    const fetchMock = vi.fn();
    const client = new SchoolErpApiClient({
      baseUrl: "https://api.example.com",
      getFirebaseIdToken: async () => "",
      fetch: fetchMock,
    });

    await expect(client.getMe()).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the API-owned session cookie and CSRF context for SSR", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { activeCampusId: null, campuses: [] },
          meta: { requestId: "request-web" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new SchoolErpApiClient({
      baseUrl: "https://api.example.com",
      useSessionCookie: true,
      getCookieHeader: () => "school_erp_session=session-value",
      getCsrfToken: () => "csrf-value",
      fetch: fetchMock,
    });

    await client.getCampuses();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/me/campuses",
      expect.objectContaining({
        headers: expect.objectContaining({
          cookie: "school_erp_session=session-value",
          "x-csrf-token": "csrf-value",
        }),
        credentials: "include",
      }),
    );
  });

  it("bounds hung requests and reports a stable timeout error", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn((_: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }));
      const client = new SchoolErpApiClient({
        baseUrl: "https://api.example.com",
        getFirebaseIdToken: async () => "firebase-token",
        fetch: fetchMock,
      });
      const pending = client.call("GET", "/api/v1/me", undefined, { timeoutMs: 25 });
      const rejection = expect(pending).rejects.toMatchObject({
        status: 408,
        code: "REQUEST_TIMEOUT",
      });
      await Promise.resolve();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(25);
      await rejection;
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("notifies the server adapter after mutations but not reads", async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () => new Response(JSON.stringify({ data: { ok: true }, meta: { requestId: "request-mutation" } }), { status: 200 }),
    );
    const onMutation = vi.fn();
    const client = new SchoolErpApiClient({
      baseUrl: "https://api.example.com",
      getFirebaseIdToken: async () => "firebase-token",
      fetch: fetchMock,
      onMutation,
    });

    await client.call("GET", "/api/v1/me");
    expect(onMutation).not.toHaveBeenCalled();
    await client.call("POST", "/api/v1/users/user-1/access", {});
    expect(onMutation).toHaveBeenCalledTimes(1);
  });

  it("uses versioned Razorpay order and verification contracts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              paymentRequestId: "provider-order-1",
              keyId: "rzp_test_school",
              orderId: "order_school123",
              amountMinor: 5000,
              currency: "INR",
              name: "School One",
              description: "Fee payment",
              prefill: { name: "Student One" },
              status: "created",
            },
            meta: { requestId: "request-rzp-1" },
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "payment-1",
              invoiceId: "invoice-1",
              studentId: "student-1",
              receiptNumber: "RCPT-1",
              amountMinor: 5000,
              method: "online",
              providerReference: "pay_school123",
              paidAt: "2026-08-09T10:00:00.000Z",
              status: "posted",
            },
            meta: { requestId: "request-rzp-2" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    const client = new SchoolErpApiClient({
      baseUrl: "https://api.example.com",
      getFirebaseIdToken: async () => "firebase-token",
      fetch: fetchMock,
    });

    await client.createRazorpayOrder({
      invoiceId: "invoice-1",
      studentId: "student-1",
      amountMinor: 5000,
      idempotencyKey: "razorpay-request-1",
    });
    await client.verifyRazorpayPayment({
      razorpayOrderId: "order_school123",
      razorpayPaymentId: "pay_school123",
      razorpaySignature: "a".repeat(64),
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.example.com/api/v1/payments/razorpay/orders",
      "https://api.example.com/api/v1/payments/razorpay/verify",
    ]);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        invoiceId: "invoice-1",
        studentId: "student-1",
        amountMinor: 5000,
        idempotencyKey: "razorpay-request-1",
      }),
    });
  });

  it("builds encoded, paginated shared student-data URLs", async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              studentId: "student/1",
              rows: [],
              pageInfo: { page: 2, pageSize: 5, total: 0, pageCount: 0 },
            },
            meta: { requestId: "request-3" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    const client = new SchoolErpApiClient({
      baseUrl: "https://api.example.com",
      getFirebaseIdToken: async () => "firebase-token",
      fetch: fetchMock,
    });

    await client.getStudentAttendance("student/1", { page: 2, pageSize: 5 });
    await client.getStudentInvoices("student/1");
    await client.getStudentResults("student/1");
    await client.getNotifications({ pageSize: 10 });
    await client.createLeaveRequest({
      studentId: "student/1",
      startsOn: "2026-08-10",
      endsOn: "2026-08-11",
      reason: "Family event",
    });
    await client.collectPayment({
      invoiceId: "invoice/1",
      studentId: "student/1",
      amountMinor: 5000,
      method: "cash",
      idempotencyKey: "payment-request-1",
    });
    await client.createRefund({
      paymentId: "payment/1",
      amountMinor: 2500,
      reason: "Approved correction",
      idempotencyKey: "refund-request-1",
    });
    await client.createUploadSignature({
      entityType: "student",
      entityId: "student_1",
      resourceType: "raw",
    });
    await client.saveDocumentMetadata({
      entityType: "student",
      entityId: "student_1",
      resourceType: "raw",
      category: "identity",
      publicId: "school-erp/org-1/student/student_1/id-card",
      secureUrl: "https://res.cloudinary.com/example/raw/upload/id-card.pdf",
    });
    await client.getStudentDocuments("student/1");
    await client.markNotificationRead("notification/1");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.example.com/api/v1/students/student%2F1/attendance?page=2&pageSize=5",
      "https://api.example.com/api/v1/students/student%2F1/invoices",
      "https://api.example.com/api/v1/students/student%2F1/results",
      "https://api.example.com/api/v1/notifications?pageSize=10",
      "https://api.example.com/api/v1/leave-requests",
      "https://api.example.com/api/v1/payments",
      "https://api.example.com/api/v1/payments/refunds",
      "https://api.example.com/api/v1/uploads/signature",
      "https://api.example.com/api/v1/documents",
      "https://api.example.com/api/v1/students/student%2F1/documents",
      "https://api.example.com/api/v1/notifications/notification%2F1/read",
    ]);
    expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        studentId: "student/1",
        startsOn: "2026-08-10",
        endsOn: "2026-08-11",
        reason: "Family event",
      }),
    });
    expect(fetchMock.mock.calls[5]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        invoiceId: "invoice/1",
        studentId: "student/1",
        amountMinor: 5000,
        method: "cash",
        idempotencyKey: "payment-request-1",
      }),
    });
    expect(fetchMock.mock.calls[6]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        paymentId: "payment/1",
        amountMinor: 2500,
        reason: "Approved correction",
        idempotencyKey: "refund-request-1",
      }),
    });
    expect(fetchMock.mock.calls[9]?.[1]).toMatchObject({ method: "GET" });
    expect(fetchMock.mock.calls[10]?.[1]).toMatchObject({ method: "PATCH" });
  });
});
