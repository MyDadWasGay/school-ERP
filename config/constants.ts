export const APP_NAME = "School ERP";
export const PLATFORM_ADMIN_ROLE = "PLATFORM_ADMIN" as const;
export const SESSION_COOKIE = "school_erp_session";
export const ACTIVE_CAMPUS_COOKIE = "school_erp_active_campus";
export const CSRF_COOKIE = "school_erp_csrf";
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const ATTENDANCE_DIRECT_EDIT_HOURS = 24;
export const SUPPORTED_ROLES = [
  "super_admin", "management", "principal", "office_staff", "teacher", "accountant",
  "librarian", "transport_staff", "hostel_warden", "parent", "student", "alumni",
] as const;
export type RoleKey = (typeof SUPPORTED_ROLES)[number];

export const AUDIT_ACTIONS = [
  "create", "update", "delete", "approve", "reject", "import", "export", "login",
  "upload", "download", "view_sensitive", "collect_payment", "refund_payment", "publish_result",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
