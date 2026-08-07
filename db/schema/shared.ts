import { integer, text } from "drizzle-orm/sqlite-core";
import { createId } from "@/lib/utils/ids";

export function tenantColumns() {
  return {
    organizationId: text("organization_id").notNull(),
    campusId: text("campus_id"),
  };
}

export function auditColumns() {
  return {
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
  };
}

export function idColumn(prefix: string) {
  return text("id").primaryKey().$defaultFn(() => createId(prefix));
}

export const statusColumn = (defaultValue = "active") => text("status").notNull().default(defaultValue);
