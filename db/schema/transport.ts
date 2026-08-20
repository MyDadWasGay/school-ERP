import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, tenantColumns, statusColumn } from "./shared";
export const transportStops = sqliteTable(
  "transport_stops",
  {
    id: idColumn("stop"),
    ...tenantColumns(),
    name: text("name").notNull(),
    address: text("address"),
    ...auditColumns(),
    status: statusColumn(),
  },
  (table) => [index("stops_org_idx").on(table.organizationId)],
);
export const routeAllocations = sqliteTable(
  "route_allocations",
  {
    id: idColumn("route_allocation"),
    ...tenantColumns(),
    routeId: text("route_id").notNull(),
    studentId: text("student_id").notNull(),
    stopId: text("stop_id").notNull(),
    ...auditColumns(),
    status: statusColumn(),
  },
  (table) => [
    index("route_allocations_student_idx").on(
      table.organizationId,
      table.studentId,
    ),
    index("route_allocations_route_idx").on(
      table.organizationId,
      table.routeId,
      table.status,
    ),
    uniqueIndex("route_allocations_active_student_unique")
      .on(table.organizationId, table.studentId)
      .where(sql`${table.status} = 'active'`),
  ],
);

export const transportBoardingEvents = sqliteTable(
  "transport_boarding_events",
  {
    id: idColumn("transport_event"),
    ...tenantColumns(),
    routeId: text("route_id").notNull(),
    studentId: text("student_id").notNull(),
    stopId: text("stop_id").notNull(),
    eventDate: integer("event_date", { mode: "timestamp" }).notNull(),
    tripType: text("trip_type").notNull().default("morning"),
    eventType: text("event_type").notNull(),
    note: text("note"),
    ...auditColumns(),
    status: statusColumn(),
  },
  (table) => [
    uniqueIndex("transport_boarding_event_unique").on(
      table.organizationId,
      table.routeId,
      table.studentId,
      table.eventDate,
      table.tripType,
    ),
    index("transport_boarding_event_route_idx").on(
      table.organizationId,
      table.routeId,
      table.eventDate,
    ),
  ],
);

export const transportLocationUpdates = sqliteTable(
  "transport_location_updates",
  {
    id: idColumn("transport_location"),
    ...tenantColumns(),
    routeId: text("route_id").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    accuracyMeters: real("accuracy_meters"),
    recordedAt: integer("recorded_at", { mode: "timestamp" }).notNull(),
    ...auditColumns(),
    status: statusColumn(),
  },
  (table) => [
    index("transport_location_route_idx").on(
      table.organizationId,
      table.routeId,
      table.recordedAt,
    ),
  ],
);
