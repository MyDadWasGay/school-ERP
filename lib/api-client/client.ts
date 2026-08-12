import type {
  ApiCampus,
  ApiAcademicKind,
  ApiAcademicRecord,
  ApiAcademicRecordInput,
  ApiDocumentMetadataInput,
  ApiDocumentSaved,
  ApiErrorEnvelope,
  ApiLeaveRequest,
  ApiLeaveRequestInput,
  ApiMe,
  ApiNotificationRead,
  ApiNotifications,
  ApiPayment,
  ApiPaymentInput,
  ApiPortalKind,
  ApiPortalSnapshot,
  ApiRazorpayCheckoutOrder,
  ApiRazorpayOrderInput,
  ApiRazorpayVerificationInput,
  ApiRefund,
  ApiRefundInput,
  ApiStudentAttendance,
  ApiStudentInvoices,
  ApiStudentDocuments,
  ApiStudentProfile,
  ApiStudentResults,
  ApiSuccess,
  ApiUploadSignature,
  ApiUploadSignatureInput,
} from "./contracts";

export type ApiPagination = { page?: number; pageSize?: number };

function paginationQuery(input?: ApiPagination) {
  const query = new URLSearchParams();
  if (input?.page !== undefined) query.set("page", String(input.page));
  if (input?.pageSize !== undefined)
    query.set("pageSize", String(input.pageSize));
  const value = query.toString();
  return value ? `?${value}` : "";
}

function studentPath(studentId: string) {
  if (!studentId.trim()) throw new Error("A student ID is required.");
  return `/api/v1/students/${encodeURIComponent(studentId)}`;
}

export class SchoolErpApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
    public readonly fields?: unknown,
  ) {
    super(message);
    this.name = "SchoolErpApiError";
  }
}

export type SchoolErpApiClientOptions = {
  baseUrl: string;
  getFirebaseIdToken?: () => Promise<string>;
  getAccessToken?: () => Promise<string>;
  authorizationScheme?: "Bearer";
  getCampusId?: () => string | undefined;
  useSessionCookie?: boolean;
  getCookieHeader?: () => string | undefined | Promise<string | undefined>;
  getCsrfToken?: () => string | undefined | Promise<string | undefined>;
  credentials?: RequestCredentials;
  fetch?: typeof fetch;
  /** Server adapters use this to invalidate request-local auth/data snapshots. */
  onMutation?: () => void;
};

export type ApiRequestOptions = {
  idempotencyKey?: string;
  /** Positive timeout override in milliseconds. Defaults to 15s for reads and 30s for mutations. */
  timeoutMs?: number;
};

/**
 * CLIENT_API_AUTH:
 * Browser and future SSR adapters supply credentials; this client never reads
 * tokens from local storage and never accepts tenant identity from callers.
 */
export class SchoolErpApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: SchoolErpApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    if (!/^https?:\/\//.test(this.baseUrl))
      throw new Error("School ERP API baseUrl must use HTTP(S).");
    // Keep the browser's `fetch` receiver intact. Some browsers throw
    // "Illegal invocation" when window.fetch is stored and called detached.
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
    requestOptions: ApiRequestOptions = {},
  ): Promise<ApiSuccess<T>> {
    const getAccessToken =
      this.options.getAccessToken ?? this.options.getFirebaseIdToken;
    if (!getAccessToken && !this.options.useSessionCookie)
      throw new Error("An API access-token provider is required.");
    const token = getAccessToken ? await getAccessToken() : undefined;
    if (!token && !this.options.useSessionCookie)
      throw new SchoolErpApiError(
        401,
        "UNAUTHENTICATED",
        "An API access token is required.",
      );
    const campusId = this.options.getCampusId?.();
    const cookieHeader = this.options.getCookieHeader
      ? await this.options.getCookieHeader()
      : undefined;
    const csrfToken = this.options.getCsrfToken
      ? await this.options.getCsrfToken()
      : undefined;
    const timeoutMs = requestOptions.timeoutMs ?? (method === "GET" ? 15_000 : 30_000);
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new Error("API request timeout must be a positive number.");
    }
    const controller = new AbortController();
    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: {
          accept: "application/json",
          ...(token
            ? {
                authorization: `${this.options.authorizationScheme ?? "Bearer"} ${token}`,
              }
            : {}),
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...(campusId ? { "x-campus-id": campusId } : {}),
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          ...(requestOptions.idempotencyKey
            ? { "x-idempotency-key": requestOptions.idempotencyKey }
            : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        credentials:
          this.options.credentials ??
          (this.options.useSessionCookie ? "include" : "omit"),
        cache: "no-store",
        signal: controller.signal,
      });
      let payload: ApiSuccess<T> | ApiErrorEnvelope;
      try {
        payload = (await response.json()) as ApiSuccess<T> | ApiErrorEnvelope;
      } catch {
        throw new SchoolErpApiError(
          response.status,
          "INVALID_RESPONSE",
          "The API returned an invalid response. Please try again.",
          response.headers.get("x-request-id") ?? undefined,
        );
      }
      if (!response.ok || "error" in payload) {
        const error = "error" in payload ? payload.error : undefined;
        throw new SchoolErpApiError(
          response.status,
          error?.code ?? "INVALID_RESPONSE",
          error?.message ?? "The API request failed.",
          error?.requestId ?? response.headers.get("x-request-id") ?? undefined,
          error?.fields,
        );
      }
      return payload;
    } catch (error) {
      if (timedOut) {
        throw new SchoolErpApiError(
          408,
          "REQUEST_TIMEOUT",
          "The API request timed out. Please try again.",
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutHandle);
      if (method !== "GET") {
        // A mutation can change access, campus, or session state. Never let a
        // server render reuse an auth/data snapshot after that point.
        try {
          this.options.onMutation?.();
        } catch {
          // Invalidation must never replace the API result or error.
        }
      }
    }
  }

  private get<T>(path: string) {
    return this.request<T>("GET", path);
  }

  /** Generic typed escape hatch for a released OpenAPI operation. */
  call<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ) {
    return this.request<T>(method, path, body, options);
  }

  async getMe() {
    return (await this.get<ApiMe>("/api/v1/me")).data;
  }

  async listAcademicRecords(kind: ApiAcademicKind, search?: string) {
    const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    return (await this.get<ApiAcademicRecord[]>(`/api/v1/academics/${encodeURIComponent(kind)}${query}`)).data;
  }

  async createAcademicRecord(kind: ApiAcademicKind, input: ApiAcademicRecordInput) {
    return (await this.request<{ id: string }>("POST", `/api/v1/academics/${encodeURIComponent(kind)}`, input)).data;
  }

  async archiveAcademicRecord(kind: ApiAcademicKind, id: string) {
    return (await this.request<{ id: string }>("POST", `/api/v1/academics/${encodeURIComponent(kind)}/${encodeURIComponent(id)}/archive`)).data;
  }

  async getCampuses() {
    return (
      await this.get<{ activeCampusId: string | null; campuses: ApiCampus[] }>(
        "/api/v1/me/campuses",
      )
    ).data;
  }

  async getPortalSummary(portal?: ApiPortalKind) {
    const query = portal ? `?portal=${encodeURIComponent(portal)}` : "";
    return (await this.get<ApiPortalSnapshot>(`/api/v1/portal/summary${query}`))
      .data;
  }

  async getStudentProfile(studentId: string) {
    return (await this.get<ApiStudentProfile>(studentPath(studentId))).data;
  }

  async getStudentAttendance(studentId: string, pagination?: ApiPagination) {
    return (
      await this.get<ApiStudentAttendance>(
        `${studentPath(studentId)}/attendance${paginationQuery(pagination)}`,
      )
    ).data;
  }

  async getStudentInvoices(studentId: string, pagination?: ApiPagination) {
    return (
      await this.get<ApiStudentInvoices>(
        `${studentPath(studentId)}/invoices${paginationQuery(pagination)}`,
      )
    ).data;
  }

  async getStudentResults(studentId: string, pagination?: ApiPagination) {
    return (
      await this.get<ApiStudentResults>(
        `${studentPath(studentId)}/results${paginationQuery(pagination)}`,
      )
    ).data;
  }

  async getNotifications(pagination?: ApiPagination) {
    return (
      await this.get<ApiNotifications>(
        `/api/v1/notifications${paginationQuery(pagination)}`,
      )
    ).data;
  }

  async createLeaveRequest(input: ApiLeaveRequestInput) {
    return (
      await this.request<ApiLeaveRequest>(
        "POST",
        "/api/v1/leave-requests",
        input,
      )
    ).data;
  }

  async collectPayment(input: ApiPaymentInput) {
    return (
      await this.request<ApiPayment>("POST", "/api/v1/payments", input, {
        idempotencyKey: input.idempotencyKey,
      })
    )
      .data;
  }

  async createRazorpayOrder(input: ApiRazorpayOrderInput) {
    return (
      await this.request<ApiRazorpayCheckoutOrder>(
        "POST",
        "/api/v1/payments/razorpay/orders",
        input,
      )
    ).data;
  }

  async verifyRazorpayPayment(input: ApiRazorpayVerificationInput) {
    return (
      await this.request<ApiPayment>(
        "POST",
        "/api/v1/payments/razorpay/verify",
        input,
      )
    ).data;
  }

  async createRefund(input: ApiRefundInput) {
    return (
      await this.request<ApiRefund>("POST", "/api/v1/payments/refunds", input, {
        idempotencyKey: input.idempotencyKey,
      })
    ).data;
  }

  async createUploadSignature(input: ApiUploadSignatureInput) {
    return (
      await this.request<ApiUploadSignature>(
        "POST",
        "/api/v1/uploads/signature",
        input,
      )
    ).data;
  }

  async saveDocumentMetadata(input: ApiDocumentMetadataInput) {
    return (
      await this.request<ApiDocumentSaved>("POST", "/api/v1/documents", input)
    ).data;
  }

  async getStudentDocuments(studentId: string) {
    return (
      await this.get<ApiStudentDocuments>(`${studentPath(studentId)}/documents`)
    ).data;
  }

  async markNotificationRead(notificationId: string) {
    if (!notificationId.trim())
      throw new Error("A notification ID is required.");
    return (
      await this.request<ApiNotificationRead>(
        "PATCH",
        `/api/v1/notifications/${encodeURIComponent(notificationId)}/read`,
      )
    ).data;
  }
}
