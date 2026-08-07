"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { permissionForPath } from "@/config/modules";
import { getDb } from "@/db/client";
import { moduleRecords, workflowTransitions } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { requirePermission } from "@/lib/auth/guards";
import type { ActionResult } from "@/lib/errors/result";
import { createId } from "@/lib/utils/ids";

const routeSchema = z.string().regex(/^\/[a-z0-9/-]+$/).max(160);
const moduleRecordSchema = z.object({
  route: routeSchema,
  entityType: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  note: z.string().trim().max(500).optional(),
});
const updateRecordSchema = moduleRecordSchema.extend({
  id: z.string().min(1),
  status: z.enum(["draft", "active", "pending", "completed"]),
});
const archiveRecordSchema = z.object({
  id: z.string().min(1),
  route: routeSchema,
  entityType: z.string().trim().min(2).max(80),
});

function mutationPermission(route: string) {
  const [permissionModule] = permissionForPath(route).split(":");
  return permissionModule === "settings" ? "settings:update" : `${permissionModule}:create`;
}

export async function createModuleRecordAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = moduleRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "The record details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const user = await requirePermission(mutationPermission(parsed.data.route));
    const permissionModule = permissionForPath(parsed.data.route).split(":")[0] ?? "settings";
    const id = createId("record");
    await getDb().insert(moduleRecords).values({
      id,
      organizationId: user.organizationId,
      campusId: user.campusId,
      module: permissionModule,
      route: parsed.data.route,
      entityType: parsed.data.entityType,
      name: parsed.data.name,
      note: parsed.data.note,
      ownerUserId: user.id,
      createdBy: user.id,
      updatedBy: user.id,
    });
    await writeAuditLog(user, {
      action: "create",
      module: permissionModule,
      entityType: parsed.data.entityType,
      entityId: id,
      after: { route: parsed.data.route, name: parsed.data.name, note: parsed.data.note },
    });
    revalidatePath(parsed.data.route);
    return { ok: true, data: { id }, message: "Record created." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create record." };
  }
}

export async function updateModuleRecordAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = updateRecordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "The record update is invalid.", code: "VALIDATION_ERROR" };
  try {
    const updatePermission = permissionForPath(parsed.data.route).replace(":read", ":update");
    const user = await requirePermission(updatePermission);
    const permissionModule = permissionForPath(parsed.data.route).split(":")[0] ?? "settings";
    const existing = await getDb().query.moduleRecords.findFirst({ where: and(
      eq(moduleRecords.id, parsed.data.id),
      eq(moduleRecords.organizationId, user.organizationId),
      user.campusId ? eq(moduleRecords.campusId, user.campusId) : undefined,
      ["parent", "student", "teacher", "alumni"].includes(user.role) ? eq(moduleRecords.ownerUserId, user.id) : undefined,
      eq(moduleRecords.route, parsed.data.route),
    ) });
    if (!existing) return { ok: false, error: "Record not found.", code: "NOT_FOUND" };
    await getDb().transaction(async (tx) => {
      await tx.update(moduleRecords).set({
        name: parsed.data.name,
        note: parsed.data.note,
        status: parsed.data.status,
        updatedAt: new Date(),
        updatedBy: user.id,
      }).where(and(eq(moduleRecords.id, existing.id), eq(moduleRecords.organizationId, user.organizationId)));
      if (existing.status !== parsed.data.status) {
        await tx.insert(workflowTransitions).values({
          organizationId: user.organizationId,
          campusId: user.campusId,
          entityType: parsed.data.entityType,
          entityId: existing.id,
          fromStatus: existing.status,
          toStatus: parsed.data.status,
          transitionedBy: user.id,
          transitionedAt: new Date(),
          createdBy: user.id,
          updatedBy: user.id,
        });
      }
    });
    await writeAuditLog(user, { action: "update", module: permissionModule, entityType: parsed.data.entityType, entityId: existing.id, before: existing, after: parsed.data });
    revalidatePath(parsed.data.route);
    return { ok: true, data: { id: parsed.data.id }, message: "Record updated." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to update record." };
  }
}

export async function archiveModuleRecordAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = archiveRecordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "The archive request is invalid.", code: "VALIDATION_ERROR" };
  try {
    const deletePermission = permissionForPath(parsed.data.route).replace(":read", ":delete");
    const user = await requirePermission(deletePermission);
    const permissionModule = permissionForPath(parsed.data.route).split(":")[0] ?? "settings";
    const existing = await getDb().query.moduleRecords.findFirst({ where: and(
      eq(moduleRecords.id, parsed.data.id),
      eq(moduleRecords.organizationId, user.organizationId),
      user.campusId ? eq(moduleRecords.campusId, user.campusId) : undefined,
      ["parent", "student", "teacher", "alumni"].includes(user.role) ? eq(moduleRecords.ownerUserId, user.id) : undefined,
      eq(moduleRecords.route, parsed.data.route),
    ) });
    if (!existing) return { ok: false, error: "Record not found.", code: "NOT_FOUND" };
    await getDb().transaction(async (tx) => {
      await tx.update(moduleRecords).set({
        status: "archived",
        updatedAt: new Date(),
        updatedBy: user.id,
      }).where(and(eq(moduleRecords.id, existing.id), eq(moduleRecords.organizationId, user.organizationId)));
      await tx.insert(workflowTransitions).values({
        organizationId: user.organizationId,
        campusId: existing.campusId,
        entityType: existing.entityType,
        entityId: existing.id,
        fromStatus: existing.status,
        toStatus: "archived",
        transitionedBy: user.id,
        transitionedAt: new Date(),
        createdBy: user.id,
        updatedBy: user.id,
      });
    });
    await writeAuditLog(user, {
      action: "delete",
      module: permissionModule,
      entityType: existing.entityType,
      entityId: existing.id,
      before: existing,
      after: { status: "archived" },
    });
    revalidatePath(parsed.data.route);
    return { ok: true, data: { id: parsed.data.id }, message: "Record archived." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to archive record." };
  }
}
