import { sql } from "drizzle-orm";
import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
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
