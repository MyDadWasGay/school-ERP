"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import { hostelAllotmentSchema, hostelBedSchema, hostelRoomSchema } from "../schemas/hostel.schema";
import { allocateHostelBed, checkoutHostelAllotment, createHostelBed, createHostelRoom } from "../services/hostel.service";

export async function createHostelRoomAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = hostelRoomSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Room details are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("hostel:create");
    const row = await createHostelRoom(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "hostel", entityType: "hostel_room", entityId: row.id, campusId: row.campusId, after: { building: row.building, roomNumber: row.roomNumber, capacity: row.capacity } });
    revalidatePath("/hostel/rooms");
    revalidatePath("/hostel/beds");
    return { ok: true, data: { id: row.id }, message: "Hostel room created." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create hostel room." }; }
}

export async function createHostelBedAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = hostelBedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Bed details are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("hostel:create");
    const row = await createHostelBed(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "hostel", entityType: "hostel_bed", entityId: row.id, campusId: row.campusId, after: { code: row.code, roomId: row.referenceId } });
    revalidatePath("/hostel/beds");
    revalidatePath("/hostel/allotments");
    return { ok: true, data: { id: row.id }, message: "Hostel bed created." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create hostel bed." }; }
}

export async function allocateHostelBedAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = hostelAllotmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Allotment details are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("hostel:update");
    const row = await allocateHostelBed(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "hostel", entityType: "hostel_allotment", entityId: row.id, campusId: row.campusId, after: { roomId: row.roomId, bedId: row.bedId, studentId: row.studentId } });
    revalidatePath("/hostel/allotments");
    revalidatePath("/hostel/rooms");
    return { ok: true, data: { id: row.id }, message: "Bed allotted." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to allot hostel bed." }; }
}

export async function checkoutHostelAllotmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const allotmentId = typeof input === "object" && input !== null && "allotmentId" in input && typeof input.allotmentId === "string" ? input.allotmentId : "";
  if (!allotmentId) return { ok: false, error: "Allotment is required.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("hostel:update");
    const row = await checkoutHostelAllotment(user, allotmentId);
    await writeAuditLog(user, { action: "update", module: "hostel", entityType: "hostel_allotment", entityId: row.id, campusId: row.campusId, after: { status: row.status, checkedOutOn: row.checkedOutOn?.toISOString() } });
    revalidatePath("/hostel/allotments");
    revalidatePath("/hostel/rooms");
    return { ok: true, data: { id: row.id }, message: "Student checked out." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to check out student." }; }
}
