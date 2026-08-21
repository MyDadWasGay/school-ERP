import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  authenticateApiRequest,
  requireApiCsrf,
  requireApiPermission,
  requireApiUser,
} from "../auth/bearer-auth";
import {
  documentRejectSchema,
  documentTokenSchema,
  documentTypesListSchema,
  documentVerifySchema,
  studentDocumentSummarySchema,
  studentDocumentUploadSchema,
  studentDocumentsListDetailedSchema,
} from "../schemas/student-document.schemas";
import {
  calculateStudentDocumentSummary,
  listDocumentTypes,
} from "../../../features/documents/services/document-requirements.service";
import {
  generateDocumentAccessToken,
  getStudentDocumentById,
  listStudentDocumentsDetailed,
  rejectStudentDocument,
  restoreStudentDocument,
  softDeleteStudentDocument,
  uploadStudentDocument,
  verifyStudentDocument,
} from "../../../features/documents/services/student-document.service";
import { getDocumentStorage } from "../../../lib/storage/storage-factory";
import { AppError } from "../../../lib/errors/app-error";

const studentParamsSchema = z.object({
  studentId: z.string().min(1),
});

const documentParamsSchema = z.object({
  documentId: z.string().min(1),
});

const uploadBodySchema = z.object({
  documentTypeId: z.string().min(1),
  guardianId: z.string().optional(),
  fileBase64: z.string().min(10),
  filename: z.string().min(1).max(255),
  claimedMimeType: z.string().optional(),
  changeReason: z.string().max(500).optional(),
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

const rejectBodySchema = z.object({
  reason: z.string().min(3).max(500),
  notes: z.string().max(500).optional(),
});

const verifyBodySchema = z.object({
  notes: z.string().max(500).optional(),
});

export const studentDocumentRoutes: FastifyPluginAsync = async (app) => {
  // 1. List configurable document types
  app.get(
    "/document-types",
    {
      preHandler: authenticateApiRequest,
      schema: documentTypesListSchema,
    },
    async (request) => {
      const user = requireApiUser(request);
      const types = await listDocumentTypes(user);
      return {
        data: {
          documentTypes: types.map((t) => ({
            id: t.id,
            code: t.code,
            name: t.name,
            description: t.description,
            category: t.category,
            requirementType: t.requirementType,
            appliesTo: t.appliesTo,
            allowedFileTypes: t.allowedFileTypes,
            maxFileSizeBytes: t.maxFileSizeBytes,
            requiresVerification: t.requiresVerification,
            expiryEnabled: t.expiryEnabled,
            isSensitive: t.isSensitive,
            status: t.status,
          })),
        },
        meta: { requestId: request.id },
      };
    },
  );

  // 2. Centralized Student Document Summary & Checklist
  app.get<{ Params: { studentId: string } }>(
    "/students/:studentId/documents/summary",
    {
      preHandler: authenticateApiRequest,
      schema: studentDocumentSummarySchema,
    },
    async (request) => {
      const user = requireApiUser(request);
      const { studentId } = studentParamsSchema.parse(request.params);
      const summary = await calculateStudentDocumentSummary(user, studentId);
      return {
        data: summary,
        meta: { requestId: request.id },
      };
    },
  );

  // 3. List student documents with version history
  app.get<{ Params: { studentId: string } }>(
    "/students/:studentId/documents/detailed",
    {
      preHandler: authenticateApiRequest,
      schema: studentDocumentsListDetailedSchema,
    },
    async (request) => {
      const user = requireApiPermission(request, "documents:read");
      const { studentId } = studentParamsSchema.parse(request.params);
      const docs = await listStudentDocumentsDetailed(user, studentId);
      return {
        data: {
          studentId,
          documents: docs.map((d) => ({
            id: d.id,
            studentId: d.studentId,
            guardianId: d.guardianId,
            documentTypeId: d.documentTypeId,
            status: d.status,
            verificationStatus: d.verificationStatus,
            verifiedBy: d.verifiedBy,
            verifiedAt: d.verifiedAt ? new Date(d.verifiedAt).toISOString() : null,
            rejectionReason: d.rejectionReason,
            verificationNotes: d.verificationNotes,
            issuedAt: d.issuedAt ? new Date(d.issuedAt).toISOString() : null,
            expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : null,
            expiryStatus: d.expiryStatus,
            isSensitive: d.isSensitive,
            createdAt: new Date(d.createdAt).toISOString(),
            docTypeName: d.docTypeName,
            docTypeCode: d.docTypeCode,
            docTypeCategory: d.docTypeCategory,
            docTypeRequirement: d.docTypeRequirement,
            docTypeAllowedTypes: d.docTypeAllowedTypes,
            docTypeRequiresVerification: d.docTypeRequiresVerification,
            docTypeExpiryEnabled: d.docTypeExpiryEnabled,
            currentVersion: d.currentVersion
              ? {
                  ...d.currentVersion,
                  createdAt: new Date(d.currentVersion.createdAt).toISOString(),
                }
              : null,
          })),
        },
        meta: { requestId: request.id },
      };
    },
  );

  // 4. Upload student document
  app.post<{ Params: { studentId: string } }>(
    "/students/:studentId/documents/upload",
    {
      preHandler: [authenticateApiRequest, requireApiCsrf],
      schema: studentDocumentUploadSchema,
    },
    async (request, reply) => {
      const user = requireApiUser(request);
      const { studentId } = studentParamsSchema.parse(request.params);
      const body = uploadBodySchema.parse(request.body);

      // Clean base64 prefix if present (e.g. data:image/png;base64,...)
      const rawBase64 = body.fileBase64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(rawBase64, "base64");

      const result = await uploadStudentDocument(user, studentId, {
        documentTypeId: body.documentTypeId,
        guardianId: body.guardianId,
        fileBuffer: buffer,
        originalFilename: body.filename,
        claimedMimeType: body.claimedMimeType,
        changeReason: body.changeReason,
        issuedAt: body.issuedAt ? new Date(body.issuedAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      });

      return reply.code(201).send({
        data: {
          documentId: result.document.id,
          versionId: result.version.id,
          versionNumber: result.version.versionNumber,
          status: result.document.status,
          verificationStatus: result.document.verificationStatus,
          fileHash: result.version.fileHash,
          fileSizeBytes: result.version.fileSizeBytes,
        },
        meta: { requestId: request.id },
      });
    },
  );

  // 5. Get document details & versions
  app.get<{ Params: { documentId: string } }>(
    "/documents/:documentId/versions",
    {
      preHandler: authenticateApiRequest,
    },
    async (request) => {
      const user = requireApiPermission(request, "documents:read");
      const { documentId } = documentParamsSchema.parse(request.params);
      const result = await getStudentDocumentById(user, documentId);
      return {
        data: {
          document: result.document,
          documentType: result.documentType,
          versions: result.versions.map((v) => ({
            id: v.id,
            versionNumber: v.versionNumber,
            originalFilename: v.originalFilename,
            mimeType: v.mimeType,
            fileSizeBytes: v.fileSizeBytes,
            fileHash: v.fileHash,
            scanStatus: v.scanStatus,
            verificationStatus: v.verificationStatus,
            changeReason: v.changeReason,
            uploadedBy: v.uploadedBy,
            createdAt: v.createdAt,
            status: v.status,
          })),
        },
        meta: { requestId: request.id },
      };
    },
  );

  // 6. Generate access token for secure preview / download
  app.get<{ Params: { documentId: string }; Querystring: { disposition?: "inline" | "attachment" } }>(
    "/documents/:documentId/token",
    {
      preHandler: authenticateApiRequest,
      schema: documentTokenSchema,
    },
    async (request) => {
      const user = requireApiUser(request);
      const { documentId } = documentParamsSchema.parse(request.params);
      const disposition = request.query?.disposition === "attachment" ? "attachment" : "inline";

      const tokenResult = await generateDocumentAccessToken(user, documentId, disposition);
      return {
        data: {
          accessToken: tokenResult.accessToken,
          expiresAt: tokenResult.expiresAt.toISOString(),
          filename: tokenResult.filename,
          mimeType: tokenResult.mimeType,
          fileSizeBytes: tokenResult.fileSizeBytes,
        },
        meta: { requestId: request.id },
      };
    },
  );

  // 7. Verify document
  app.post<{ Params: { documentId: string } }>(
    "/documents/:documentId/verify",
    {
      preHandler: [authenticateApiRequest, requireApiCsrf],
      schema: documentVerifySchema,
    },
    async (request) => {
      const user = requireApiPermission(request, "documents:verify");
      const { documentId } = documentParamsSchema.parse(request.params);
      const body = verifyBodySchema.parse(request.body ?? {});

      const updated = await verifyStudentDocument(user, documentId, body.notes);
      return {
        data: {
          id: updated.id,
          status: updated.status,
          verificationStatus: updated.verificationStatus,
          verifiedAt: updated.verifiedAt ? new Date(updated.verifiedAt).toISOString() : new Date().toISOString(),
          notes: updated.verificationNotes,
        },
        meta: { requestId: request.id },
      };
    },
  );

  // 8. Reject document
  app.post<{ Params: { documentId: string } }>(
    "/documents/:documentId/reject",
    {
      preHandler: [authenticateApiRequest, requireApiCsrf],
      schema: documentRejectSchema,
    },
    async (request) => {
      const user = requireApiPermission(request, "documents:reject");
      const { documentId } = documentParamsSchema.parse(request.params);
      const body = rejectBodySchema.parse(request.body);

      const updated = await rejectStudentDocument(user, documentId, body.reason, body.notes);
      return {
        data: {
          id: updated.id,
          status: updated.status,
          verificationStatus: updated.verificationStatus,
          rejectionReason: updated.rejectionReason ?? body.reason,
          verifiedAt: updated.verifiedAt ? new Date(updated.verifiedAt).toISOString() : new Date().toISOString(),
        },
        meta: { requestId: request.id },
      };
    },
  );

  // 9. Soft-delete document
  app.delete<{ Params: { documentId: string } }>(
    "/documents/:documentId",
    {
      preHandler: [authenticateApiRequest, requireApiCsrf],
    },
    async (request) => {
      const user = requireApiPermission(request, "documents:delete");
      const { documentId } = documentParamsSchema.parse(request.params);
      const updated = await softDeleteStudentDocument(user, documentId);
      return {
        data: { id: updated.id, status: updated.status, deletedAt: updated.deletedAt },
        meta: { requestId: request.id },
      };
    },
  );

  // 10. Restore document
  app.post<{ Params: { documentId: string } }>(
    "/documents/:documentId/restore",
    {
      preHandler: [authenticateApiRequest, requireApiCsrf],
    },
    async (request) => {
      const user = requireApiPermission(request, "documents:restore");
      const { documentId } = documentParamsSchema.parse(request.params);
      const updated = await restoreStudentDocument(user, documentId);
      return {
        data: { id: updated.id, status: updated.status },
        meta: { requestId: request.id },
      };
    },
  );

  // 11. Secure streaming endpoint via signed token
  app.get<{ Params: { token: string } }>(
    "/documents/stream/:token",
    async (request, reply) => {
      const { token } = request.params;
      const storage = getDocumentStorage();
      const verification = await storage.verifySignedToken(token);

      if (!verification.valid || !verification.key) {
        throw new AppError("FORBIDDEN", "The document access link is invalid or has expired.", 403);
      }

      const fileBuffer = await storage.download(verification.key);
      const metadata = await storage.getMetadata(verification.key);

      const filename = verification.filename || "document";
      const disposition = verification.disposition === "attachment" ? "attachment" : "inline";

      // Strict security headers
      reply.header("Content-Type", metadata?.contentType || "application/octet-stream");
      reply.header("Content-Disposition", `${disposition}; filename="${encodeURIComponent(filename)}"`);
      reply.header("Cache-Control", "private, no-store, max-age=0, must-revalidate");
      reply.header("Pragma", "no-cache");
      reply.header("X-Content-Type-Options", "nosniff");
      reply.header("X-Frame-Options", "DENY");

      return reply.send(fileBuffer);
    },
  );
};
