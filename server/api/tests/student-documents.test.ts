import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "../../../lib/auth/types";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  getFirebaseAdminAuth: vi.fn(),
  getUserByFirebaseUid: vi.fn(),
  writeAuditLog: vi.fn(),
  listDocumentTypes: vi.fn(),
  calculateStudentDocumentSummary: vi.fn(),
  listStudentDocumentsDetailed: vi.fn(),
  uploadStudentDocument: vi.fn(),
  getStudentDocumentById: vi.fn(),
  generateDocumentAccessToken: vi.fn(),
  verifyStudentDocument: vi.fn(),
  rejectStudentDocument: vi.fn(),
  softDeleteStudentDocument: vi.fn(),
  restoreStudentDocument: vi.fn(),
  storageVerifySignedToken: vi.fn(),
  storageDownload: vi.fn(),
  storageGetMetadata: vi.fn(),
}));

vi.mock("../../../lib/auth/firebase-admin-core", () => ({
  getFirebaseAdminAuth: mocks.getFirebaseAdminAuth,
}));
vi.mock("../../../lib/auth/user-context", () => ({
  getUserByFirebaseUid: mocks.getUserByFirebaseUid,
}));
vi.mock("../../../lib/audit/audit-log", () => ({
  writeAuditLog: mocks.writeAuditLog,
}));
vi.mock("../../../features/documents/services/document-requirements.service", () => ({
  listDocumentTypes: mocks.listDocumentTypes,
  calculateStudentDocumentSummary: mocks.calculateStudentDocumentSummary,
}));
vi.mock("../../../features/documents/services/student-document.service", () => ({
  listStudentDocumentsDetailed: mocks.listStudentDocumentsDetailed,
  uploadStudentDocument: mocks.uploadStudentDocument,
  getStudentDocumentById: mocks.getStudentDocumentById,
  generateDocumentAccessToken: mocks.generateDocumentAccessToken,
  verifyStudentDocument: mocks.verifyStudentDocument,
  rejectStudentDocument: mocks.rejectStudentDocument,
  softDeleteStudentDocument: mocks.softDeleteStudentDocument,
  restoreStudentDocument: mocks.restoreStudentDocument,
}));
vi.mock("../../../lib/storage/storage-factory", () => ({
  getDocumentStorage: () => ({
    verifySignedToken: mocks.storageVerifySignedToken,
    download: mocks.storageDownload,
    getMetadata: mocks.storageGetMetadata,
  }),
}));

import { buildApi } from "../app";

const staffUser: CurrentUser = {
  id: "staff-1",
  firebaseUid: "firebase-staff-1",
  email: "staff@example.com",
  displayName: "Principal",
  role: "principal",
  organizationId: "org-1",
  campusId: "campus-1",
  campusIds: ["campus-1"],
  emailVerified: true,
  permissions: [
    "documents:read",
    "documents:create",
    "documents:verify",
    "documents:reject",
    "documents:delete",
    "documents:restore",
    "documents:download",
  ],
};

describe("Student Document Management API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFirebaseAdminAuth.mockReturnValue({
      verifyIdToken: mocks.verifyIdToken,
    });
    mocks.verifyIdToken.mockResolvedValue({
      uid: "firebase-staff-1",
      email_verified: true,
    });
    mocks.getUserByFirebaseUid.mockResolvedValue(staffUser);

    mocks.listDocumentTypes.mockResolvedValue([
      {
        id: "doctype-1",
        code: "BIRTH_CERTIFICATE",
        name: "Birth Certificate",
        description: "Official municipal birth certificate",
        category: "identity",
        requirementType: "required",
        appliesTo: "all",
        allowedFileTypes: "pdf,jpg,jpeg,png,webp",
        maxFileSizeBytes: 15728640,
        requiresVerification: true,
        expiryEnabled: false,
        isSensitive: true,
        status: "active",
      },
    ]);

    mocks.calculateStudentDocumentSummary.mockResolvedValue({
      totalRequired: 4,
      completedRequired: 3,
      completionPercentage: 75.0,
      isComplete: false,
      missingDocuments: [
        {
          documentTypeId: "doctype-4",
          code: "TRANSFER_CERTIFICATE",
          name: "Transfer Certificate",
          category: "academic",
          requirementType: "required",
        },
      ],
      pendingVerification: [],
      expiredDocuments: [],
      warnings: ["Missing required document: Transfer Certificate"],
      requirements: [
        {
          documentTypeId: "doctype-1",
          code: "BIRTH_CERTIFICATE",
          name: "Birth Certificate",
          category: "identity",
          requirementType: "required",
          isApplicable: true,
          status: "verified",
          documentId: "doc-1",
        },
      ],
    });

    mocks.listStudentDocumentsDetailed.mockResolvedValue([
      {
        id: "doc-1",
        studentId: "student-1",
        guardianId: null,
        documentTypeId: "doctype-1",
        status: "active",
        verificationStatus: "verified",
        verifiedBy: "staff-1",
        verifiedAt: new Date("2026-08-10T10:00:00.000Z"),
        rejectionReason: null,
        verificationNotes: "Registry copy matched",
        issuedAt: null,
        expiresAt: null,
        expiryStatus: null,
        isSensitive: true,
        createdAt: new Date("2026-08-09T10:00:00.000Z"),
        docTypeName: "Birth Certificate",
        docTypeCode: "BIRTH_CERTIFICATE",
        docTypeCategory: "identity",
        docTypeRequirement: "required",
        docTypeAllowedTypes: "pdf,jpg,jpeg,png,webp",
        docTypeRequiresVerification: true,
        docTypeExpiryEnabled: false,
        currentVersion: {
          id: "ver-1",
          versionNumber: 1,
          originalFilename: "birth_cert.pdf",
          sanitizedFilename: "birth_cert.pdf",
          mimeType: "application/pdf",
          fileExtension: "pdf",
          fileSizeBytes: 204800,
          fileHash: "sha256hash123",
          scanStatus: "clean",
          verificationStatus: "verified",
          uploadedBy: "staff-1",
          createdAt: new Date("2026-08-09T10:00:00.000Z"),
        },
      },
    ]);
  });

  it("lists configurable document types", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/document-types",
      headers: { authorization: "Bearer token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        documentTypes: [
          expect.objectContaining({
            code: "BIRTH_CERTIFICATE",
            category: "identity",
            requiresVerification: true,
          }),
        ],
      },
    });
    await app.close();
  });

  it("calculates document completion summary and checklist for a student", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/students/student-1/documents/summary",
      headers: { authorization: "Bearer token" },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.data.totalRequired).toBe(4);
    expect(json.data.completedRequired).toBe(3);
    expect(json.data.completionPercentage).toBe(75.0);
    expect(json.data.missingDocuments[0].code).toBe("TRANSFER_CERTIFICATE");
    await app.close();
  });

  it("lists detailed student documents with current version info", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/students/student-1/documents/detailed",
      headers: { authorization: "Bearer token" },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.data.studentId).toBe("student-1");
    expect(json.data.documents[0].verificationStatus).toBe("verified");
    expect(json.data.documents[0].currentVersion.fileHash).toBe("sha256hash123");
    await app.close();
  });

  it("uploads a student document and validates parameters", async () => {
    mocks.uploadStudentDocument.mockResolvedValue({
      document: {
        id: "doc-new-1",
        status: "active",
        verificationStatus: "pending",
      },
      version: {
        id: "ver-new-1",
        versionNumber: 1,
        fileHash: "sha256new123",
        fileSizeBytes: 1024,
      },
    });

    const app = await buildApi({ logger: false, documentation: false });
    const dummyBase64 = Buffer.from("%PDF-1.4 test document").toString("base64");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/students/student-1/documents/upload",
      headers: {
        authorization: "Bearer token",
        "content-type": "application/json",
      },
      payload: {
        documentTypeId: "doctype-1",
        filename: "test_doc.pdf",
        fileBase64: dummyBase64,
        claimedMimeType: "application/pdf",
        changeReason: "Initial enrollment submission",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      data: {
        documentId: "doc-new-1",
        versionId: "ver-new-1",
        status: "active",
        verificationStatus: "pending",
      },
    });
    expect(mocks.uploadStudentDocument).toHaveBeenCalledWith(
      staffUser,
      "student-1",
      expect.objectContaining({
        documentTypeId: "doctype-1",
        originalFilename: "test_doc.pdf",
      }),
    );
    await app.close();
  });

  it("verifies an uploaded document", async () => {
    mocks.verifyStudentDocument.mockResolvedValue({
      id: "doc-1",
      status: "active",
      verificationStatus: "verified",
      verifiedAt: new Date("2026-08-10T12:00:00.000Z"),
      verificationNotes: "Approved by Principal",
    });

    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/documents/doc-1/verify",
      headers: {
        authorization: "Bearer token",
        "content-type": "application/json",
      },
      payload: { notes: "Approved by Principal" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        id: "doc-1",
        status: "active",
        verificationStatus: "verified",
        notes: "Approved by Principal",
      },
    });
    expect(mocks.verifyStudentDocument).toHaveBeenCalledWith(
      staffUser,
      "doc-1",
      "Approved by Principal",
    );
    await app.close();
  });

  it("rejects an uploaded document with required reason", async () => {
    mocks.rejectStudentDocument.mockResolvedValue({
      id: "doc-1",
      status: "active",
      verificationStatus: "rejected",
      rejectionReason: "Blurry scan",
      verifiedAt: new Date("2026-08-10T12:00:00.000Z"),
    });

    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/documents/doc-1/reject",
      headers: {
        authorization: "Bearer token",
        "content-type": "application/json",
      },
      payload: { reason: "Blurry scan" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        id: "doc-1",
        verificationStatus: "rejected",
        rejectionReason: "Blurry scan",
      },
    });
    expect(mocks.rejectStudentDocument).toHaveBeenCalledWith(
      staffUser,
      "doc-1",
      "Blurry scan",
      undefined,
    );
    await app.close();
  });

  it("generates a short-lived access token for document preview", async () => {
    mocks.generateDocumentAccessToken.mockResolvedValue({
      accessToken: "signed-token-abc",
      expiresAt: new Date("2026-08-10T12:15:00.000Z"),
      filename: "birth_cert.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 204800,
    });

    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/documents/doc-1/token?disposition=inline",
      headers: { authorization: "Bearer token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        accessToken: "signed-token-abc",
        filename: "birth_cert.pdf",
        mimeType: "application/pdf",
      },
    });
    await app.close();
  });

  it("streams the document file when a valid token is provided", async () => {
    const dummyContent = Buffer.from("%PDF-1.4 file content");
    mocks.storageVerifySignedToken.mockResolvedValue({
      valid: true,
      key: "org-1/student-1/file.pdf",
      filename: "file.pdf",
      disposition: "inline",
    });
    mocks.storageDownload.mockResolvedValue(dummyContent);
    mocks.storageGetMetadata.mockResolvedValue({
      contentType: "application/pdf",
      sizeBytes: dummyContent.length,
    });

    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/documents/stream/signed-token-abc",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.headers["cache-control"]).toBe(
      "private, no-store, max-age=0, must-revalidate",
    );
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.rawPayload.toString()).toBe(dummyContent.toString());
    await app.close();
  });
});
