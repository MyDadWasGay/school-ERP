import "server-only";

import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { alerts, routeAllocations, students, transportRoutes, transportStops, vehicleDocuments, vehicles } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type { RouteAllocationInput, TransportRouteInput, TransportStopInput, VehicleDocumentInput, VehicleInput } from "../schemas/transport.schema";

function assertCampusScope(user: CurrentUser, campusId: string | null | undefined) {
  const campusIds = user.campusIds ?? [user.campusId].filter((value): value is string => Boolean(value));
  if (!campusId || user.permissions.includes("organizations:update") || campusIds.length === 0 || campusIds.includes(campusId)) return;
  throw new AppError("FORBIDDEN", "Transport record is outside your campus scope.", 403);
}

export async function listTransportRoutes(user: CurrentUser) {
  return getDb().select().from(transportRoutes).where(and(
    eq(transportRoutes.organizationId, user.organizationId),
    user.campusId ? eq(transportRoutes.campusId, user.campusId) : undefined,
    eq(transportRoutes.status, "active"),
  )).orderBy(asc(transportRoutes.name)).limit(200);
}

export async function listTransportVehicles(user: CurrentUser) {
  return getDb().select().from(vehicles).where(and(
    eq(vehicles.organizationId, user.organizationId),
    user.campusId ? eq(vehicles.campusId, user.campusId) : undefined,
    eq(vehicles.status, "active"),
  )).orderBy(asc(vehicles.registrationNumber)).limit(200);
}

export async function createTransportVehicle(user: CurrentUser, input: VehicleInput) {
  const existing = await getDb().query.vehicles.findFirst({ where: and(
    eq(vehicles.organizationId, user.organizationId),
    eq(vehicles.registrationNumber, input.registrationNumber),
  ) });
  if (existing) throw new AppError("CONFLICT", "Vehicle registration number is already in use.", 409);
  const [row] = await getDb().insert(vehicles).values({
    id: createId("vehicle"),
    organizationId: user.organizationId,
    campusId: user.campusId,
    registrationNumber: input.registrationNumber,
    type: input.type,
    capacity: input.capacity,
    status: "active",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create transport vehicle.", 500);
  return row;
}

export async function listVehicleDocuments(user: CurrentUser) {
  return getDb().select({
    id: vehicleDocuments.id,
    name: vehicleDocuments.name,
    vehicleId: vehicleDocuments.referenceId,
    detailsJson: vehicleDocuments.detailsJson,
    status: vehicleDocuments.status,
    registrationNumber: vehicles.registrationNumber,
  }).from(vehicleDocuments).innerJoin(vehicles, and(
    eq(vehicles.id, vehicleDocuments.referenceId),
    eq(vehicles.organizationId, user.organizationId),
  )).where(and(
    eq(vehicleDocuments.organizationId, user.organizationId),
    user.campusId ? eq(vehicleDocuments.campusId, user.campusId) : undefined,
    eq(vehicleDocuments.status, "active"),
  )).orderBy(asc(vehicleDocuments.name)).limit(500);
}

export async function createVehicleDocument(user: CurrentUser, input: VehicleDocumentInput) {
  const vehicle = await getDb().query.vehicles.findFirst({ where: and(
    eq(vehicles.id, input.vehicleId),
    eq(vehicles.organizationId, user.organizationId),
    user.campusId ? eq(vehicles.campusId, user.campusId) : undefined,
    eq(vehicles.status, "active"),
  ) });
  if (!vehicle) throw new AppError("NOT_FOUND", "Vehicle not found in your scope.", 404);
  const [row] = await getDb().insert(vehicleDocuments).values({
    id: createId("vehicle_document"), organizationId: user.organizationId, campusId: vehicle.campusId,
    name: input.documentType, referenceId: vehicle.id, detailsJson: JSON.stringify({ expiresOn: input.expiresOn.toISOString() }),
    status: "active", createdBy: user.id, updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create vehicle document.", 500);
  const daysUntilExpiry = Math.ceil((input.expiresOn.getTime() - Date.now()) / 86_400_000);
  if (daysUntilExpiry <= 30) {
    await getDb().insert(alerts).values({
      id: createId("alert"), organizationId: user.organizationId, campusId: vehicle.campusId,
      type: "vehicle_document_expiry", title: `${input.documentType} expires for ${vehicle.registrationNumber}`,
      sourceType: "vehicle_document", sourceId: row.id, status: "open", createdBy: user.id, updatedBy: user.id,
    });
  }
  return row;
}

export async function createTransportRoute(user: CurrentUser, input: TransportRouteInput) {
  if (input.vehicleId) {
    const vehicle = await getDb().query.vehicles.findFirst({ where: and(eq(vehicles.id, input.vehicleId), eq(vehicles.organizationId, user.organizationId), user.campusId ? eq(vehicles.campusId, user.campusId) : undefined, eq(vehicles.status, "active")) });
    if (!vehicle) throw new AppError("NOT_FOUND", "Vehicle not found in your scope.", 404);
    if (vehicle.capacity < input.capacity) throw new AppError("VALIDATION_ERROR", "Route capacity cannot exceed the assigned vehicle capacity.", 422);
  }
  const [row] = await getDb().insert(transportRoutes).values({
    id: createId("route"), organizationId: user.organizationId, campusId: user.campusId,
    name: input.name, capacity: input.capacity, vehicleId: input.vehicleId || null,
    status: "active", createdBy: user.id, updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create transport route.", 500);
  return row;
}

export async function listTransportStops(user: CurrentUser) {
  return getDb().select().from(transportStops).where(and(
    eq(transportStops.organizationId, user.organizationId),
    user.campusId ? eq(transportStops.campusId, user.campusId) : undefined,
    eq(transportStops.status, "active"),
  )).orderBy(asc(transportStops.name)).limit(500);
}

export async function createTransportStop(user: CurrentUser, input: TransportStopInput) {
  const [row] = await getDb().insert(transportStops).values({
    id: createId("stop"), organizationId: user.organizationId, campusId: user.campusId,
    name: input.name, address: input.address || null, status: "active", createdBy: user.id, updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create transport stop.", 500);
  return row;
}

export async function listTransportStudents(user: CurrentUser) {
  return getDb().select({ id: students.id, name: sql<string>`${students.firstName} || ' ' || ${students.lastName}` }).from(students).where(and(
    eq(students.organizationId, user.organizationId),
    user.campusId ? eq(students.campusId, user.campusId) : undefined,
    eq(students.status, "active"),
  )).orderBy(asc(students.firstName)).limit(500);
}

export async function allocateStudentToRoute(user: CurrentUser, input: RouteAllocationInput) {
  const [route, student, stop] = await Promise.all([
    getDb().query.transportRoutes.findFirst({ where: and(eq(transportRoutes.id, input.routeId), eq(transportRoutes.organizationId, user.organizationId), user.campusId ? eq(transportRoutes.campusId, user.campusId) : undefined, eq(transportRoutes.status, "active")) }),
    getDb().query.students.findFirst({ where: and(eq(students.id, input.studentId), eq(students.organizationId, user.organizationId), eq(students.status, "active")) }),
    getDb().query.transportStops.findFirst({ where: and(eq(transportStops.id, input.stopId), eq(transportStops.organizationId, user.organizationId), user.campusId ? eq(transportStops.campusId, user.campusId) : undefined, eq(transportStops.status, "active")) }),
  ]);
  if (!route || !student || !stop) throw new AppError("NOT_FOUND", "Route, student, or stop was not found in your tenant scope.", 404);
  assertCampusScope(user, student.campusId);
  if (route.campusId !== stop.campusId && route.campusId && stop.campusId) throw new AppError("TENANT_SCOPE_ERROR", "Route and stop belong to different campuses.", 403);
  const [existing] = await getDb().select({ id: routeAllocations.id }).from(routeAllocations).where(and(eq(routeAllocations.organizationId, user.organizationId), eq(routeAllocations.studentId, student.id), eq(routeAllocations.status, "active"))).limit(1);
  if (existing) throw new AppError("CONFLICT", "Student already has an active transport allocation.", 409);
  const [countRow] = await getDb().select({ value: count() }).from(routeAllocations).where(and(eq(routeAllocations.organizationId, user.organizationId), eq(routeAllocations.routeId, route.id), eq(routeAllocations.status, "active")));
  if ((countRow?.value ?? 0) >= route.capacity) throw new AppError("CONFLICT", "Route capacity has been reached.", 409);
  return getDb().transaction(async (tx) => {
    const [allocation] = await tx.insert(routeAllocations).values({
      id: createId("route_allocation"), organizationId: user.organizationId, campusId: student.campusId ?? route.campusId,
      routeId: route.id, studentId: student.id, stopId: stop.id, status: "active", createdBy: user.id, updatedBy: user.id,
    }).returning();
    if (!allocation) throw new AppError("DATABASE_ERROR", "Unable to create route allocation.", 500);
    return allocation;
  });
}

export async function listRouteAllocations(user: CurrentUser) {
  const rows = await getDb().select({
    id: routeAllocations.id,
    routeId: routeAllocations.routeId,
    routeName: transportRoutes.name,
    studentId: routeAllocations.studentId,
    studentName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
    stopName: transportStops.name,
    createdAt: routeAllocations.createdAt,
  }).from(routeAllocations)
    .innerJoin(transportRoutes, and(eq(transportRoutes.id, routeAllocations.routeId), eq(transportRoutes.organizationId, user.organizationId)))
    .innerJoin(students, and(eq(students.id, routeAllocations.studentId), eq(students.organizationId, user.organizationId)))
    .innerJoin(transportStops, and(eq(transportStops.id, routeAllocations.stopId), eq(transportStops.organizationId, user.organizationId)))
    .where(and(eq(routeAllocations.organizationId, user.organizationId), user.campusId ? eq(routeAllocations.campusId, user.campusId) : undefined, eq(routeAllocations.status, "active")))
    .orderBy(desc(routeAllocations.createdAt)).limit(500);
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export async function getTransportManifest(user: CurrentUser, routeId: string) {
  const route = await getDb().query.transportRoutes.findFirst({ where: and(eq(transportRoutes.id, routeId), eq(transportRoutes.organizationId, user.organizationId), user.campusId ? eq(transportRoutes.campusId, user.campusId) : undefined) });
  if (!route) throw new AppError("NOT_FOUND", "Transport route not found.", 404);
  const rows = await getDb().select({
    route: transportRoutes.name,
    student: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
    admissionNumber: students.admissionNumber,
    stop: transportStops.name,
  }).from(routeAllocations)
    .innerJoin(transportRoutes, and(eq(transportRoutes.id, routeAllocations.routeId), eq(transportRoutes.organizationId, user.organizationId)))
    .innerJoin(students, and(eq(students.id, routeAllocations.studentId), eq(students.organizationId, user.organizationId)))
    .innerJoin(transportStops, and(eq(transportStops.id, routeAllocations.stopId), eq(transportStops.organizationId, user.organizationId)))
    .where(and(eq(routeAllocations.organizationId, user.organizationId), eq(routeAllocations.routeId, route.id), eq(routeAllocations.status, "active")))
    .orderBy(asc(transportStops.name), asc(students.lastName));
  return { route, rows };
}
