import { errorEnvelopeSchema } from "../schemas";

const nullableString = {
  anyOf: [{ type: "string" }, { type: "null" }],
} as const;
const dateTime = { type: "string", format: "date-time" } as const;
const nullableDateTime = { anyOf: [dateTime, { type: "null" }] } as const;

const meta = {
  type: "object",
  required: ["requestId"],
  properties: { requestId: { type: "string" } },
} as const;

const pageInfo = {
  type: "object",
  required: ["page", "pageSize", "total", "pageCount"],
  properties: {
    page: { type: "integer", minimum: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100 },
    total: { type: "integer", minimum: 0 },
    pageCount: { type: "integer", minimum: 0 },
  },
} as const;

const studentParams = {
  type: "object",
  additionalProperties: false,
  required: ["studentId"],
  properties: {
    studentId: { type: "string", minLength: 1, maxLength: 200 },
  },
} as const;

const paginationQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  },
} as const;

const securedErrors = {
  401: errorEnvelopeSchema,
  403: errorEnvelopeSchema,
  404: errorEnvelopeSchema,
  422: errorEnvelopeSchema,
  503: errorEnvelopeSchema,
} as const;

export const studentProfileSchema = {
  tags: ["students"],
  summary: "Get an authorized student profile",
  security: [{ firebaseBearer: [] }],
  params: studentParams,
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: [
            "student",
            "guardians",
            "enrollments",
            "timeline",
            "certificates",
          ],
          properties: {
            student: {
              type: "object",
              required: [
                "id",
                "admissionNumber",
                "firstName",
                "lastName",
                "dateOfBirth",
                "gender",
                "email",
                "phone",
                "photoUrl",
                "bloodGroup",
                "joinedOn",
                "status",
              ],
              properties: {
                id: { type: "string" },
                admissionNumber: { type: "string" },
                firstName: { type: "string" },
                lastName: { type: "string" },
                dateOfBirth: nullableDateTime,
                gender: nullableString,
                email: nullableString,
                phone: nullableString,
                photoUrl: nullableString,
                bloodGroup: nullableString,
                joinedOn: dateTime,
                status: { type: "string" },
              },
            },
            guardians: {
              type: "array",
              items: {
                type: "object",
                required: [
                  "id",
                  "firstName",
                  "lastName",
                  "relationship",
                  "isPrimary",
                  "phone",
                ],
                properties: {
                  id: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  relationship: { type: "string" },
                  isPrimary: { type: "boolean" },
                  phone: nullableString,
                },
              },
            },
            enrollments: {
              type: "array",
              items: {
                type: "object",
                required: [
                  "id",
                  "academicYearId",
                  "classId",
                  "sectionId",
                  "rollNumber",
                  "startsOn",
                  "endsOn",
                  "status",
                ],
                properties: {
                  id: { type: "string" },
                  academicYearId: { type: "string" },
                  classId: { type: "string" },
                  sectionId: { type: "string" },
                  rollNumber: nullableString,
                  startsOn: dateTime,
                  endsOn: nullableDateTime,
                  status: { type: "string" },
                },
              },
            },
            timeline: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "eventType", "title", "occurredAt", "status"],
                properties: {
                  id: { type: "string" },
                  eventType: { type: "string" },
                  title: { type: "string" },
                  occurredAt: dateTime,
                  status: { type: "string" },
                },
              },
            },
            certificates: {
              type: "array",
              items: {
                type: "object",
                required: [
                  "id",
                  "certificateNumber",
                  "certificateType",
                  "verificationCode",
                  "issuedAt",
                  "status",
                ],
                properties: {
                  id: { type: "string" },
                  certificateNumber: { type: "string" },
                  certificateType: { type: "string" },
                  verificationCode: { type: "string" },
                  issuedAt: dateTime,
                  status: { type: "string" },
                },
              },
            },
          },
        },
        meta,
      },
    },
    ...securedErrors,
  },
} as const;

function paginatedSchema(
  tag: string,
  summary: string,
  item: Record<string, unknown>,
) {
  return {
    tags: [tag],
    summary,
    security: [{ firebaseBearer: [] }],
    params: studentParams,
    querystring: paginationQuery,
    response: {
      200: {
        type: "object",
        required: ["data", "meta"],
        properties: {
          data: {
            type: "object",
            required: ["studentId", "rows", "pageInfo"],
            properties: {
              studentId: { type: "string" },
              rows: { type: "array", items: item },
              pageInfo,
            },
          },
          meta,
        },
      },
      ...securedErrors,
    },
  } as const;
}

export const studentAttendanceSchema = paginatedSchema(
  "attendance",
  "List authorized student attendance",
  {
    type: "object",
    required: [
      "id",
      "attendanceDate",
      "period",
      "state",
      "note",
      "updatedAt",
      "status",
    ],
    properties: {
      id: { type: "string" },
      attendanceDate: dateTime,
      period: { type: "string" },
      state: { type: "string" },
      note: nullableString,
      updatedAt: dateTime,
      status: { type: "string" },
    },
  },
);

export const studentInvoicesSchema = paginatedSchema(
  "finance",
  "List authorized student invoices in minor currency units",
  {
    type: "object",
    required: [
      "id",
      "invoiceNumber",
      "issuedOn",
      "dueOn",
      "totalMinor",
      "balanceMinor",
      "currency",
      "status",
    ],
    properties: {
      id: { type: "string" },
      invoiceNumber: { type: "string" },
      issuedOn: dateTime,
      dueOn: dateTime,
      totalMinor: { type: "integer" },
      balanceMinor: { type: "integer" },
      currency: { type: "string" },
      status: { type: "string" },
    },
  },
);

export const studentResultsSchema = paginatedSchema(
  "exams",
  "List published result entries for an authorized student",
  {
    type: "object",
    required: [
      "id",
      "examId",
      "examName",
      "subjectId",
      "subjectName",
      "marks",
      "maximumMarks",
      "state",
      "publishedAt",
    ],
    properties: {
      id: { type: "string" },
      examId: { type: "string" },
      examName: { type: "string" },
      subjectId: { type: "string" },
      subjectName: { type: "string" },
      marks: { anyOf: [{ type: "integer" }, { type: "null" }] },
      maximumMarks: { type: "integer" },
      state: { type: "string" },
      publishedAt: nullableDateTime,
    },
  },
);

export const notificationsSchema = {
  tags: ["communication"],
  summary: "List in-app notifications for the authenticated user",
  security: [{ firebaseBearer: [] }],
  querystring: paginationQuery,
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["rows", "pageInfo"],
          properties: {
            rows: {
              type: "array",
              items: {
                type: "object",
                required: [
                  "id",
                  "subject",
                  "body",
                  "sentAt",
                  "readAt",
                  "status",
                ],
                properties: {
                  id: { type: "string" },
                  subject: { type: "string" },
                  body: { type: "string" },
                  sentAt: nullableDateTime,
                  readAt: nullableDateTime,
                  status: { type: "string" },
                },
              },
            },
            pageInfo,
          },
        },
        meta,
      },
    },
    401: errorEnvelopeSchema,
    403: errorEnvelopeSchema,
    422: errorEnvelopeSchema,
    503: errorEnvelopeSchema,
  },
} as const;

export const createLeaveRequestSchema = {
  tags: ["attendance"],
  summary: "Submit a leave request for the authenticated requester",
  security: [{ firebaseBearer: [] }],
  body: {
    type: "object",
    additionalProperties: false,
    required: ["startsOn", "endsOn", "reason"],
    properties: {
      studentId: { type: "string", minLength: 1, maxLength: 200 },
      startsOn: { type: "string", format: "date" },
      endsOn: { type: "string", format: "date" },
      reason: { type: "string", minLength: 3, maxLength: 500 },
    },
  },
  response: {
    201: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: [
            "id",
            "requesterType",
            "requesterId",
            "startsOn",
            "endsOn",
            "reason",
            "status",
          ],
          properties: {
            id: { type: "string" },
            requesterType: { type: "string", enum: ["student", "employee"] },
            requesterId: { type: "string" },
            startsOn: dateTime,
            endsOn: dateTime,
            reason: { type: "string" },
            status: { type: "string" },
          },
        },
        meta,
      },
    },
    401: errorEnvelopeSchema,
    403: errorEnvelopeSchema,
    409: errorEnvelopeSchema,
    422: errorEnvelopeSchema,
    503: errorEnvelopeSchema,
  },
} as const;

export const markNotificationReadSchema = {
  tags: ["communication"],
  summary: "Mark an authenticated recipient's notification as read",
  security: [{ firebaseBearer: [] }],
  params: {
    type: "object",
    additionalProperties: false,
    required: ["notificationId"],
    properties: {
      notificationId: { type: "string", minLength: 1, maxLength: 200 },
    },
  },
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["id", "readAt", "status"],
          properties: {
            id: { type: "string" },
            readAt: dateTime,
            status: { type: "string" },
          },
        },
        meta,
      },
    },
    401: errorEnvelopeSchema,
    403: errorEnvelopeSchema,
    404: errorEnvelopeSchema,
    422: errorEnvelopeSchema,
    503: errorEnvelopeSchema,
  },
} as const;
