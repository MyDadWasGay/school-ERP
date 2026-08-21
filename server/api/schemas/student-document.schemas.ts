import { errorEnvelopeSchema } from "../schemas";

const meta = {
  type: "object",
  required: ["requestId"],
  properties: { requestId: { type: "string" } },
} as const;

const nullableString = {
  anyOf: [{ type: "string" }, { type: "null" }],
} as const;

export const documentTypesListSchema = {
  tags: ["documents"],
  summary: "List configurable document types and rules",
  security: [{ firebaseBearer: [] }],
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["documentTypes"],
          properties: {
            documentTypes: {
              type: "array",
              items: {
                type: "object",
                required: [
                  "id",
                  "code",
                  "name",
                  "category",
                  "requirementType",
                  "appliesTo",
                  "allowedFileTypes",
                  "maxFileSizeBytes",
                  "requiresVerification",
                  "expiryEnabled",
                  "isSensitive",
                  "status",
                ],
                properties: {
                  id: { type: "string" },
                  code: { type: "string" },
                  name: { type: "string" },
                  description: nullableString,
                  category: { type: "string" },
                  requirementType: { type: "string" },
                  appliesTo: { type: "string" },
                  allowedFileTypes: { type: "string" },
                  maxFileSizeBytes: { type: "integer" },
                  requiresVerification: { type: "boolean" },
                  expiryEnabled: { type: "boolean" },
                  isSensitive: { type: "boolean" },
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
    503: errorEnvelopeSchema,
  },
} as const;

export const studentDocumentSummarySchema = {
  tags: ["documents"],
  summary: "Get centralized document completion summary and checklist for a student",
  security: [{ firebaseBearer: [] }],
  params: {
    type: "object",
    required: ["studentId"],
    properties: {
      studentId: { type: "string", minLength: 1 },
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
            "totalRequired",
            "completedRequired",
            "completionPercentage",
            "isComplete",
            "missingDocuments",
            "pendingVerification",
            "expiredDocuments",
            "warnings",
            "requirements",
          ],
          properties: {
            totalRequired: { type: "integer" },
            completedRequired: { type: "integer" },
            completionPercentage: { type: "number" },
            isComplete: { type: "boolean" },
            missingDocuments: {
              type: "array",
              items: {
                type: "object",
                required: ["documentTypeId", "code", "name", "category", "requirementType"],
                properties: {
                  documentTypeId: { type: "string" },
                  code: { type: "string" },
                  name: { type: "string" },
                  category: { type: "string" },
                  requirementType: { type: "string" },
                },
              },
            },
            pendingVerification: {
              type: "array",
              items: {
                type: "object",
                required: ["documentId", "documentTypeId", "name", "status"],
                properties: {
                  documentId: { type: "string" },
                  documentTypeId: { type: "string" },
                  name: { type: "string" },
                  status: { type: "string" },
                },
              },
            },
            expiredDocuments: {
              type: "array",
              items: {
                type: "object",
                required: ["documentId", "documentTypeId", "name", "expiresAt"],
                properties: {
                  documentId: { type: "string" },
                  documentTypeId: { type: "string" },
                  name: { type: "string" },
                  expiresAt: { type: "string" },
                },
              },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            requirements: {
              type: "array",
              items: {
                type: "object",
                required: [
                  "documentTypeId",
                  "code",
                  "name",
                  "category",
                  "requirementType",
                  "isApplicable",
                  "status",
                ],
                properties: {
                  documentTypeId: { type: "string" },
                  code: { type: "string" },
                  name: { type: "string" },
                  category: { type: "string" },
                  requirementType: { type: "string" },
                  isApplicable: { type: "boolean" },
                  conditionMetReason: nullableString,
                  status: { type: "string" },
                  documentId: nullableString,
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
    503: errorEnvelopeSchema,
  },
} as const;

export const studentDocumentsListDetailedSchema = {
  tags: ["documents"],
  summary: "List all active student documents with verification and version information",
  security: [{ firebaseBearer: [] }],
  params: {
    type: "object",
    required: ["studentId"],
    properties: {
      studentId: { type: "string", minLength: 1 },
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
              items: {
                type: "object",
                required: [
                  "id",
                  "studentId",
                  "documentTypeId",
                  "status",
                  "verificationStatus",
                  "docTypeName",
                  "docTypeCode",
                  "docTypeCategory",
                  "docTypeRequirement",
                  "createdAt",
                ],
                properties: {
                  id: { type: "string" },
                  studentId: { type: "string" },
                  guardianId: nullableString,
                  documentTypeId: { type: "string" },
                  status: { type: "string" },
                  verificationStatus: { type: "string" },
                  verifiedBy: nullableString,
                  verifiedAt: nullableString,
                  rejectionReason: nullableString,
                  verificationNotes: nullableString,
                  issuedAt: nullableString,
                  expiresAt: nullableString,
                  expiryStatus: nullableString,
                  isSensitive: { type: "boolean" },
                  createdAt: { type: "string" },
                  docTypeName: { type: "string" },
                  docTypeCode: { type: "string" },
                  docTypeCategory: { type: "string" },
                  docTypeRequirement: { type: "string" },
                  docTypeAllowedTypes: { type: "string" },
                  docTypeRequiresVerification: { type: "boolean" },
                  docTypeExpiryEnabled: { type: "boolean" },
                  currentVersion: {
                    anyOf: [
                      {
                        type: "object",
                        required: [
                          "id",
                          "versionNumber",
                          "originalFilename",
                          "mimeType",
                          "fileSizeBytes",
                          "fileHash",
                          "scanStatus",
                          "verificationStatus",
                          "createdAt",
                        ],
                        properties: {
                          id: { type: "string" },
                          versionNumber: { type: "integer" },
                          originalFilename: { type: "string" },
                          sanitizedFilename: { type: "string" },
                          mimeType: { type: "string" },
                          fileExtension: { type: "string" },
                          fileSizeBytes: { type: "integer" },
                          fileHash: { type: "string" },
                          scanStatus: { type: "string" },
                          verificationStatus: { type: "string" },
                          uploadedBy: { type: "string" },
                          createdAt: { type: "string" },
                        },
                      },
                      { type: "null" },
                    ],
                  },
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
    503: errorEnvelopeSchema,
  },
} as const;

export const studentDocumentUploadSchema = {
  tags: ["documents"],
  summary: "Upload or update a student document with file validation and security scan",
  security: [{ firebaseBearer: [] }],
  params: {
    type: "object",
    required: ["studentId"],
    properties: {
      studentId: { type: "string", minLength: 1 },
    },
  },
  body: {
    type: "object",
    required: ["documentTypeId", "fileBase64", "filename"],
    properties: {
      documentTypeId: { type: "string", minLength: 1 },
      guardianId: { type: "string" },
      fileBase64: { type: "string", minLength: 10 },
      filename: { type: "string", minLength: 1, maxLength: 255 },
      claimedMimeType: { type: "string" },
      changeReason: { type: "string", maxLength: 500 },
      issuedAt: { type: "string" },
      expiresAt: { type: "string" },
    },
  },
  response: {
    201: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["documentId", "versionId", "versionNumber", "status", "verificationStatus"],
          properties: {
            documentId: { type: "string" },
            versionId: { type: "string" },
            versionNumber: { type: "integer" },
            status: { type: "string" },
            verificationStatus: { type: "string" },
            fileHash: { type: "string" },
            fileSizeBytes: { type: "integer" },
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

export const documentVerifySchema = {
  tags: ["documents"],
  summary: "Verify an uploaded student document",
  security: [{ firebaseBearer: [] }],
  params: {
    type: "object",
    required: ["documentId"],
    properties: {
      documentId: { type: "string", minLength: 1 },
    },
  },
  body: {
    type: "object",
    properties: {
      notes: { type: "string", maxLength: 500 },
    },
  },
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["id", "status", "verificationStatus", "verifiedAt"],
          properties: {
            id: { type: "string" },
            status: { type: "string" },
            verificationStatus: { type: "string" },
            verifiedAt: { type: "string" },
            notes: nullableString,
          },
        },
        meta,
      },
    },
    401: errorEnvelopeSchema,
    403: errorEnvelopeSchema,
    404: errorEnvelopeSchema,
    503: errorEnvelopeSchema,
  },
} as const;

export const documentRejectSchema = {
  tags: ["documents"],
  summary: "Reject an uploaded student document with a mandatory reason",
  security: [{ firebaseBearer: [] }],
  params: {
    type: "object",
    required: ["documentId"],
    properties: {
      documentId: { type: "string", minLength: 1 },
    },
  },
  body: {
    type: "object",
    required: ["reason"],
    properties: {
      reason: { type: "string", minLength: 3, maxLength: 500 },
      notes: { type: "string", maxLength: 500 },
    },
  },
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["id", "status", "verificationStatus", "rejectionReason"],
          properties: {
            id: { type: "string" },
            status: { type: "string" },
            verificationStatus: { type: "string" },
            rejectionReason: { type: "string" },
            verifiedAt: { type: "string" },
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

export const documentTokenSchema = {
  tags: ["documents"],
  summary: "Generate a short-lived secure token for authorized document preview or download",
  security: [{ firebaseBearer: [] }],
  params: {
    type: "object",
    required: ["documentId"],
    properties: {
      documentId: { type: "string", minLength: 1 },
    },
  },
  querystring: {
    type: "object",
    properties: {
      disposition: { type: "string", enum: ["inline", "attachment"], default: "inline" },
    },
  },
  response: {
    200: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: {
          type: "object",
          required: ["accessToken", "expiresAt", "filename", "mimeType", "fileSizeBytes"],
          properties: {
            accessToken: { type: "string" },
            expiresAt: { type: "string", format: "date-time" },
            filename: { type: "string" },
            mimeType: { type: "string" },
            fileSizeBytes: { type: "integer" },
          },
        },
        meta,
      },
    },
    401: errorEnvelopeSchema,
    403: errorEnvelopeSchema,
    404: errorEnvelopeSchema,
    503: errorEnvelopeSchema,
  },
} as const;
