import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  alerts,
  messages,
  notificationEvents,
  routeAllocations,
  studentGuardianLinks,
  transportBoardingEvents,
  transportLocationUpdates,
  students,
  transportRoutes,
  transportStops,
  users,
  vehicleDocuments,
  vehicles,
} from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { databaseErrorIncludes } from "@/lib/errors/database-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import { resolvePermittedStudentIds } from "@/features/students/services/students.service";
import type {
  RouteAllocationInput,
  TransportRouteInput,
  TransportStopInput,
  VehicleDocumentInput,
  VehicleInput,
  TransportBoardingEventInput,
  TransportLocationInput,
} from "../schemas/transport.schema";
import { normalizeIndiaCalendarDate } from "@/lib/utils/india-time";
import { formatIndiaDateTime } from "@/lib/utils/india-time";
import { sendUserPush } from "@/features/communication/services/communication.service";

function assertCampusScope(
  user: CurrentUser,
  campusId: string | null | undefined,
) {
  const campusIds =
    user.campusIds ??
    [user.campusId].filter((value): value is string => Boolean(value));
  if (
    !campusId ||
    user.permissions.includes("organizations:update") ||
    campusIds.length === 0 ||
    campusIds.includes(campusId)
  )
    return;
  throw new AppError(
    "FORBIDDEN",
    "Transport record is outside your campus scope.",
    403,
  );
}

type PermittedTransportScope = {
  studentIds: string[];
  routeIds: string[];
  stopIds: string[];
  vehicleIds: string[];
};

async function resolvePermittedTransportScope(
  user: CurrentUser,
): Promise<PermittedTransportScope | undefined> {
  const studentIds = await resolvePermittedStudentIds(user);
  if (studentIds === undefined) return undefined;
  if (studentIds.length === 0) {
    return { studentIds, routeIds: [], stopIds: [], vehicleIds: [] };
  }

  const allocations = await getDb()
    .select({
      routeId: routeAllocations.routeId,
      stopId: routeAllocations.stopId,
    })
    .from(routeAllocations)
    .where(
      and(
        eq(routeAllocations.organizationId, user.organizationId),
        eq(routeAllocations.status, "active"),
        inArray(routeAllocations.studentId, studentIds),
      ),
    );
  const routeIds = [...new Set(allocations.map(({ routeId }) => routeId))];
  const stopIds = [...new Set(allocations.map(({ stopId }) => stopId))];
  if (routeIds.length === 0) {
    return { studentIds, routeIds, stopIds, vehicleIds: [] };
  }

  const routeRows = await getDb()
    .select({ vehicleId: transportRoutes.vehicleId })
    .from(transportRoutes)
    .where(
      and(
        eq(transportRoutes.organizationId, user.organizationId),
        inArray(transportRoutes.id, routeIds),
      ),
    );
  const vehicleIds = [
    ...new Set(
      routeRows.flatMap(({ vehicleId }) => (vehicleId ? [vehicleId] : [])),
    ),
  ];
  return { studentIds, routeIds, stopIds, vehicleIds };
}

export async function listTransportRoutes(user: CurrentUser) {
  const permittedScope = await resolvePermittedTransportScope(user);
  if (permittedScope && permittedScope.routeIds.length === 0) return [];
  return getDb()
    .select()
    .from(transportRoutes)
    .where(
      and(
        eq(transportRoutes.organizationId, user.organizationId),
        user.campusId ? eq(transportRoutes.campusId, user.campusId) : undefined,
        eq(transportRoutes.status, "active"),
        permittedScope
          ? inArray(transportRoutes.id, permittedScope.routeIds)
          : undefined,
      ),
    )
    .orderBy(asc(transportRoutes.name))
    .limit(200);
}

export async function listTransportVehicles(user: CurrentUser) {
  const permittedScope = await resolvePermittedTransportScope(user);
  if (permittedScope && permittedScope.vehicleIds.length === 0) return [];
  return getDb()
    .select()
    .from(vehicles)
    .where(
      and(
        eq(vehicles.organizationId, user.organizationId),
        user.campusId ? eq(vehicles.campusId, user.campusId) : undefined,
        eq(vehicles.status, "active"),
        permittedScope
          ? inArray(vehicles.id, permittedScope.vehicleIds)
          : undefined,
      ),
    )
    .orderBy(asc(vehicles.registrationNumber))
    .limit(200);
}

export async function createTransportVehicle(
  user: CurrentUser,
  input: VehicleInput,
) {
  const existing = await getDb().query.vehicles.findFirst({
    where: and(
      eq(vehicles.organizationId, user.organizationId),
      eq(vehicles.registrationNumber, input.registrationNumber),
    ),
  });
  if (existing)
    throw new AppError(
      "CONFLICT",
      "Vehicle registration number is already in use.",
      409,
    );
  const [row] = await getDb()
    .insert(vehicles)
    .values({
      id: createId("vehicle"),
      organizationId: user.organizationId,
      campusId: user.campusId,
      registrationNumber: input.registrationNumber,
      type: input.type,
      capacity: input.capacity,
      status: "active",
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning();
  if (!row)
    throw new AppError(
      "DATABASE_ERROR",
      "Unable to create transport vehicle.",
      500,
    );
  return row;
}

export async function listVehicleDocuments(user: CurrentUser) {
  const permittedScope = await resolvePermittedTransportScope(user);
  if (permittedScope && permittedScope.vehicleIds.length === 0) return [];
  return getDb()
    .select({
      id: vehicleDocuments.id,
      name: vehicleDocuments.name,
      vehicleId: vehicleDocuments.referenceId,
      detailsJson: vehicleDocuments.detailsJson,
      status: vehicleDocuments.status,
      registrationNumber: vehicles.registrationNumber,
    })
    .from(vehicleDocuments)
    .innerJoin(
      vehicles,
      and(
        eq(vehicles.id, vehicleDocuments.referenceId),
        eq(vehicles.organizationId, user.organizationId),
      ),
    )
    .where(
      and(
        eq(vehicleDocuments.organizationId, user.organizationId),
        user.campusId
          ? eq(vehicleDocuments.campusId, user.campusId)
          : undefined,
        eq(vehicleDocuments.status, "active"),
        permittedScope
          ? inArray(vehicleDocuments.referenceId, permittedScope.vehicleIds)
          : undefined,
      ),
    )
    .orderBy(asc(vehicleDocuments.name))
    .limit(500);
}

export async function createVehicleDocument(
  user: CurrentUser,
  input: VehicleDocumentInput,
) {
  const vehicle = await getDb().query.vehicles.findFirst({
    where: and(
      eq(vehicles.id, input.vehicleId),
      eq(vehicles.organizationId, user.organizationId),
      user.campusId ? eq(vehicles.campusId, user.campusId) : undefined,
      eq(vehicles.status, "active"),
    ),
  });
  if (!vehicle)
    throw new AppError("NOT_FOUND", "Vehicle not found in your scope.", 404);
  const [row] = await getDb()
    .insert(vehicleDocuments)
    .values({
      id: createId("vehicle_document"),
      organizationId: user.organizationId,
      campusId: vehicle.campusId,
      name: input.documentType,
      referenceId: vehicle.id,
      detailsJson: JSON.stringify({ expiresOn: input.expiresOn.toISOString() }),
      status: "active",
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning();
  if (!row)
    throw new AppError(
      "DATABASE_ERROR",
      "Unable to create vehicle document.",
      500,
    );
  const daysUntilExpiry = Math.ceil(
    (input.expiresOn.getTime() - Date.now()) / 86_400_000,
  );
  if (daysUntilExpiry <= 30) {
    await getDb()
      .insert(alerts)
      .values({
        id: createId("alert"),
        organizationId: user.organizationId,
        campusId: vehicle.campusId,
        type: "vehicle_document_expiry",
        title: `${input.documentType} expires for ${vehicle.registrationNumber}`,
        sourceType: "vehicle_document",
        sourceId: row.id,
        status: "open",
        createdBy: user.id,
        updatedBy: user.id,
      });
  }
  return row;
}

export async function createTransportRoute(
  user: CurrentUser,
  input: TransportRouteInput,
) {
  if (input.vehicleId) {
    const vehicle = await getDb().query.vehicles.findFirst({
      where: and(
        eq(vehicles.id, input.vehicleId),
        eq(vehicles.organizationId, user.organizationId),
        user.campusId ? eq(vehicles.campusId, user.campusId) : undefined,
        eq(vehicles.status, "active"),
      ),
    });
    if (!vehicle)
      throw new AppError("NOT_FOUND", "Vehicle not found in your scope.", 404);
    if (vehicle.capacity < input.capacity)
      throw new AppError(
        "VALIDATION_ERROR",
        "Route capacity cannot exceed the assigned vehicle capacity.",
        422,
      );
  }
  const [row] = await getDb()
    .insert(transportRoutes)
    .values({
      id: createId("route"),
      organizationId: user.organizationId,
      campusId: user.campusId,
      name: input.name,
      capacity: input.capacity,
      vehicleId: input.vehicleId || null,
      status: "active",
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning();
  if (!row)
    throw new AppError(
      "DATABASE_ERROR",
      "Unable to create transport route.",
      500,
    );
  return row;
}

export async function listTransportStops(user: CurrentUser) {
  const permittedScope = await resolvePermittedTransportScope(user);
  if (permittedScope && permittedScope.stopIds.length === 0) return [];
  return getDb()
    .select()
    .from(transportStops)
    .where(
      and(
        eq(transportStops.organizationId, user.organizationId),
        user.campusId ? eq(transportStops.campusId, user.campusId) : undefined,
        eq(transportStops.status, "active"),
        permittedScope
          ? inArray(transportStops.id, permittedScope.stopIds)
          : undefined,
      ),
    )
    .orderBy(asc(transportStops.name))
    .limit(500);
}

export async function createTransportStop(
  user: CurrentUser,
  input: TransportStopInput,
) {
  const [row] = await getDb()
    .insert(transportStops)
    .values({
      id: createId("stop"),
      organizationId: user.organizationId,
      campusId: user.campusId,
      name: input.name,
      address: input.address || null,
      status: "active",
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning();
  if (!row)
    throw new AppError(
      "DATABASE_ERROR",
      "Unable to create transport stop.",
      500,
    );
  return row;
}

export async function listTransportStudents(user: CurrentUser) {
  const permittedScope = await resolvePermittedTransportScope(user);
  if (permittedScope && permittedScope.studentIds.length === 0) return [];
  return getDb()
    .select({
      id: students.id,
      name: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
    })
    .from(students)
    .where(
      and(
        eq(students.organizationId, user.organizationId),
        user.campusId ? eq(students.campusId, user.campusId) : undefined,
        eq(students.status, "active"),
        permittedScope
          ? inArray(students.id, permittedScope.studentIds)
          : undefined,
      ),
    )
    .orderBy(asc(students.firstName))
    .limit(500);
}

export async function allocateStudentToRoute(
  user: CurrentUser,
  input: RouteAllocationInput,
) {
  const [route, student, stop] = await Promise.all([
    getDb().query.transportRoutes.findFirst({
      where: and(
        eq(transportRoutes.id, input.routeId),
        eq(transportRoutes.organizationId, user.organizationId),
        user.campusId ? eq(transportRoutes.campusId, user.campusId) : undefined,
        eq(transportRoutes.status, "active"),
      ),
    }),
    getDb().query.students.findFirst({
      where: and(
        eq(students.id, input.studentId),
        eq(students.organizationId, user.organizationId),
        eq(students.status, "active"),
      ),
    }),
    getDb().query.transportStops.findFirst({
      where: and(
        eq(transportStops.id, input.stopId),
        eq(transportStops.organizationId, user.organizationId),
        user.campusId ? eq(transportStops.campusId, user.campusId) : undefined,
        eq(transportStops.status, "active"),
      ),
    }),
  ]);
  if (!route || !student || !stop)
    throw new AppError(
      "NOT_FOUND",
      "Route, student, or stop was not found in your tenant scope.",
      404,
    );
  assertCampusScope(user, student.campusId);
  if (route.campusId !== stop.campusId && route.campusId && stop.campusId)
    throw new AppError(
      "TENANT_SCOPE_ERROR",
      "Route and stop belong to different campuses.",
      403,
    );
  const [existing] = await getDb()
    .select({ id: routeAllocations.id })
    .from(routeAllocations)
    .where(
      and(
        eq(routeAllocations.organizationId, user.organizationId),
        eq(routeAllocations.studentId, student.id),
        eq(routeAllocations.status, "active"),
      ),
    )
    .limit(1);
  if (existing)
    throw new AppError(
      "CONFLICT",
      "Student already has an active transport allocation.",
      409,
    );
  const [countRow] = await getDb()
    .select({ value: count() })
    .from(routeAllocations)
    .where(
      and(
        eq(routeAllocations.organizationId, user.organizationId),
        eq(routeAllocations.routeId, route.id),
        eq(routeAllocations.status, "active"),
      ),
    );
  if ((countRow?.value ?? 0) >= route.capacity)
    throw new AppError("CONFLICT", "Route capacity has been reached.", 409);
  try {
    return await getDb().transaction(async (tx) => {
      const [allocation] = await tx
        .insert(routeAllocations)
        .values({
          id: createId("route_allocation"),
          organizationId: user.organizationId,
          campusId: student.campusId ?? route.campusId,
          routeId: route.id,
          studentId: student.id,
          stopId: stop.id,
          status: "active",
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning();
      if (!allocation)
        throw new AppError(
          "DATABASE_ERROR",
          "Unable to create route allocation.",
          500,
        );
      return allocation;
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (
      databaseErrorIncludes(
        error,
        "route capacity",
        "duplicate student",
        "active_student_unique",
      )
    ) {
      throw new AppError(
        "CONFLICT",
        "The student is already allocated or the route capacity has been reached.",
        409,
      );
    }
    throw error;
  }
}

export async function listRouteAllocations(user: CurrentUser) {
  const permittedStudentIds = await resolvePermittedStudentIds(user);
  if (permittedStudentIds !== undefined && permittedStudentIds.length === 0)
    return [];
  const rows = await getDb()
    .select({
      id: routeAllocations.id,
      routeId: routeAllocations.routeId,
      routeName: transportRoutes.name,
      studentId: routeAllocations.studentId,
      studentName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
      stopName: transportStops.name,
      createdAt: routeAllocations.createdAt,
    })
    .from(routeAllocations)
    .innerJoin(
      transportRoutes,
      and(
        eq(transportRoutes.id, routeAllocations.routeId),
        eq(transportRoutes.organizationId, user.organizationId),
      ),
    )
    .innerJoin(
      students,
      and(
        eq(students.id, routeAllocations.studentId),
        eq(students.organizationId, user.organizationId),
      ),
    )
    .innerJoin(
      transportStops,
      and(
        eq(transportStops.id, routeAllocations.stopId),
        eq(transportStops.organizationId, user.organizationId),
      ),
    )
    .where(
      and(
        eq(routeAllocations.organizationId, user.organizationId),
        user.campusId
          ? eq(routeAllocations.campusId, user.campusId)
          : undefined,
        eq(routeAllocations.status, "active"),
        permittedStudentIds
          ? inArray(routeAllocations.studentId, permittedStudentIds)
          : undefined,
      ),
    )
    .orderBy(desc(routeAllocations.createdAt))
    .limit(500);
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getTransportChecklist(
  user: CurrentUser,
  routeId: string,
  eventDateValue: Date,
  tripType: "morning" | "afternoon",
) {
  const permittedScope = await resolvePermittedTransportScope(user);
  if (permittedScope && !permittedScope.routeIds.includes(routeId)) {
    throw new AppError("FORBIDDEN", "This route is outside your transport scope.", 403);
  }
  const route = await getDb().query.transportRoutes.findFirst({ where: and(
    eq(transportRoutes.id, routeId),
    eq(transportRoutes.organizationId, user.organizationId),
    user.campusId ? eq(transportRoutes.campusId, user.campusId) : undefined,
    eq(transportRoutes.status, "active"),
  ) });
  if (!route) throw new AppError("NOT_FOUND", "Transport route not found.", 404);
  const eventDate = normalizeIndiaCalendarDate(eventDateValue);
  const [allocations, events] = await Promise.all([
    getDb().select({
      allocationId: routeAllocations.id,
      studentId: routeAllocations.studentId,
      studentName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
      stopId: routeAllocations.stopId,
      stopName: transportStops.name,
    }).from(routeAllocations)
      .innerJoin(students, and(
        eq(students.id, routeAllocations.studentId),
        eq(students.organizationId, user.organizationId),
      ))
      .innerJoin(transportStops, and(
        eq(transportStops.id, routeAllocations.stopId),
        eq(transportStops.organizationId, user.organizationId),
      ))
      .where(and(
        eq(routeAllocations.organizationId, user.organizationId),
        eq(routeAllocations.routeId, routeId),
        eq(routeAllocations.status, "active"),
      )).orderBy(asc(transportStops.name), asc(students.lastName)),
    getDb().select({
      id: transportBoardingEvents.id,
      studentId: transportBoardingEvents.studentId,
      stopId: transportBoardingEvents.stopId,
      eventType: transportBoardingEvents.eventType,
      note: transportBoardingEvents.note,
    }).from(transportBoardingEvents).where(and(
      eq(transportBoardingEvents.organizationId, user.organizationId),
      eq(transportBoardingEvents.routeId, routeId),
      eq(transportBoardingEvents.eventDate, eventDate),
      eq(transportBoardingEvents.tripType, tripType),
      eq(transportBoardingEvents.status, "active"),
    )),
  ]);
  const eventByStudent = new Map(events.map((event) => [event.studentId, event]));
  return {
    route: { id: route.id, name: route.name, vehicleId: route.vehicleId },
    eventDate: eventDate.toISOString(),
    tripType,
    students: allocations.map((allocation) => {
      const event = eventByStudent.get(allocation.studentId);
      return {
        ...allocation,
        eventId: event?.id ?? null,
        eventType: event?.eventType ?? null,
        note: event?.note ?? null,
      };
    }),
  };
}

export async function recordTransportLocation(
  user: CurrentUser,
  input: TransportLocationInput,
) {
  const permittedScope = await resolvePermittedTransportScope(user);
  if (permittedScope && !permittedScope.routeIds.includes(input.routeId)) {
    throw new AppError("FORBIDDEN", "This route is outside your transport scope.", 403);
  }
  const route = await getDb().query.transportRoutes.findFirst({ where: and(
    eq(transportRoutes.id, input.routeId),
    eq(transportRoutes.organizationId, user.organizationId),
    user.campusId ? eq(transportRoutes.campusId, user.campusId) : undefined,
    eq(transportRoutes.status, "active"),
  ) });
  if (!route) throw new AppError("NOT_FOUND", "Transport route not found.", 404);
  const recordedAt = input.recordedAt ?? new Date();
  if (recordedAt.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new AppError("VALIDATION_ERROR", "Location timestamp cannot be in the future.", 422);
  }
  const [row] = await getDb().insert(transportLocationUpdates).values({
    id: createId("transport_location"),
    organizationId: user.organizationId,
    campusId: route.campusId,
    routeId: route.id,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters: input.accuracyMeters ?? null,
    recordedAt,
    createdBy: user.id,
    updatedBy: user.id,
    status: "active",
  }).returning();
  return row;
}

export async function getLatestTransportLocation(
  user: CurrentUser,
  routeId: string,
) {
  const permittedScope = await resolvePermittedTransportScope(user);
  if (permittedScope && !permittedScope.routeIds.includes(routeId)) {
    throw new AppError("FORBIDDEN", "This route is outside your transport scope.", 403);
  }
  const row = await getDb().query.transportLocationUpdates.findFirst({ where: and(
    eq(transportLocationUpdates.organizationId, user.organizationId),
    eq(transportLocationUpdates.routeId, routeId),
    eq(transportLocationUpdates.status, "active"),
    user.campusId ? eq(transportLocationUpdates.campusId, user.campusId) : undefined,
  ), orderBy: (updates, { desc }) => [desc(updates.recordedAt)] });
  if (!row) return null;
  return {
    routeId: row.routeId,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracyMeters: row.accuracyMeters,
    recordedAt: row.recordedAt.toISOString(),
    stale: Date.now() - row.recordedAt.getTime() > 2 * 60 * 1000,
  };
}

export async function recordTransportBoardingEvent(
  user: CurrentUser,
  input: TransportBoardingEventInput,
) {
  const permittedScope = await resolvePermittedTransportScope(user);
  if (permittedScope && !permittedScope.routeIds.includes(input.routeId)) {
    throw new AppError("FORBIDDEN", "This route is outside your transport scope.", 403);
  }
  const allocation = await getDb().query.routeAllocations.findFirst({ where: and(
    eq(routeAllocations.organizationId, user.organizationId),
    eq(routeAllocations.routeId, input.routeId),
    eq(routeAllocations.studentId, input.studentId),
    eq(routeAllocations.stopId, input.stopId),
    eq(routeAllocations.status, "active"),
    user.campusId ? eq(routeAllocations.campusId, user.campusId) : undefined,
  ) });
  if (!allocation) throw new AppError("NOT_FOUND", "Active route allocation not found.", 404);
  const eventDate = normalizeIndiaCalendarDate(input.eventDate);
  const existing = await getDb().query.transportBoardingEvents.findFirst({ where: and(
    eq(transportBoardingEvents.organizationId, user.organizationId),
    eq(transportBoardingEvents.routeId, input.routeId),
    eq(transportBoardingEvents.studentId, input.studentId),
    eq(transportBoardingEvents.eventDate, eventDate),
    eq(transportBoardingEvents.tripType, input.tripType),
  ) });
  if (existing) {
    const [updated] = await getDb().update(transportBoardingEvents).set({
      stopId: input.stopId,
      eventType: input.eventType,
      note: input.note || null,
      updatedAt: new Date(),
      updatedBy: user.id,
      status: "active",
    }).where(and(
      eq(transportBoardingEvents.id, existing.id),
      eq(transportBoardingEvents.organizationId, user.organizationId),
    )).returning();
    if (updated && existing.eventType !== input.eventType) {
      await notifyTransportEvent(user, updated);
    }
    return updated;
  }
  const [created] = await getDb().insert(transportBoardingEvents).values({
    id: createId("transport_event"),
    organizationId: user.organizationId,
    campusId: allocation.campusId,
    routeId: input.routeId,
    studentId: input.studentId,
    stopId: input.stopId,
    eventDate,
    tripType: input.tripType,
    eventType: input.eventType,
    note: input.note || null,
    createdBy: user.id,
    updatedBy: user.id,
    status: "active",
  }).returning();
  if (created) await notifyTransportEvent(user, created);
  return created;
}

async function notifyTransportEvent(
  user: CurrentUser,
  event: typeof transportBoardingEvents.$inferSelect,
) {
  try {
    const [student, recipients] = await Promise.all([
      getDb().query.students.findFirst({ where: and(
        eq(students.id, event.studentId),
        eq(students.organizationId, user.organizationId),
      ) }),
      getDb().select({ userId: users.id }).from(studentGuardianLinks).innerJoin(users, and(
        eq(users.organizationId, user.organizationId),
        eq(users.linkedGuardianId, studentGuardianLinks.guardianId),
        eq(users.role, "parent"),
        eq(users.status, "active"),
      )).where(and(
        eq(studentGuardianLinks.organizationId, user.organizationId),
        eq(studentGuardianLinks.studentId, event.studentId),
      )),
    ]);
    const recipientUserIds = [...new Set(recipients.map((recipient) => recipient.userId))];
    if (!student || recipientUserIds.length === 0) return;
    const eventLabel = event.eventType === "boarded"
      ? "boarded"
      : event.eventType === "dropped"
        ? "was dropped off"
        : event.eventType === "absent"
          ? "was marked absent"
          : "could not board";
    const subject = "Transport update";
    const body = `${student.firstName} ${student.lastName} ${eventLabel} at ${formatIndiaDateTime(event.updatedAt)}.`;
    const now = new Date();
    const [message] = await getDb().insert(messages).values({
      id: createId("message"),
      organizationId: user.organizationId,
      campusId: event.campusId,
      subject,
      body,
      audienceJson: JSON.stringify({ type: "users", role: null, userIds: recipientUserIds }),
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
      createdBy: user.id,
      updatedBy: user.id,
      status: "published",
    }).returning();
    if (!message) return;
    await getDb().insert(notificationEvents).values(recipientUserIds.map((recipientUserId) => ({
      id: createId("notification"),
      organizationId: user.organizationId,
      campusId: event.campusId,
      messageId: message.id,
      recipientUserId,
      channel: "in_app",
      payloadJson: JSON.stringify({
        type: "transport",
        route: "/transport",
        entity_id: event.routeId,
        tenant_id: user.organizationId,
        campus_id: event.campusId,
      }),
      sentAt: now,
      createdAt: now,
      updatedAt: now,
      createdBy: user.id,
      updatedBy: user.id,
      status: "sent",
    })));
    await sendUserPush(
      recipientUserIds,
      subject,
      body,
      {
        type: "transport",
        route: "/transport",
        entity_id: event.routeId,
        tenant_id: user.organizationId,
        ...(event.campusId != null ? { campus_id: event.campusId } : {}),
      },
    );
  } catch {
    // Operational notifications must not roll back a persisted boarding event.
  }
}

export async function getTransportManifest(user: CurrentUser, routeId: string) {
  const route = await getDb().query.transportRoutes.findFirst({
    where: and(
      eq(transportRoutes.id, routeId),
      eq(transportRoutes.organizationId, user.organizationId),
      user.campusId ? eq(transportRoutes.campusId, user.campusId) : undefined,
    ),
  });
  if (!route)
    throw new AppError("NOT_FOUND", "Transport route not found.", 404);
  const rows = await getDb()
    .select({
      route: transportRoutes.name,
      student: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
      admissionNumber: students.admissionNumber,
      stop: transportStops.name,
    })
    .from(routeAllocations)
    .innerJoin(
      transportRoutes,
      and(
        eq(transportRoutes.id, routeAllocations.routeId),
        eq(transportRoutes.organizationId, user.organizationId),
      ),
    )
    .innerJoin(
      students,
      and(
        eq(students.id, routeAllocations.studentId),
        eq(students.organizationId, user.organizationId),
      ),
    )
    .innerJoin(
      transportStops,
      and(
        eq(transportStops.id, routeAllocations.stopId),
        eq(transportStops.organizationId, user.organizationId),
      ),
    )
    .where(
      and(
        eq(routeAllocations.organizationId, user.organizationId),
        eq(routeAllocations.routeId, route.id),
        eq(routeAllocations.status, "active"),
      ),
    )
    .orderBy(asc(transportStops.name), asc(students.lastName));
  return { route, rows };
}
