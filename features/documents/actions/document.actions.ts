"use server";

import { z } from "zod";
import { documentFiles } from "@/db/schema";
import { getDb } from "@/db/client";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { isAllowedUpload } from "@/lib/cloudinary/policy";
import { verifyCloudinaryAsset } from "@/lib/cloudinary/server";
import type { ActionResult } from "@/lib/errors/result";
import { assertDocumentEntityScope } from "../services/document-scope.service";

const documentSchema = z.object({
  entityType: z.enum(["student", "employee", "application", "certificate", "library_item", "asset", "cms_media", "health_record", "custom"]),
  entityId: z.string().regex(/^[a-zA-Z0-9_-]{1,160}$/),
  category: z.string().min(1).max(80),
  publicId: z.string().min(1),
  secureUrl: z.string().url().refine((url) => new URL(url).hostname === "res.cloudinary.com", "File must be hosted by Cloudinary."),
  resourceType: z.enum(["image", "raw", "video"]),
  format: z.string().optional(),
  bytes: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  version: z.number().int().positive().optional(),
  originalFilename: z.string().max(255).optional(),
});

export async function saveDocumentMetadataAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Document metadata is invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("documents:create");
    if (parsed.data.entityType === "health_record") await requirePermission("health:view_sensitive");
    const expectedPrefix = `school-erp/${user.organizationId}/${parsed.data.entityType}/${parsed.data.entityId}/`;
    if (!parsed.data.publicId.startsWith(expectedPrefix)) {
      return { ok: false, error: "The upload does not belong to this organization and record.", code: "TENANT_SCOPE_ERROR" };
    }
    await assertDocumentEntityScope(user, parsed.data.entityType, parsed.data.entityId);
    const asset = await verifyCloudinaryAsset({
      publicId: parsed.data.publicId,
      resourceType: parsed.data.resourceType,
      secureUrl: parsed.data.secureUrl,
      version: parsed.data.version,
    });
    if (!isAllowedUpload({
      resourceType: asset.resource_type,
      format: asset.format,
      bytes: asset.bytes,
    })) {
      return { ok: false, error: "The verified file type or size is not allowed.", code: "VALIDATION_ERROR" };
    }
    const [row] = await getDb().insert(documentFiles).values({
      organizationId: user.organizationId,
      campusId: user.campusId,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      category: parsed.data.category,
      cloudinaryPublicId: asset.public_id,
      secureUrl: asset.secure_url,
      resourceType: asset.resource_type,
      format: asset.format,
      bytes: asset.bytes,
      width: asset.width,
      height: asset.height,
      version: asset.version,
      originalFilename: asset.original_filename ?? parsed.data.originalFilename,
      uploadedBy: user.id,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    await writeAuditLog(user, {
      action: "upload",
      module: "documents",
      entityType: parsed.data.entityType,
      entityId: row.id,
      after: row,
    });
    return { ok: true, data: { id: row.id }, message: "Document metadata stored." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save document." };
  }
}
