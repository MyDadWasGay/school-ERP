import { errorEnvelopeSchema } from "../schemas";

const meta = {
  type: "object",
  required: ["requestId"],
  properties: { requestId: { type: "string" } },
} as const;

const nullableString = {
  anyOf: [{ type: "string" }, { type: "null" }],
} as const;
const uploadEntityTypes = [
  "student",
  "employee",
  "application",
  "certificate",
  "library_item",
  "asset",
  "cms_media",
  "health_record",
  "custom",
] as const;

const uploadProperties = {
  entityType: { type: "string", enum: uploadEntityTypes },
  entityId: {
    type: "string",
    minLength: 1,
    maxLength: 160,
    pattern: "^[a-zA-Z0-9_-]+$",
  },
  resourceType: { type: "string", enum: ["image", "raw", "video"] },
  format: { type: "string", maxLength: 20 },
  bytes: { type: "integer", minimum: 1 },
} as const;

export const collectPaymentSchema = {
  tags: ["finance"],
  summary: "Record an authorized fee collection",
  description:
    "Records a staff-authorized collection and posts its receipt and ledger entries. This is not a client payment-intent endpoint.",
  security: [{ firebaseBearer: [] }],
  body: {
    type: "object",
    additionalProperties: false,
    required: [
      "invoiceId",
      "studentId",
      "amountMinor",
      "method",
      "idempotencyKey",
    ],
    properties: {
      invoiceId: { type: "string", minLength: 1, maxLength: 200 },
      studentId: { type: "string", minLength: 1, maxLength: 200 },
      amountMinor: { type: "integer", minimum: 1 },
      method: {
        type: "string",
        enum: ["cash", "cheque", "card", "upi", "bank_transfer"],
      },
      idempotencyKey: { type: "string", minLength: 8, maxLength: 120 },
      providerReference: { type: "string", maxLength: 120 },
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
            "invoiceId",
            "studentId",
            "receiptNumber",
            "amountMinor",
            "method",
            "providerReference",
            "paidAt",
            "status",
          ],
          properties: {
            id: { type: "string" },
            invoiceId: { type: "string" },
            studentId: { type: "string" },
            receiptNumber: { type: "string" },
            amountMinor: { type: "integer" },
            method: { type: "string" },
            providerReference: nullableString,
            paidAt: { type: "string", format: "date-time" },
            status: { type: "string" },
          },
        },
        meta,
      },
    },
    401: errorEnvelopeSchema,
    403: errorEnvelopeSchema,
    404: errorEnvelopeSchema,
    409: errorEnvelopeSchema,
    422: errorEnvelopeSchema,
    503: errorEnvelopeSchema,
  },
} as const;

export const createRazorpayOrderApiSchema = {
  tags: ["finance"],
  summary: "Create or resume a Razorpay checkout order",
  description:
    "Creates a tenant-configured Razorpay Order for an authorized student invoice. The caller-supplied idempotency key must be reused after uncertain failures.",
  security: [{ firebaseBearer: [] }],
  body: {
    type: "object",
    additionalProperties: false,
    required: ["invoiceId", "studentId", "amountMinor", "idempotencyKey"],
    properties: {
      invoiceId: { type: "string", minLength: 1, maxLength: 200 },
      studentId: { type: "string", minLength: 1, maxLength: 200 },
      amountMinor: { type: "integer", minimum: 1 },
      idempotencyKey: { type: "string", minLength: 8, maxLength: 120 },
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
            "paymentRequestId",
            "keyId",
            "orderId",
            "amountMinor",
            "currency",
            "name",
            "description",
            "prefill",
            "status",
          ],
          properties: {
            paymentRequestId: { type: "string" },
            keyId: { type: "string" },
            orderId: { type: "string" },
            amountMinor: { type: "integer" },
            currency: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            prefill: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                contact: { type: "string" },
              },
            },
            status: { type: "string" },
          },
        },
        meta,
      },
    },
    401: errorEnvelopeSchema,
    403: errorEnvelopeSchema,
    404: errorEnvelopeSchema,
    409: errorEnvelopeSchema,
    422: errorEnvelopeSchema,
    502: errorEnvelopeSchema,
    503: errorEnvelopeSchema,
  },
} as const;

export const verifyRazorpayPaymentApiSchema = {
  tags: ["finance"],
  summary: "Verify and post a captured Razorpay payment",
  description:
    "Verifies the Checkout HMAC using the server-stored order ID, fetches the payment from Razorpay, requires captured status and exact order/amount/currency parity, then posts the receipt and ledger entries idempotently.",
  security: [{ firebaseBearer: [] }],
  body: {
    type: "object",
    additionalProperties: false,
    required: ["razorpayOrderId", "razorpayPaymentId", "razorpaySignature"],
    properties: {
      razorpayOrderId: { type: "string", minLength: 8, maxLength: 80 },
      razorpayPaymentId: { type: "string", minLength: 8, maxLength: 80 },
      razorpaySignature: {
        type: "string",
        pattern: "^[a-fA-F0-9]{64}$",
      },
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
            "invoiceId",
            "studentId",
            "receiptNumber",
            "amountMinor",
            "method",
            "providerReference",
            "paidAt",
            "status",
          ],
          properties: {
            id: { type: "string" },
            invoiceId: { type: "string" },
            studentId: { type: "string" },
            receiptNumber: { type: "string" },
            amountMinor: { type: "integer" },
            method: { type: "string", enum: ["online"] },
            providerReference: { type: "string" },
            paidAt: { type: "string", format: "date-time" },
            status: { type: "string" },
          },
        },
        meta,
      },
    },
    401: errorEnvelopeSchema,
    403: errorEnvelopeSchema,
    404: errorEnvelopeSchema,
    409: errorEnvelopeSchema,
    422: errorEnvelopeSchema,
    502: errorEnvelopeSchema,
    503: errorEnvelopeSchema,
  },
} as const;

export const createRefundApiSchema = {
  tags: ["finance"],
  summary: "Create or resume an idempotent payment refund",
  description:
    "Reserves the refundable amount. Online payments are refunded through Razorpay and the ERP ledger is reversed only after processed provider status; offline payments finalize atomically.",
  security: [{ firebaseBearer: [] }],
  body: {
    type: "object",
    additionalProperties: false,
    required: ["paymentId", "amountMinor", "reason", "idempotencyKey"],
    properties: {
      paymentId: { type: "string", minLength: 1, maxLength: 200 },
      amountMinor: { type: "integer", minimum: 1 },
      reason: { type: "string", minLength: 3, maxLength: 300 },
      idempotencyKey: {
        type: "string",
        minLength: 10,
        maxLength: 120,
        pattern: "^[A-Za-z0-9_-]+$",
      },
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
            "paymentId",
            "amountMinor",
            "provider",
            "providerRefundId",
            "providerStatus",
            "status",
          ],
          properties: {
            id: { type: "string" },
            paymentId: { type: "string" },
            amountMinor: { type: "integer" },
            provider: nullableString,
            providerRefundId: nullableString,
            providerStatus: nullableString,
            status: { type: "string" },
          },
        },
        meta,
      },
    },
    401: errorEnvelopeSchema,
    403: errorEnvelopeSchema,
    404: errorEnvelopeSchema,
    409: errorEnvelopeSchema,
    422: errorEnvelopeSchema,
    502: errorEnvelopeSchema,
    503: errorEnvelopeSchema,
  },
} as const;

export const uploadSignatureSchema = {
  tags: ["documents"],
  summary: "Create a scoped Cloudinary upload signature",
  security: [{ firebaseBearer: [] }],
  body: {
    type: "object",
    additionalProperties: false,
    required: ["entityType", "entityId", "resourceType"],
    properties: uploadProperties,
  },
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: [
            "timestamp",
            "folder",
            "type",
            "allowed_formats",
            "signature",
            "apiKey",
            "cloudName",
          ],
          properties: {
            timestamp: { type: "integer" },
            folder: { type: "string" },
            type: { type: "string", enum: ["authenticated"] },
            allowed_formats: { type: "string" },
            signature: { type: "string" },
            apiKey: { type: "string" },
            cloudName: { type: "string" },
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

export const saveDocumentSchema = {
  tags: ["documents"],
  summary: "Verify and store uploaded document metadata",
  security: [{ firebaseBearer: [] }],
  body: {
    type: "object",
    additionalProperties: false,
    required: [
      "entityType",
      "entityId",
      "category",
      "publicId",
      "secureUrl",
      "resourceType",
    ],
    properties: {
      ...uploadProperties,
      category: { type: "string", minLength: 1, maxLength: 80 },
      publicId: { type: "string", minLength: 1, maxLength: 500 },
      secureUrl: { type: "string", format: "uri" },
      width: { type: "integer", minimum: 1 },
      height: { type: "integer", minimum: 1 },
      version: { type: "integer", minimum: 1 },
      originalFilename: { type: "string", maxLength: 255 },
    },
  },
  response: {
    201: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["id", "entityType", "entityId", "category", "status"],
          properties: {
            id: { type: "string" },
            entityType: { type: "string" },
            entityId: { type: "string" },
            category: { type: "string" },
            status: { type: "string" },
          },
        },
        meta,
      },
    },
    401: errorEnvelopeSchema,
    403: errorEnvelopeSchema,
    422: errorEnvelopeSchema,
    502: errorEnvelopeSchema,
    503: errorEnvelopeSchema,
  },
} as const;

export const studentDocumentsSchema = {
  tags: ["documents"],
  summary: "List document metadata for an authorized student",
  security: [{ firebaseBearer: [] }],
  params: {
    type: "object",
    additionalProperties: false,
    required: ["studentId"],
    properties: {
      studentId: { type: "string", minLength: 1, maxLength: 200 },
    },
  },
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["studentId", "documents"],
          properties: {
            studentId: { type: "string" },
            documents: {
              type: "array",
              maxItems: 100,
              items: {
                type: "object",
                required: [
                  "id",
                  "category",
                  "secureUrl",
                  "resourceType",
                  "format",
                  "bytes",
                  "originalFilename",
                  "accessPolicy",
                  "createdAt",
                  "status",
                ],
                properties: {
                  id: { type: "string" },
                  category: { type: "string" },
                  secureUrl: { type: "string" },
                  resourceType: { type: "string" },
                  format: nullableString,
                  bytes: { anyOf: [{ type: "integer" }, { type: "null" }] },
                  originalFilename: nullableString,
                  accessPolicy: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                  status: { type: "string" },
                },
              },
            },
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
