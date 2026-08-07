"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import {
  issueLibraryCopySchema,
  libraryCopySchema,
  libraryItemSchema,
  renewLibraryCopySchema,
  returnLibraryCopySchema,
  digitalResourceSchema,
  libraryReservationSchema,
} from "../schemas/library.schema";
import { addLibraryCopy, createDigitalResource, createLibraryItem, issueLibraryCopy, renewLibraryCopy, reserveLibraryItem, returnLibraryCopy } from "../services/library.service";

export async function createLibraryItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = libraryItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Library item details are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("library:create");
    const row = await createLibraryItem(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "library", entityType: "library_item", entityId: row.id, after: { title: row.title, isbn: row.isbn } });
    revalidatePath("/library/catalogue");
    return { ok: true, data: { id: row.id }, message: "Library item created." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create library item." }; }
}

export async function addLibraryCopyAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = libraryCopySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Library copy details are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("library:create");
    const row = await addLibraryCopy(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "library", entityType: "library_copy", entityId: row.id, after: { accessionNumber: row.accessionNumber, itemId: row.itemId } });
    revalidatePath("/library/copies");
    revalidatePath("/library/catalogue");
    return { ok: true, data: { id: row.id }, message: "Library copy added." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to add library copy." }; }
}

export async function issueLibraryCopyAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = issueLibraryCopySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Issue details are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("library:create");
    const row = await issueLibraryCopy(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "library", entityType: "library_issue", entityId: row.id, campusId: row.campusId, metadata: { borrowerType: row.borrowerType, borrowerId: row.borrowerId } });
    revalidatePath("/library/issue-return");
    revalidatePath("/library/copies");
    revalidatePath("/library/catalogue");
    return { ok: true, data: { id: row.id }, message: "Library copy issued." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to issue library copy." }; }
}

export async function returnLibraryCopyAction(input: unknown): Promise<ActionResult<{ id: string; fineMinor: number }>> {
  const parsed = returnLibraryCopySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Return details are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("library:update");
    const result = await returnLibraryCopy(user, parsed.data);
    await writeAuditLog(user, { action: "update", module: "library", entityType: "library_issue", entityId: result.issue.id, campusId: result.issue.campusId, metadata: { outcome: parsed.data.outcome, fineMinor: result.fineMinor, overdueDays: result.overdueDays } });
    revalidatePath("/library/issue-return");
    revalidatePath("/library/copies");
    revalidatePath("/library/catalogue");
    return { ok: true, data: { id: result.issue.id, fineMinor: result.fineMinor }, message: parsed.data.outcome === "returned" ? `Library copy returned. Fine: ${result.fineMinor} minor units.` : `Library copy marked ${parsed.data.outcome}.` };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to return library copy." }; }
}

export async function renewLibraryCopyAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = renewLibraryCopySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Renewal details are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("library:update");
    const row = await renewLibraryCopy(user, parsed.data);
    await writeAuditLog(user, { action: "update", module: "library", entityType: "library_issue", entityId: row.id, campusId: row.campusId, metadata: { renewalCount: row.renewalCount, dueAt: row.dueAt } });
    revalidatePath("/library/issue-return");
    return { ok: true, data: { id: row.id }, message: "Library copy renewed." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to renew library copy." }; }
}

export async function reserveLibraryItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = libraryReservationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Reservation details are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("library:update");
    const row = await reserveLibraryItem(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "library", entityType: "library_reservation", entityId: row.id, campusId: row.campusId, after: { itemId: row.referenceId, status: row.status } });
    revalidatePath("/library/reservations");
    return { ok: true, data: { id: row.id }, message: "Library reservation created." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to reserve library item." }; }
}

export async function createDigitalResourceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = digitalResourceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Digital resource details are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("library:create");
    const row = await createDigitalResource(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "library", entityType: "digital_resource", entityId: row.id, campusId: row.campusId, after: { name: row.name } });
    revalidatePath("/library/digital-resources");
    return { ok: true, data: { id: row.id }, message: "Digital resource created." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create digital resource." }; }
}
