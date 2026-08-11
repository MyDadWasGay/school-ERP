
import { and, desc, eq, inArray, type AnyColumn } from "drizzle-orm";
import { getDb } from "@/db/client";
import { evacuationRollCalls, gatePasses, securityIncidents, visitorLogs } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type { EvacuationInput, EvacuationStatusInput, GatePassInput, GatePassStatusInput, SecurityIncidentInput, SecurityIncidentStatusInput, VisitorInput } from "../schemas/safety.schema";

function campusScope(user: CurrentUser, column: AnyColumn) {
  if (user.campusIds && user.campusIds.length > 0) return inArray(column, user.campusIds);
  return user.campusId ? eq(column, user.campusId) : undefined;
}

async function getVisitor(user: CurrentUser, id: string) {
  const row = await getDb().query.visitorLogs.findFirst({ where: and(eq(visitorLogs.id, id), eq(visitorLogs.organizationId, user.organizationId), campusScope(user, visitorLogs.campusId)) });
  if (!row) throw new AppError("NOT_FOUND", "Visitor record not found in your scope.", 404);
  return row;
}

export async function listVisitors(user: CurrentUser) { return getDb().select().from(visitorLogs).where(and(eq(visitorLogs.organizationId, user.organizationId), campusScope(user, visitorLogs.campusId))).orderBy(desc(visitorLogs.effectiveAt)).limit(500); }

export async function createVisitor(user: CurrentUser, input: VisitorInput) {
  const [row] = await getDb().insert(visitorLogs).values({ id: createId("visitor"), organizationId: user.organizationId, campusId: user.campusId, name: input.visitorName, effectiveAt: input.visitAt, detailsJson: JSON.stringify({ purpose: input.purpose, hostName: input.hostName }), status: "expected", createdBy: user.id, updatedBy: user.id }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to register visitor.", 500);
  return row;
}

const gatePassTransitions: Record<string, string[]> = { requested: ["approved", "rejected", "cancelled"], approved: ["used", "expired", "cancelled"] };

export async function listGatePasses(user: CurrentUser) { return getDb().select().from(gatePasses).where(and(eq(gatePasses.organizationId, user.organizationId), campusScope(user, gatePasses.campusId))).orderBy(desc(gatePasses.effectiveAt)).limit(500); }

export async function createGatePass(user: CurrentUser, input: GatePassInput) {
  const visitor = await getVisitor(user, input.visitorId);
  if (input.validUntil.getTime() <= Date.now()) throw new AppError("VALIDATION_ERROR", "Gate pass expiry must be in the future.", 400);
  const [row] = await getDb().insert(gatePasses).values({ id: createId("gate_pass"), organizationId: user.organizationId, campusId: visitor.campusId, name: `Gate pass for ${visitor.name}`, referenceId: visitor.id, effectiveAt: input.validUntil, detailsJson: JSON.stringify({ reason: input.reason }), status: "requested", createdBy: user.id, updatedBy: user.id }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create gate pass.", 500);
  return row;
}

export async function transitionGatePass(user: CurrentUser, input: GatePassStatusInput) {
  const row = await getDb().query.gatePasses.findFirst({ where: and(eq(gatePasses.id, input.id), eq(gatePasses.organizationId, user.organizationId), campusScope(user, gatePasses.campusId)) });
  if (!row) throw new AppError("NOT_FOUND", "Gate pass not found.", 404);
  if (!gatePassTransitions[row.status]?.includes(input.toStatus)) throw new AppError("CONFLICT", `Cannot move gate pass from ${row.status} to ${input.toStatus}.`, 409);
  const [updated] = await getDb().update(gatePasses).set({ status: input.toStatus, updatedAt: new Date(), updatedBy: user.id }).where(and(eq(gatePasses.id, row.id), eq(gatePasses.status, row.status))).returning();
  if (!updated) throw new AppError("CONFLICT", "Gate pass changed before the transition was saved.", 409);
  return updated;
}

const incidentTransitions: Record<string, string[]> = { open: ["investigating", "resolved", "closed"], investigating: ["resolved", "closed"], resolved: ["closed"] };

export async function listSecurityIncidents(user: CurrentUser) { return getDb().select().from(securityIncidents).where(and(eq(securityIncidents.organizationId, user.organizationId), campusScope(user, securityIncidents.campusId))).orderBy(desc(securityIncidents.effectiveAt)).limit(500); }

export async function createSecurityIncident(user: CurrentUser, input: SecurityIncidentInput) {
  const [row] = await getDb().insert(securityIncidents).values({ id: createId("security_incident"), organizationId: user.organizationId, campusId: user.campusId, name: input.title, effectiveAt: input.occurredAt, detailsJson: JSON.stringify({ severity: input.severity, details: input.details }), status: "open", createdBy: user.id, updatedBy: user.id }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to record security incident.", 500);
  return row;
}

export async function transitionSecurityIncident(user: CurrentUser, input: SecurityIncidentStatusInput) {
  const row = await getDb().query.securityIncidents.findFirst({ where: and(eq(securityIncidents.id, input.id), eq(securityIncidents.organizationId, user.organizationId), campusScope(user, securityIncidents.campusId)) });
  if (!row) throw new AppError("NOT_FOUND", "Security incident not found.", 404);
  if (!incidentTransitions[row.status]?.includes(input.toStatus)) throw new AppError("CONFLICT", `Cannot move incident from ${row.status} to ${input.toStatus}.`, 409);
  const [updated] = await getDb().update(securityIncidents).set({ status: input.toStatus, updatedAt: new Date(), updatedBy: user.id }).where(and(eq(securityIncidents.id, row.id), eq(securityIncidents.status, row.status))).returning();
  if (!updated) throw new AppError("CONFLICT", "Security incident changed before the transition was saved.", 409);
  return updated;
}

export async function listEvacuations(user: CurrentUser) { return getDb().select().from(evacuationRollCalls).where(and(eq(evacuationRollCalls.organizationId, user.organizationId), campusScope(user, evacuationRollCalls.campusId))).orderBy(desc(evacuationRollCalls.effectiveAt)).limit(300); }

export async function createEvacuation(user: CurrentUser, input: EvacuationInput) {
  const [row] = await getDb().insert(evacuationRollCalls).values({ id: createId("evacuation"), organizationId: user.organizationId, campusId: user.campusId, name: input.title, effectiveAt: input.startedAt, detailsJson: JSON.stringify({ notes: input.notes || null }), status: "open", createdBy: user.id, updatedBy: user.id }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create evacuation roll call.", 500);
  return row;
}

export async function closeEvacuation(user: CurrentUser, input: EvacuationStatusInput) {
  const row = await getDb().query.evacuationRollCalls.findFirst({ where: and(eq(evacuationRollCalls.id, input.id), eq(evacuationRollCalls.organizationId, user.organizationId), campusScope(user, evacuationRollCalls.campusId)) });
  if (!row || row.status !== "open") throw new AppError(row ? "CONFLICT" : "NOT_FOUND", row ? "Only an open roll call can be closed." : "Evacuation roll call not found.", row ? 409 : 404);
  const [updated] = await getDb().update(evacuationRollCalls).set({ status: "closed", updatedAt: new Date(), updatedBy: user.id }).where(and(eq(evacuationRollCalls.id, row.id), eq(evacuationRollCalls.status, "open"))).returning();
  if (!updated) throw new AppError("CONFLICT", "Evacuation roll call changed before it was closed.", 409);
  return updated;
}
