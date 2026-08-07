import type { CurrentUser } from "@/lib/auth/types";

export type PermissionCheckResult = { allowed: boolean; reason?: string };

export function hasPermission(user: Pick<CurrentUser, "permissions" | "role">, permission: string) {
  // Keep authorization data-driven. The super_admin role receives its
  // permissions from the tenant role defaults or persisted assignments; the
  // role name itself must not become a global bypass.
  return user.permissions.includes("*") || user.permissions.includes(permission);
}
