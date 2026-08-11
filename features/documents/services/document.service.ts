import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { documentFiles } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import { getReadableStudent } from "@/features/students/services/students.service";
import { AppError } from "@/lib/errors/app-error";
import { hasPermission } from "@/lib/rbac/permissions";
import { isAllowedUpload } from "@/lib/cloudinary/policy";
import {
  getSignedUploadParams,
  verifyCloudinaryAsset,
} from "@/lib/cloudinary/server";
import { assertDocumentEntityScope } from "./document-scope.service";

export const uploadEntityTypes = [
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

export const uploadRequestSchema = z.object({
  entityType: z.enum(uploadEntityTypes),
  entityId: z.string().regex(/^[a-zA-Z0-9_-]{1,160}$/),
  resourceType: z.enum(["image", "raw", "video"]).default("raw"),
  format: z.string().trim().max(20).optional(),
  bytes: z.number().int().positive().optional(),
});

export const documentMetadataSchema = z.object({
  entityType: z.enum(uploadEntityTypes),
  entityId: z.string().regex(/^[a-zA-Z0-9_-]{1,160}$/),
  category: z.string().trim().min(1).max(80),
  publicId: z.string().trim().min(1).max(500),
  secureUrl: z
    .string()
    .url()
    .refine(
      (url) => new URL(url).hostname === "res.cloudinary.com",
      "File must be hosted by Cloudinary.",
    ),
  resourceType: z.enum(["image", "raw", "video"]),
  format: z.string().trim().max(20).optional(),
  bytes: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  version: z.number().int().positive().optional(),
  originalFilename: z.string().trim().max(255).optional(),
});

export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;
export type DocumentMetadataInput = z.infer<typeof documentMetadataSchema>;

function assertSensitiveDocumentPermission(
  user: CurrentUser,
  entityType: UploadRequestInput["entityType"],
) {
  if (
    entityType === "health_record" &&
    !hasPermission(user, "health:view_sensitive")
  ) {
    throw new AppError(
      "FORBIDDEN",
      "Sensitive health document access is required.",
      403,
    );
  }
}

export async function createDocumentUploadSignature(
  user: CurrentUser,
  input: UploadRequestInput,
) {
  assertSensitiveDocumentPermission(user, input.entityType);
  if (!isAllowedUpload(input))
    throw new AppError(
      "VALIDATION_ERROR",
      "This file type or size is not allowed.",
      422,
    );
  await assertDocumentEntityScope(user, input.entityType, input.entityId);
  return getSignedUploadParams(
    user.organizationId,
    input.entityType,
    input.entityId,
    input.resourceType,
  );
}

export async function saveDocumentMetadata(
  user: CurrentUser,
  input: DocumentMetadataInput,
) {
  assertSensitiveDocumentPermission(user, input.entityType);
  const expectedPrefix = `school-erp/${user.organizationId}/${input.entityType}/${input.entityId}/`;
  if (!input.publicId.startsWith(expectedPrefix))
    throw new AppError(
      "TENANT_SCOPE_ERROR",
      "The upload does not belong to this organization and record.",
      403,
    );
  await assertDocumentEntityScope(user, input.entityType, input.entityId);
  const asset = await verifyCloudinaryAsset({
    publicId: input.publicId,
    resourceType: input.resourceType,
    secureUrl: input.secureUrl,
    version: input.version,
  });
  if (
    !isAllowedUpload({
      resourceType: asset.resource_type,
      format: asset.format,
      bytes: asset.bytes,
    })
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "The verified file type or size is not allowed.",
      422,
    );
  }
  const [row] = await getDb()
    .insert(documentFiles)
    .values({
      organizationId: user.organizationId,
      campusId: user.campusId,
      entityType: input.entityType,
      entityId: input.entityId,
      category: input.category,
      cloudinaryPublicId: asset.public_id,
      secureUrl: asset.secure_url,
      resourceType: asset.resource_type,
      format: asset.format,
      bytes: asset.bytes,
      width: asset.width,
      height: asset.height,
      version: asset.version,
      originalFilename: asset.original_filename ?? input.originalFilename,
      uploadedBy: user.id,
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning();
  if (!row)
    throw new AppError(
      "DATABASE_ERROR",
      "Unable to store document metadata.",
      500,
    );
  return row;
}

export async function listStudentDocuments(
  user: CurrentUser,
  studentId: string,
) {
  const student = await getReadableStudent(user, studentId);
  return getDb()
    .select({
      id: documentFiles.id,
      category: documentFiles.category,
      secureUrl: documentFiles.secureUrl,
      resourceType: documentFiles.resourceType,
      format: documentFiles.format,
      bytes: documentFiles.bytes,
      originalFilename: documentFiles.originalFilename,
      accessPolicy: documentFiles.accessPolicy,
      createdAt: documentFiles.createdAt,
      status: documentFiles.status,
    })
    .from(documentFiles)
    .where(
      and(
        eq(documentFiles.organizationId, user.organizationId),
        student.campusId
          ? eq(documentFiles.campusId, student.campusId)
          : undefined,
        eq(documentFiles.entityType, "student"),
        eq(documentFiles.entityId, student.id),
        eq(documentFiles.status, "active"),
      ),
    )
    .orderBy(desc(documentFiles.createdAt))
    .limit(100);
}
