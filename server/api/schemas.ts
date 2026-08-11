export const errorEnvelopeSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message", "requestId"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        requestId: { type: "string" },
        fields: {},
      },
    },
  },
} as const;

export const metaSchema = {
  tags: ["meta"],
  summary: "Get API compatibility metadata",
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["name", "version", "status", "capabilities"],
          properties: {
            name: { type: "string" },
            version: { type: "string" },
            status: { type: "string" },
            capabilities: { type: "array", items: { type: "string" } },
          },
        },
        meta: {
          type: "object",
          required: ["requestId"],
          properties: { requestId: { type: "string" } },
        },
      },
    },
  },
} as const;

export const liveSchema = {
  tags: ["health"],
  summary: "Check whether the API process is live",
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["status", "service"],
          properties: {
            status: { type: "string" },
            service: { type: "string" },
          },
        },
        meta: {
          type: "object",
          required: ["requestId"],
          properties: { requestId: { type: "string" } },
        },
      },
    },
  },
} as const;

export const readySchema = {
  tags: ["health"],
  summary: "Check database readiness",
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["status", "database", "service"],
          properties: {
            status: { type: "string" },
            database: { type: "string" },
            service: { type: "string" },
          },
        },
        meta: {
          type: "object",
          required: ["requestId"],
          properties: { requestId: { type: "string" } },
        },
      },
    },
    503: errorEnvelopeSchema,
  },
} as const;

const campusSchema = {
  type: "object",
  required: ["id", "name"],
  properties: { id: { type: "string" }, name: { type: "string" } },
} as const;

export const meSchema = {
  tags: ["identity"],
  summary: "Get the authenticated ERP user context",
  description:
    "Resolves the same tenant, role, campus and permission context for web and Flutter clients.",
  security: [{ firebaseBearer: [] }],
  headers: {
    type: "object",
    properties: {
      "x-campus-id": { type: "string", minLength: 1, maxLength: 200 },
    },
  },
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: [
            "id",
            "email",
            "displayName",
            "role",
            "organization",
            "campus",
            "campuses",
            "permissions",
          ],
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            displayName: { type: "string" },
            role: { type: "string" },
            organization: campusSchema,
            campus: { anyOf: [campusSchema, { type: "null" }] },
            campuses: { type: "array", items: campusSchema },
            linkedStudentId: { anyOf: [{ type: "string" }, { type: "null" }] },
            linkedEmployeeId: { anyOf: [{ type: "string" }, { type: "null" }] },
            linkedGuardianId: { anyOf: [{ type: "string" }, { type: "null" }] },
            permissions: { type: "array", items: { type: "string" } },
          },
        },
        meta: {
          type: "object",
          required: ["requestId"],
          properties: { requestId: { type: "string" } },
        },
      },
    },
    401: errorEnvelopeSchema,
    403: errorEnvelopeSchema,
    422: errorEnvelopeSchema,
    503: errorEnvelopeSchema,
  },
} as const;

export const meCampusesSchema = {
  tags: ["identity"],
  summary: "Get authorized campus choices",
  security: [{ firebaseBearer: [] }],
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["activeCampusId", "campuses"],
          properties: {
            activeCampusId: { anyOf: [{ type: "string" }, { type: "null" }] },
            campuses: { type: "array", items: campusSchema },
          },
        },
        meta: {
          type: "object",
          required: ["requestId"],
          properties: { requestId: { type: "string" } },
        },
      },
    },
    401: errorEnvelopeSchema,
    403: errorEnvelopeSchema,
    422: errorEnvelopeSchema,
    503: errorEnvelopeSchema,
  },
} as const;

const portalMetricSchema = {
  type: "object",
  required: ["label", "value", "detail", "href"],
  properties: {
    label: { type: "string" },
    value: { type: "string" },
    detail: { type: "string" },
    href: { type: "string" },
  },
} as const;

export const portalSummarySchema = {
  tags: ["identity"],
  summary: "Get the authorized role portal snapshot",
  security: [{ firebaseBearer: [] }],
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      portal: { type: "string", enum: ["teacher", "parent", "student"] },
    },
  },
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["portal", "metrics", "students", "recent", "offlineNote"],
          properties: {
            portal: { type: "string", enum: ["teacher", "parent", "student"] },
            metrics: { type: "array", items: portalMetricSchema },
            students: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "name", "detail", "status"],
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  detail: { type: "string" },
                  status: { type: "string" },
                },
              },
            },
            recent: {
              type: "array",
              items: {
                type: "object",
                required: ["title", "detail", "href"],
                properties: {
                  title: { type: "string" },
                  detail: { type: "string" },
                  href: { type: "string" },
                },
              },
            },
            offlineNote: { type: "string" },
          },
        },
        meta: {
          type: "object",
          required: ["requestId"],
          properties: { requestId: { type: "string" } },
        },
      },
    },
    401: errorEnvelopeSchema,
    403: errorEnvelopeSchema,
    422: errorEnvelopeSchema,
    503: errorEnvelopeSchema,
  },
} as const;
