export type ApiMeta = { requestId: string };
export type ApiSuccess<T> = { data: T; meta: ApiMeta };
export type ApiErrorEnvelope = {
  error: { code: string; message: string; requestId: string; fields?: unknown };
};

export type ApiCampus = { id: string; name: string };

export type ApiMe = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  organization: ApiCampus;
  campus: ApiCampus | null;
  campuses: ApiCampus[];
  linkedStudentId: string | null;
  linkedEmployeeId: string | null;
  linkedGuardianId: string | null;
  permissions: string[];
};

export type ApiPortalKind = "teacher" | "parent" | "student";
export type ApiPortalSnapshot = {
  portal: ApiPortalKind;
  metrics: Array<{
    label: string;
    value: string;
    detail: string;
    href: string;
  }>;
  students: Array<{ id: string; name: string; detail: string; status: string }>;
  recent: Array<{ title: string; detail: string; href: string }>;
  offlineNote: string;
};

export type ApiPageInfo = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type ApiAcademicKind = "curriculum" | "lesson-plans" | "teacher-allocation" | "timetable" | "substitutions" | "assignments" | "resources";
export type ApiAcademicRecord = { id: string; name: string; detail: string; status: string };
export type ApiAcademicRecordInput = { name: string; code?: string; referenceId?: string; teacherId?: string; classId?: string; subjectId?: string; scheduledFor?: string; dueAt?: string; details?: string };

export type ApiStudentProfile = {
  student: {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    gender: string | null;
    email: string | null;
    phone: string | null;
    photoUrl: string | null;
    bloodGroup: string | null;
    joinedOn: string;
    status: string;
  };
  guardians: Array<{
    id: string;
    firstName: string;
    lastName: string;
    relationship: string;
    isPrimary: boolean;
    phone: string | null;
  }>;
  enrollments: Array<{
    id: string;
    academicYearId: string;
    classId: string;
    sectionId: string;
    rollNumber: string | null;
    startsOn: string;
    endsOn: string | null;
    status: string;
  }>;
  timeline: Array<{
    id: string;
    eventType: string;
    title: string;
    occurredAt: string;
    status: string;
  }>;
  certificates: Array<{
    id: string;
    certificateNumber: string;
    certificateType: string;
    verificationCode: string;
    issuedAt: string;
    status: string;
  }>;
};

export type ApiStudentAttendance = {
  studentId: string;
  rows: Array<{
    id: string;
    attendanceDate: string;
    period: string;
    state: string;
    note: string | null;
    updatedAt: string;
    status: string;
  }>;
  pageInfo: ApiPageInfo;
};

export type ApiStudentInvoices = {
  studentId: string;
  rows: Array<{
    id: string;
    invoiceNumber: string;
    issuedOn: string;
    dueOn: string;
    totalMinor: number;
    balanceMinor: number;
    currency: string;
    status: string;
  }>;
  pageInfo: ApiPageInfo;
};

export type ApiStudentResults = {
  studentId: string;
  rows: Array<{
    id: string;
    examId: string;
    examName: string;
    subjectId: string;
    subjectName: string;
    marks: number | null;
    maximumMarks: number;
    state: string;
    publishedAt: string | null;
  }>;
  pageInfo: ApiPageInfo;
};

export type ApiNotifications = {
  rows: Array<{
    id: string;
    subject: string;
    body: string;
    sentAt: string | null;
    readAt: string | null;
    status: string;
  }>;
  pageInfo: ApiPageInfo;
};

export type ApiLeaveRequestInput = {
  studentId?: string;
  startsOn: string;
  endsOn: string;
  reason: string;
};

export type ApiLeaveRequest = {
  id: string;
  requesterType: "student" | "employee";
  requesterId: string;
  startsOn: string;
  endsOn: string;
  reason: string;
  status: string;
};

export type ApiNotificationRead = {
  id: string;
  readAt: string;
  status: string;
};

export type ApiPaymentMethod =
  "cash" | "cheque" | "card" | "upi" | "bank_transfer" | "online";

export type ApiPaymentInput = {
  invoiceId: string;
  studentId: string;
  amountMinor: number;
  method: Exclude<ApiPaymentMethod, "online">;
  idempotencyKey: string;
  providerReference?: string;
};

export type ApiPayment = {
  id: string;
  invoiceId: string;
  studentId: string;
  receiptNumber: string;
  amountMinor: number;
  method: ApiPaymentMethod;
  providerReference: string | null;
  paidAt: string;
  status: string;
};

export type ApiRazorpayOrderInput = {
  invoiceId: string;
  studentId: string;
  amountMinor: number;
  idempotencyKey: string;
};

export type ApiRazorpayCheckoutOrder = {
  paymentRequestId: string;
  keyId: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email?: string; contact?: string };
  status: string;
};

export type ApiRazorpayVerificationInput = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type ApiRefundInput = {
  paymentId: string;
  amountMinor: number;
  reason: string;
  idempotencyKey: string;
};

export type ApiRefund = {
  id: string;
  paymentId: string;
  amountMinor: number;
  provider: string | null;
  providerRefundId: string | null;
  providerStatus: string | null;
  status: string;
};

export type ApiUploadEntityType =
  | "student"
  | "employee"
  | "application"
  | "certificate"
  | "library_item"
  | "asset"
  | "cms_media"
  | "health_record"
  | "custom";

export type ApiUploadResourceType = "image" | "raw" | "video";

export type ApiUploadSignatureInput = {
  entityType: ApiUploadEntityType;
  entityId: string;
  resourceType: ApiUploadResourceType;
  format?: string;
  bytes?: number;
};

export type ApiUploadSignature = {
  timestamp: number;
  folder: string;
  type: "authenticated";
  allowed_formats: string;
  signature: string;
  apiKey: string;
  cloudName: string;
};

export type ApiDocumentMetadataInput = ApiUploadSignatureInput & {
  category: string;
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  version?: number;
  originalFilename?: string;
};

export type ApiDocumentSaved = {
  id: string;
  entityType: ApiUploadEntityType;
  entityId: string;
  category: string;
  status: string;
};

export type ApiStudentDocuments = {
  studentId: string;
  documents: Array<{
    id: string;
    category: string;
    secureUrl: string;
    resourceType: ApiUploadResourceType;
    format: string | null;
    bytes: number | null;
    originalFilename: string | null;
    accessPolicy: string;
    createdAt: string;
    status: string;
  }>;
};
