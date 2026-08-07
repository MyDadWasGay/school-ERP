import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { OrganizationStatus } from "@/config/organization-status";
import { auditColumns, idColumn, tenantColumns, statusColumn } from "./shared";

export const organizations = sqliteTable("organizations", {
  id: idColumn("org"), name: text("name").notNull(), slug: text("slug").notNull(), timezone: text("timezone").notNull().default("Asia/Kolkata"), currency: text("currency").notNull().default("INR"), ...auditColumns(), status: statusColumn().$type<OrganizationStatus>(),
}, (table) => [uniqueIndex("organizations_slug_unique").on(table.slug)]);

export const campuses = sqliteTable("campuses", {
  id: idColumn("campus"), ...tenantColumns(), name: text("name").notNull(), code: text("code").notNull(), address: text("address"), ...auditColumns(), status: statusColumn(),
}, (table) => [index("campuses_org_idx").on(table.organizationId), uniqueIndex("campuses_org_code_unique").on(table.organizationId, table.code)]);

export const academicYears = sqliteTable("academic_years", {
  id: idColumn("year"), ...tenantColumns(), name: text("name").notNull(), startsOn: integer("starts_on", { mode: "timestamp" }).notNull(), endsOn: integer("ends_on", { mode: "timestamp" }).notNull(), isActive: integer("is_active", { mode: "boolean" }).notNull().default(false), ...auditColumns(), status: statusColumn(),
}, (table) => [index("academic_years_org_idx").on(table.organizationId), index("academic_years_active_idx").on(table.organizationId, table.isActive)]);

export const terms = sqliteTable("terms", {
  id: idColumn("term"), ...tenantColumns(), academicYearId: text("academic_year_id").notNull(), name: text("name").notNull(), startsOn: integer("starts_on", { mode: "timestamp" }).notNull(), endsOn: integer("ends_on", { mode: "timestamp" }).notNull(), ...auditColumns(), status: statusColumn(),
}, (table) => [index("terms_year_idx").on(table.organizationId, table.academicYearId)]);

export const classes = sqliteTable("classes", {
  id: idColumn("class"), ...tenantColumns(), name: text("name").notNull(), code: text("code").notNull(), sortOrder: integer("sort_order").notNull().default(0), ...auditColumns(), status: statusColumn(),
}, (table) => [index("classes_org_idx").on(table.organizationId), uniqueIndex("classes_org_code_unique").on(table.organizationId, table.code)]);

export const sections = sqliteTable("sections", {
  id: idColumn("section"), ...tenantColumns(), classId: text("class_id").notNull(), name: text("name").notNull(), capacity: integer("capacity").notNull().default(40), ...auditColumns(), status: statusColumn(),
}, (table) => [index("sections_class_idx").on(table.organizationId, table.classId), uniqueIndex("sections_class_name_unique").on(table.classId, table.name)]);

export const subjects = sqliteTable("subjects", {
  id: idColumn("subject"), ...tenantColumns(), name: text("name").notNull(), code: text("code").notNull(), isOptional: integer("is_optional", { mode: "boolean" }).notNull().default(false), ...auditColumns(), status: statusColumn(),
}, (table) => [index("subjects_org_idx").on(table.organizationId), uniqueIndex("subjects_org_code_unique").on(table.organizationId, table.code)]);

export const houses = sqliteTable("houses", {
  id: idColumn("house"), ...tenantColumns(), name: text("name").notNull(), color: text("color"), ...auditColumns(), status: statusColumn(),
}, (table) => [index("houses_org_idx").on(table.organizationId)]);

export const departments = sqliteTable("departments", {
  id: idColumn("department"), ...tenantColumns(), name: text("name").notNull(), ...auditColumns(), status: statusColumn(),
}, (table) => [index("departments_org_idx").on(table.organizationId)]);
