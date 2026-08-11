import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, tenantColumns, statusColumn } from "./shared";

export const hostelRooms = sqliteTable(
  "hostel_rooms",
  {
    id: idColumn("hostel_room"),
    ...tenantColumns(),
    building: text("building").notNull(),
    floor: text("floor"),
    roomNumber: text("room_number").notNull(),
    capacity: integer("capacity").notNull(),
    ...auditColumns(),
    status: statusColumn(),
  },
  (table) => [index("hostel_rooms_org_idx").on(table.organizationId)],
);

export const hostelAllotments = sqliteTable(
  "hostel_allotments",
  {
    id: idColumn("hostel_allotment"),
    ...tenantColumns(),
    roomId: text("room_id").notNull(),
    bedId: text("bed_id"),
    studentId: text("student_id").notNull(),
    allottedOn: integer("allotted_on", { mode: "timestamp" }).notNull(),
    checkedOutOn: integer("checked_out_on", { mode: "timestamp" }),
    ...auditColumns(),
    status: statusColumn("active"),
  },
  (table) => [
    index("hostel_allotments_student_idx").on(
      table.organizationId,
      table.studentId,
    ),
    index("hostel_allotments_room_idx").on(
      table.organizationId,
      table.roomId,
      table.status,
    ),
    index("hostel_allotments_bed_idx").on(
      table.organizationId,
      table.bedId,
      table.status,
    ),
    uniqueIndex("hostel_active_student_unique")
      .on(table.organizationId, table.studentId)
      .where(sql`${table.status} = 'active'`),
    uniqueIndex("hostel_active_bed_unique")
      .on(table.organizationId, table.bedId)
      .where(sql`${table.status} = 'active' AND ${table.bedId} IS NOT NULL`),
  ],
);
