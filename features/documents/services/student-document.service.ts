import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  documentTypes,
  studentDocuments,
  studentDocumentVersions,
  students,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import { getReadableStudent } from "@/features/students/services/students.service";
import { AppError } from "@/lib/errors/app-error";
import { hasPermission } from "@/lib/rbac/permissions";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { getDocumentStorage } from "@/lib/storage/storage-factory";
import { validateUploadedFile } from "./file-validator.service";
import { scanBufferForMalware } from "./malware-scanner.service";
import { optimizeDocumentBuffer } from "./file-optimizer.service";
import { ensureDefaultDocumentTypes } from "./document-requirements.service";

/**
 * Assert user has permission to view sensitive documents
 */
function assertSensitiveDocumentView(
  user: CurrentUser,
  docType: typeof documentTypes.$inferSelect,
  studentId: string,
) {
  if (docType.isSensitive || ["identity", "medical", "legal"].includes(docType.category)) {
    // If user is the linked student or parent of this student, access is allowed
    const isSelfOrParent =
      (user.role === "student" && user.linkedStudentId === studentId) ||
      (user.role === "parent" && user.linkedStudentIds?.includes(studentId));

    if (!isSelfOrParent) {
      if (docType.category === "medical" && !hasPermission(user, "health:view_sensitive") && !hasPermission(user, "documents:view_sensitive")) {
        throw new AppError("FORBIDDEN", "Medical document access requires sensitive health permission.", 403);
      }
      if (!hasPermission(user, "documents:view_sensitive") && !hasPermission(user, "students:view_sensitive")) {
        throw new AppError("FORBIDDEN", "Sensitive document access is restricted to authorized roles.", 403);
      }
    }
  }
}

/**
 * List all active student documents with version and type details
 */
export async function listStudentDocumentsDetailed(
  user: CurrentUser,
  studentId: string,
  includeDeleted = false,
) {
  const student = await getReadableStudent(user, studentId);
  await ensureDefaultDocumentTypes(user.organizationId);

  const filter = and(
    eq(studentDocuments.studentId, student.id),
    eq(studentDocuments.organizationId, user.organizationId),
    includeDeleted ? undefined : isNull(studentDocuments.deletedAt),
  );

  const docs = await getDb()
    .select({
      id: studentDocuments.id,
      studentId: studentDocuments.studentId,
      guardianId: studentDocuments.guardianId,
      documentTypeId: studentDocuments.documentTypeId,
      status: studentDocuments.status,
      verificationStatus: studentDocuments.verificationStatus,
      verifiedBy: studentDocuments.verifiedBy,
      verifiedAt: studentDocuments.verifiedAt,
      rejectionReason: studentDocuments.rejectionReason,
      verificationNotes: studentDocuments.verificationNotes,
      issuedAt: studentDocuments.issuedAt,
      expiresAt: studentDocuments.expiresAt,
      expiryStatus: studentDocuments.expiryStatus,
      isSensitive: studentDocuments.isSensitive,
      deletedAt: studentDocuments.deletedAt,
      deletedBy: studentDocuments.deletedBy,
      deletionReason: studentDocuments.deletionReason,
      createdAt: studentDocuments.createdAt,
      updatedAt: studentDocuments.updatedAt,
      // Document Type fields
      docTypeName: documentTypes.name,
      docTypeCode: documentTypes.code,
      docTypeCategory: documentTypes.category,
      docTypeRequirement: documentTypes.requirementType,
      docTypeAllowedTypes: documentTypes.allowedFileTypes,
      docTypeRequiresVerification: documentTypes.requiresVerification,
      docTypeExpiryEnabled: documentTypes.expiryEnabled,
      // Current Version fields
      currentVersionId: studentDocuments.currentVersionId,
    })
    .from(studentDocuments)
    .innerJoin(
      documentTypes,
      eq(documentTypes.id, studentDocuments.documentTypeId),
    )
    .where(filter)
    .orderBy(desc(studentDocuments.createdAt));

  // Retrieve current version records
  const versionIds = docs
    .map((d) => d.currentVersionId)
    .filter((id): id is string => Boolean(id));

  let versionMap = new Map<string, typeof studentDocumentVersions.$inferSelect>();
  if (versionIds.length > 0) {
    const versions = await getDb()
      .select()
      .from(studentDocumentVersions)
      .where(inArray(studentDocumentVersions.id, versionIds));
    for (const v of versions) {
      versionMap.set(v.id, v);
    }
  }

  return docs.map((doc) => {
    const currentVersion = doc.currentVersionId
      ? versionMap.get(doc.currentVersionId) ?? null
      : null;

    return {
      ...doc,
      currentVersion: currentVersion
        ? {
            id: currentVersion.id,
            versionNumber: currentVersion.versionNumber,
            originalFilename: currentVersion.originalFilename,
            sanitizedFilename: currentVersion.sanitizedFilename,
            mimeType: currentVersion.mimeType,
            fileExtension: currentVersion.fileExtension,
            fileSizeBytes: currentVersion.fileSizeBytes,
            fileHash: currentVersion.fileHash,
            scanStatus: currentVersion.scanStatus,
            verificationStatus: currentVersion.verificationStatus,
            uploadedBy: currentVersion.uploadedBy,
            createdAt: currentVersion.createdAt,
          }
        : null,
    };
  });
}

export type UploadStudentDocumentInput = {
  documentTypeId: string;
  guardianId?: string;
  fileBuffer: Buffer;
  originalFilename: string;
  claimedMimeType?: string;
  changeReason?: string;
  issuedAt?: Date;
  expiresAt?: Date;
};

/**
 * Upload a student document with validation, malware scan, hashing, and versioning
 */
export async function uploadStudentDocument(
  user: CurrentUser,
  studentId: string,
  input: UploadStudentDocumentInput,
) {
  const student = await getReadableStudent(user, studentId);

  // Check upload permission
  const isSelfOrParent =
    (user.role === "student" && user.linkedStudentId === studentId) ||
    (user.role === "parent" && user.linkedStudentIds?.includes(studentId));

  if (!hasPermission(user, "documents:create") && !isSelfOrParent) {
    throw new AppError("FORBIDDEN", "Document upload permission is required.", 403);
  }

  // Resolve document type
  const docType = await getDb().query.documentTypes.findFirst({
    where: and(
      eq(documentTypes.id, input.documentTypeId),
      eq(documentTypes.organizationId, user.organizationId),
      eq(documentTypes.status, "active"),
    ),
  });

  if (!docType) {
    throw new AppError("NOT_FOUND", "Document type not found or inactive.", 404);
  }

  // Assert sensitive permission
  assertSensitiveDocumentView(user, docType, student.id);

  // 1. File Validation & Magic Bytes
  const allowedTypes = docType.allowedFileTypes.split(",").map((t) => t.trim());
  const validation = validateUploadedFile(
    input.fileBuffer,
    input.originalFilename,
    input.claimedMimeType,
    {
      allowedTypes,
      maxSizeBytes: docType.maxFileSizeBytes,
    },
  );

  // 2. Malware Scanning
  const scanResult = await scanBufferForMalware(input.fileBuffer);
  if (scanResult.status === "infected") {
    // Write security audit log and immediately reject
    await writeAuditLog(user, {
      action: "malware_detected",
      module: "documents",
      entityType: "student_document",
      entityId: student.id,
      campusId: student.campusId ?? undefined,
      metadata: {
        filename: validation.sanitizedFilename,
        hash: validation.fileHash,
        scannerDetails: scanResult.details,
      },
    });

    throw new AppError(
      "MALWARE_DETECTED",
      "Upload rejected: The file triggered malware/security heuristic detection.",
      422,
    );
  }

  // 3. Document Optimization (preserves original)
  const optimization = await optimizeDocumentBuffer(input.fileBuffer, validation.mimeType);

  // 4. Secure Storage
  const storage = getDocumentStorage();
  const storageKey = `org_${user.organizationId}/students/${student.id}/docs/${docType.code}_${Date.now()}_${validation.sanitizedFilename}`;

  await storage.upload(storageKey, input.fileBuffer, {
    contentType: validation.mimeType,
    originalFilename: validation.sanitizedFilename,
  });

  let optimizedStorageKey: string | undefined;
  if (optimization.isOptimized && optimization.optimizedBuffer) {
    optimizedStorageKey = `org_${user.organizationId}/students/${student.id}/docs/opt_${docType.code}_${Date.now()}_${validation.sanitizedFilename}`;
    await storage.upload(optimizedStorageKey, optimization.optimizedBuffer, {
      contentType: validation.mimeType,
      originalFilename: validation.sanitizedFilename,
    });
  }

  // 5. Database Persistence with Versioning
  const result = await getDb().transaction(async (tx) => {
    // Check if a document record already exists for this (student, documentType)
    const existingDoc = await tx.query.studentDocuments.findFirst({
      where: and(
        eq(studentDocuments.studentId, student.id),
        eq(studentDocuments.documentTypeId, docType.id),
        eq(studentDocuments.organizationId, user.organizationId),
      ),
    });

    let docRecord = existingDoc;
    let nextVersionNumber = 1;

    if (!docRecord) {
      const [insertedDoc] = await tx
        .insert(studentDocuments)
        .values({
          organizationId: user.organizationId,
          campusId: student.campusId,
          studentId: student.id,
          guardianId: input.guardianId,
          documentTypeId: docType.id,
          status: "pending_verification",
          verificationStatus: "pending",
          issuedAt: input.issuedAt,
          expiresAt: input.expiresAt,
          isSensitive: docType.isSensitive,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning();
      docRecord = insertedDoc;
    } else {
      // Find latest version number
      const prevVersions = await tx
        .select({ versionNumber: studentDocumentVersions.versionNumber })
        .from(studentDocumentVersions)
        .where(eq(studentDocumentVersions.studentDocumentId, docRecord.id))
        .orderBy(desc(studentDocumentVersions.versionNumber))
        .limit(1);

      nextVersionNumber = (prevVersions[0]?.versionNumber ?? 0) + 1;

      // Mark older active versions as superseded
      await tx
        .update(studentDocumentVersions)
        .set({ status: "superseded", updatedAt: new Date(), updatedBy: user.id })
        .where(
          and(
            eq(studentDocumentVersions.studentDocumentId, docRecord.id),
            eq(studentDocumentVersions.status, "active"),
          ),
        );
    }

    // Insert new version
    const [newVersion] = await tx
      .insert(studentDocumentVersions)
      .values({
        organizationId: user.organizationId,
        campusId: student.campusId,
        studentDocumentId: docRecord.id,
        versionNumber: nextVersionNumber,
        storageKey,
        storageProvider: "private_disk",
        originalFilename: validation.sanitizedFilename,
        sanitizedFilename: validation.sanitizedFilename,
        mimeType: validation.mimeType,
        fileExtension: validation.fileExtension,
        fileSizeBytes: validation.fileSizeBytes,
        fileHash: validation.fileHash,
        isOptimized: optimization.isOptimized,
        optimizedStorageKey,
        optimizedSizeBytes: optimization.optimizedSizeBytes,
        scanStatus: scanResult.status,
        scannedAt: scanResult.scannedAt,
        scanner: scanResult.scanner,
        scannerVersion: scanResult.scannerVersion,
        scanResult: scanResult.details,
        verificationStatus: "pending",
        changeReason: input.changeReason || (nextVersionNumber > 1 ? "New version uploaded" : "Initial upload"),
        uploadedBy: user.id,
        createdBy: user.id,
        updatedBy: user.id,
        status: "active",
      })
      .returning();

    // Update document record current version and reset verification state
    const [updatedDoc] = await tx
      .update(studentDocuments)
      .set({
        currentVersionId: newVersion.id,
        status: "pending_verification",
        verificationStatus: "pending",
        rejectionReason: null,
        issuedAt: input.issuedAt ?? docRecord.issuedAt,
        expiresAt: input.expiresAt ?? docRecord.expiresAt,
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(studentDocuments.id, docRecord.id))
      .returning();

    return {
      document: updatedDoc,
      version: newVersion,
    };
  });

  // 6. Write Audit Log
  await writeAuditLog(user, {
    action: result.version.versionNumber > 1 ? "replace" : "upload",
    module: "documents",
    entityType: "student_document",
    entityId: result.document.id,
    campusId: student.campusId ?? undefined,
    after: {
      studentId: student.id,
      documentTypeId: docType.id,
      documentName: docType.name,
      versionNumber: result.version.versionNumber,
      fileHash: validation.fileHash,
      fileSize: validation.fileSizeBytes,
    },
  });

  return result;
}

/**
 * Get document details and verify permissions
 */
export async function getStudentDocumentById(user: CurrentUser, documentId: string) {
  const doc = await getDb().query.studentDocuments.findFirst({
    where: and(
      eq(studentDocuments.id, documentId),
      eq(studentDocuments.organizationId, user.organizationId),
    ),
  });

  if (!doc) throw new AppError("NOT_FOUND", "Document not found.", 404);

  // Assert student scope
  const student = await getReadableStudent(user, doc.studentId);

  const docType = await getDb().query.documentTypes.findFirst({
    where: eq(documentTypes.id, doc.documentTypeId),
  });

  if (docType) {
    assertSensitiveDocumentView(user, docType, student.id);
  }

  const versions = await getDb()
    .select()
    .from(studentDocumentVersions)
    .where(eq(studentDocumentVersions.studentDocumentId, doc.id))
    .orderBy(desc(studentDocumentVersions.versionNumber));

  return {
    document: doc,
    documentType: docType,
    versions,
  };
}

/**
 * Generate secure temporary access token for preview or download
 */
export async function generateDocumentAccessToken(
  user: CurrentUser,
  documentId: string,
  disposition: "inline" | "attachment" = "inline",
) {
  const { document: doc, documentType: docType, versions } = await getStudentDocumentById(user, documentId);

  if (disposition === "attachment" && !hasPermission(user, "documents:download")) {
    const isSelfOrParent =
      (user.role === "student" && user.linkedStudentId === doc.studentId) ||
      (user.role === "parent" && user.linkedStudentIds?.includes(doc.studentId));
    if (!isSelfOrParent) {
      throw new AppError("FORBIDDEN", "Download permission is required.", 403);
    }
  }

  if (doc.status === "deleted" && !hasPermission(user, "documents:delete")) {
    throw new AppError("FORBIDDEN", "Deleted documents cannot be accessed.", 403);
  }

  const currentVersion = versions.find((v) => v.id === doc.currentVersionId) ?? versions[0];
  if (!currentVersion) {
    throw new AppError("NOT_FOUND", "Document file version not found.", 404);
  }

  if (currentVersion.scanStatus === "infected") {
    throw new AppError("SECURITY_ERROR", "Access blocked: This document was quarantined due to detected malware.", 403);
  }

  const storage = getDocumentStorage();
  const signed = await storage.generateSignedToken(currentVersion.storageKey, {
    expiresInSeconds: 900, // 15 minutes
    disposition,
    downloadFilename: currentVersion.originalFilename,
    contentType: currentVersion.mimeType,
  });

  // Audit view/download
  await writeAuditLog(user, {
    action: disposition === "attachment" ? "download" : "view",
    module: "documents",
    entityType: "student_document",
    entityId: doc.id,
    campusId: doc.campusId ?? undefined,
    metadata: {
      versionNumber: currentVersion.versionNumber,
      filename: currentVersion.originalFilename,
    },
  });

  return {
    accessToken: signed.token,
    expiresAt: signed.expiresAt,
    filename: currentVersion.originalFilename,
    mimeType: currentVersion.mimeType,
    fileSizeBytes: currentVersion.fileSizeBytes,
  };
}

/**
 * Verify a student document
 */
export async function verifyStudentDocument(
  user: CurrentUser,
  documentId: string,
  notes?: string,
) {
  if (!hasPermission(user, "documents:verify") && !hasPermission(user, "documents:approve")) {
    throw new AppError("FORBIDDEN", "Document verification permission is required.", 403);
  }

  const { document: doc } = await getStudentDocumentById(user, documentId);

  const [updatedDoc] = await getDb()
    .update(studentDocuments)
    .set({
      verificationStatus: "verified",
      status: "verified",
      verifiedBy: user.id,
      verifiedAt: new Date(),
      rejectionReason: null,
      verificationNotes: notes || null,
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(studentDocuments.id, doc.id))
    .returning();

  if (doc.currentVersionId) {
    await getDb()
      .update(studentDocumentVersions)
      .set({
        verificationStatus: "verified",
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(studentDocumentVersions.id, doc.currentVersionId));
  }

  await writeAuditLog(user, {
    action: "verify",
    module: "documents",
    entityType: "student_document",
    entityId: doc.id,
    campusId: doc.campusId ?? undefined,
    after: {
      status: "verified",
      verificationStatus: "verified",
      notes,
    },
  });

  return updatedDoc;
}

/**
 * Reject a student document with mandatory reason
 */
export async function rejectStudentDocument(
  user: CurrentUser,
  documentId: string,
  rejectionReason: string,
  notes?: string,
) {
  if (!hasPermission(user, "documents:reject") && !hasPermission(user, "documents:verify")) {
    throw new AppError("FORBIDDEN", "Document rejection permission is required.", 403);
  }

  if (!rejectionReason || !rejectionReason.trim()) {
    throw new AppError("VALIDATION_ERROR", "A rejection reason is required.", 422);
  }

  const { document: doc } = await getStudentDocumentById(user, documentId);

  const [updatedDoc] = await getDb()
    .update(studentDocuments)
    .set({
      verificationStatus: "rejected",
      status: "rejected",
      rejectionReason: rejectionReason.trim(),
      verificationNotes: notes || null,
      verifiedBy: user.id,
      verifiedAt: new Date(),
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(studentDocuments.id, doc.id))
    .returning();

  if (doc.currentVersionId) {
    await getDb()
      .update(studentDocumentVersions)
      .set({
        verificationStatus: "rejected",
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(studentDocumentVersions.id, doc.currentVersionId));
  }

  await writeAuditLog(user, {
    action: "reject",
    module: "documents",
    entityType: "student_document",
    entityId: doc.id,
    campusId: doc.campusId ?? undefined,
    after: {
      status: "rejected",
      verificationStatus: "rejected",
      rejectionReason: rejectionReason.trim(),
      notes,
    },
  });

  return updatedDoc;
}

/**
 * Soft-delete a student document
 */
export async function softDeleteStudentDocument(
  user: CurrentUser,
  documentId: string,
  deletionReason?: string,
) {
  if (!hasPermission(user, "documents:delete")) {
    throw new AppError("FORBIDDEN", "Document deletion permission is required.", 403);
  }

  const { document: doc } = await getStudentDocumentById(user, documentId);

  const [updatedDoc] = await getDb()
    .update(studentDocuments)
    .set({
      status: "deleted",
      deletedAt: new Date(),
      deletedBy: user.id,
      deletionReason: deletionReason || "Deleted by administrator",
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(studentDocuments.id, doc.id))
    .returning();

  await writeAuditLog(user, {
    action: "delete",
    module: "documents",
    entityType: "student_document",
    entityId: doc.id,
    campusId: doc.campusId ?? undefined,
    metadata: { deletionReason },
  });

  return updatedDoc;
}

/**
 * Restore a soft-deleted student document
 */
export async function restoreStudentDocument(user: CurrentUser, documentId: string) {
  if (!hasPermission(user, "documents:restore") && !hasPermission(user, "documents:delete")) {
    throw new AppError("FORBIDDEN", "Document restoration permission is required.", 403);
  }

  const { document: doc } = await getStudentDocumentById(user, documentId);

  const [updatedDoc] = await getDb()
    .update(studentDocuments)
    .set({
      status: doc.verificationStatus === "verified" ? "verified" : "pending_verification",
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(studentDocuments.id, doc.id))
    .returning();

  await writeAuditLog(user, {
    action: "restore",
    module: "documents",
    entityType: "student_document",
    entityId: doc.id,
    campusId: doc.campusId ?? undefined,
  });

  return updatedDoc;
}
