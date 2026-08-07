"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import { routeAllocationSchema, transportRouteSchema, transportStopSchema, vehicleDocumentSchema, vehicleSchema } from "../schemas/transport.schema";
import { allocateStudentToRoute, createTransportRoute, createTransportStop, createTransportVehicle, createVehicleDocument } from "../services/transport.service";

export async function createTransportVehicleAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Vehicle details are invalid.", code: "VALIDATION_ERROR" };
  try { const user = await requirePermission("transport:create"); const row = await createTransportVehicle(user, parsed.data); await writeAuditLog(user, { action: "create", module: "transport", entityType: "vehicle", entityId: row.id, campusId: row.campusId, after: { registrationNumber: row.registrationNumber, capacity: row.capacity } }); revalidatePath("/transport/vehicles"); revalidatePath("/transport/routes"); return { ok: true, data: { id: row.id }, message: "Transport vehicle created." }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create transport vehicle." }; }
}

export async function createVehicleDocumentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = vehicleDocumentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Vehicle document details are invalid.", code: "VALIDATION_ERROR" };
  try { const user = await requirePermission("transport:update"); const row = await createVehicleDocument(user, parsed.data); await writeAuditLog(user, { action: "create", module: "transport", entityType: "vehicle_document", entityId: row.id, campusId: row.campusId, after: { documentType: row.name, vehicleId: row.referenceId } }); revalidatePath("/transport/vehicles"); revalidatePath("/alerts"); return { ok: true, data: { id: row.id }, message: "Vehicle document recorded." }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create vehicle document." }; }
}

export async function createTransportRouteAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = transportRouteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Route details are invalid.", code: "VALIDATION_ERROR" };
  try { const user = await requirePermission("transport:create"); const row = await createTransportRoute(user, parsed.data); await writeAuditLog(user, { action: "create", module: "transport", entityType: "route", entityId: row.id, campusId: row.campusId, after: { name: row.name, capacity: row.capacity } }); revalidatePath("/transport/routes"); revalidatePath("/transport/allocations"); return { ok: true, data: { id: row.id }, message: "Transport route created." }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create transport route." }; }
}

export async function createTransportStopAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = transportStopSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Stop details are invalid.", code: "VALIDATION_ERROR" };
  try { const user = await requirePermission("transport:create"); const row = await createTransportStop(user, parsed.data); await writeAuditLog(user, { action: "create", module: "transport", entityType: "stop", entityId: row.id, campusId: row.campusId, after: { name: row.name } }); revalidatePath("/transport/stops"); revalidatePath("/transport/allocations"); return { ok: true, data: { id: row.id }, message: "Transport stop created." }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create transport stop." }; }
}

export async function allocateStudentToRouteAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = routeAllocationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Allocation details are invalid.", code: "VALIDATION_ERROR" };
  try { const user = await requirePermission("transport:update"); const row = await allocateStudentToRoute(user, parsed.data); await writeAuditLog(user, { action: "create", module: "transport", entityType: "route_allocation", entityId: row.id, campusId: row.campusId, after: parsed.data }); revalidatePath("/transport/allocations"); revalidatePath("/transport/routes"); return { ok: true, data: { id: row.id }, message: "Student allocated to route." }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to allocate student to route." }; }
}
