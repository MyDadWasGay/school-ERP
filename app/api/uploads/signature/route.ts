import { NextResponse } from "next/server";
import { getSignedUploadParams } from "@/lib/cloudinary/server";
import { requirePermission } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors/app-error";
import { isAllowedUpload } from "@/lib/cloudinary/policy";
import { z } from "zod";
import { assertDocumentEntityScope } from "@/features/documents/services/document-scope.service";

const uploadRequestSchema = z.object({
  entityType: z.enum(["student", "employee", "application", "certificate", "library_item", "asset", "cms_media", "health_record", "custom"]),
  entityId: z.string().regex(/^[a-zA-Z0-9_-]{1,160}$/),
  resourceType: z.enum(["image", "raw", "video"]).default("raw"),
  format: z.string().optional(),
  bytes: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requirePermission("documents:create");
    const parsed = uploadRequestSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Entity, file type or size is invalid.", 422);
    if (parsed.data.entityType === "health_record") await requirePermission("health:view_sensitive");
    if (!isAllowedUpload(parsed.data)) throw new AppError("VALIDATION_ERROR", "This file type or size is not allowed.", 422);
    await assertDocumentEntityScope(user, parsed.data.entityType, parsed.data.entityId);
    return NextResponse.json(getSignedUploadParams(
      user.organizationId,
      parsed.data.entityType,
      parsed.data.entityId,
      parsed.data.resourceType,
    ));
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError("FORBIDDEN", "Upload signature unavailable.", 403);
    return NextResponse.json({ error: appError.message }, { status: appError.status });
  }
}
