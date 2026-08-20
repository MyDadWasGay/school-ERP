import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, tenantColumns, statusColumn } from "./shared";

export const users = sqliteTable("users", {
  id: idColumn("user"), firebaseUid: text("firebase_uid").notNull(), ...tenantColumns(), email: text("email").notNull(), displayName: text("display_name").notNull(), role: text("role").notNull(), linkedStudentId: text("linked_student_id"), linkedEmployeeId: text("linked_employee_id"), linkedGuardianId: text("linked_guardian_id"), emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false), ...auditColumns(), status: statusColumn(),
}, (table) => [
  uniqueIndex("users_firebase_uid_unique").on(table.firebaseUid),
  index("users_org_idx").on(table.organizationId),
  index("users_email_idx").on(table.email),
  index("users_linked_student_idx").on(table.organizationId, table.linkedStudentId),
  index("users_linked_guardian_idx").on(table.organizationId, table.linkedGuardianId),
  index("users_linked_employee_idx").on(table.organizationId, table.linkedEmployeeId),
]);

/** Platform identities intentionally have no organization boundary. */
export const platformAdmins = sqliteTable("platform_admins", {
  id: idColumn("platform_admin"), firebaseUid: text("firebase_uid").notNull(), email: text("email").notNull(), displayName: text("display_name").notNull(), emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false), ...auditColumns(), status: statusColumn(),
}, (table) => [uniqueIndex("platform_admins_firebase_uid_unique").on(table.firebaseUid), uniqueIndex("platform_admins_email_unique").on(table.email), index("platform_admins_status_idx").on(table.status)]);

export const roles = sqliteTable("roles", {
  id: idColumn("role"), ...tenantColumns(), key: text("key").notNull(), name: text("name").notNull(), description: text("description"), isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false), ...auditColumns(), status: statusColumn(),
}, (table) => [uniqueIndex("roles_org_key_unique").on(table.organizationId, table.key)]);

export const permissions = sqliteTable("permissions", {
  id: idColumn("permission"), key: text("key").notNull(), name: text("name").notNull(), module: text("module").notNull(), action: text("action").notNull(), ...auditColumns(), status: statusColumn(),
}, (table) => [uniqueIndex("permissions_key_unique").on(table.key)]);

export const rolePermissions = sqliteTable("role_permissions", {
  organizationId: text("organization_id").notNull(), roleId: text("role_id").notNull(), permissionId: text("permission_id").notNull(), ...auditColumns(),
}, (table) => [primaryKey({ columns: [table.roleId, table.permissionId] }), index("role_permissions_org_idx").on(table.organizationId)]);

export const userRoles = sqliteTable("user_roles", {
  organizationId: text("organization_id").notNull(), userId: text("user_id").notNull(), roleId: text("role_id").notNull(), ...auditColumns(),
}, (table) => [primaryKey({ columns: [table.userId, table.roleId] }), index("user_roles_org_idx").on(table.organizationId)]);

export const userCampusScopes = sqliteTable("user_campus_scopes", {
  organizationId: text("organization_id").notNull(), userId: text("user_id").notNull(), campusId: text("campus_id").notNull(), ...auditColumns(),
}, (table) => [primaryKey({ columns: [table.userId, table.campusId] }), index("user_campus_scopes_org_idx").on(table.organizationId)]);

export const userClassSectionScopes = sqliteTable("user_class_section_scopes", {
  organizationId: text("organization_id").notNull(), userId: text("user_id").notNull(), classId: text("class_id").notNull(), sectionId: text("section_id").notNull().default("*"), ...auditColumns(),
}, (table) => [primaryKey({ columns: [table.userId, table.classId, table.sectionId] }), index("user_class_scopes_org_idx").on(table.organizationId)]);

export const delegatedAccess = sqliteTable("delegated_access", {
  id: idColumn("delegation"), ...tenantColumns(), userId: text("user_id").notNull(), permissionKey: text("permission_key").notNull(), startsAt: integer("starts_at", { mode: "timestamp" }).notNull(), endsAt: integer("ends_at", { mode: "timestamp" }).notNull(), grantedBy: text("granted_by").notNull(), ...auditColumns(), status: statusColumn(),
}, (table) => [index("delegated_access_user_idx").on(table.organizationId, table.userId, table.status)]);

export const sessionLogs = sqliteTable("session_logs", {
  id: idColumn("session"), ...tenantColumns(), userId: text("user_id").notNull(), firebaseSessionId: text("firebase_session_id"), ipAddress: text("ip_address"), userAgent: text("user_agent"), expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(), revokedAt: integer("revoked_at", { mode: "timestamp" }), ...auditColumns(), status: statusColumn(),
}, (table) => [index("session_logs_user_idx").on(table.organizationId, table.userId, table.status)]);

/** Platform sessions are deliberately separate because platform identities have no tenant. */
export const platformSessionLogs = sqliteTable("platform_session_logs", {
  id: idColumn("platform_session"), platformAdminId: text("platform_admin_id").notNull(), firebaseSessionId: text("firebase_session_id").notNull(), ipAddress: text("ip_address"), userAgent: text("user_agent"), expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(), revokedAt: integer("revoked_at", { mode: "timestamp" }), ...auditColumns(), status: statusColumn(),
}, (table) => [uniqueIndex("platform_session_fingerprint_unique").on(table.firebaseSessionId), index("platform_session_admin_idx").on(table.platformAdminId, table.status)]);

export const invitationTokens = sqliteTable("invitation_tokens", {
  id: idColumn("invitation"), ...tenantColumns(), userId: text("user_id").notNull(), tokenHash: text("token_hash").notNull(), expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(), acceptedAt: integer("accepted_at", { mode: "timestamp" }), revokedAt: integer("revoked_at", { mode: "timestamp" }), ...auditColumns(), status: statusColumn("active"),
}, (table) => [uniqueIndex("invitation_token_hash_unique").on(table.tokenHash), index("invitation_user_status_idx").on(table.organizationId, table.userId, table.status)]);

export const loginAudits = sqliteTable("login_audits", {
  id: idColumn("login"), ...tenantColumns(), userId: text("user_id"), email: text("email").notNull(), ipAddress: text("ip_address"), userAgent: text("user_agent"), success: integer("success", { mode: "boolean" }).notNull(), ...auditColumns(),
}, (table) => [index("login_audits_org_idx").on(table.organizationId, table.createdAt)]);
