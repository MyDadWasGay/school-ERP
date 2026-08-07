import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, tenantColumns, statusColumn } from "./shared";
export const alumniProfiles = sqliteTable("alumni_profiles", { id: idColumn("alumni"), ...tenantColumns(), studentId: text("student_id"), name: text("name").notNull(), graduationYear: text("graduation_year"), directoryVisible: integer("directory_visible", { mode: "boolean" }).notNull().default(false), ...auditColumns(), status: statusColumn() }, (table) => [index("alumni_org_idx").on(table.organizationId, table.status)]);
