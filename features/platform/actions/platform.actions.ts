"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import type { ActionResult } from "@/lib/errors/result";
import { createPlatformSchool, updatePlatformSchoolStatus } from "../services/platform.service";
import { createSchoolSchema, schoolStatusSchema } from "../schemas/platform.schema";

export async function createPlatformSchoolAction(input: unknown): Promise<ActionResult<{ organizationId: string; adminEmail: string; inviteLink: string }>> {
  const parsed = createSchoolSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "School details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const admin = await requirePlatformAdmin();
    const result = await createPlatformSchool(admin, parsed.data);
    revalidatePath("/platform");
    return { ok: true, data: result, message: "School created and the administrator invite is ready." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create the school." };
  }
}

export async function updatePlatformSchoolStatusAction(input: unknown): Promise<ActionResult<{ id: string; status: string }>> {
  const parsed = schoolStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "School status is invalid.", code: "VALIDATION_ERROR" };
  try {
    const admin = await requirePlatformAdmin();
    const result = await updatePlatformSchoolStatus(admin, parsed.data);
    revalidatePath("/platform");
    return { ok: true, data: { id: result.id, status: result.status }, message: `School marked ${result.status}.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to update the school status." };
  }
}
