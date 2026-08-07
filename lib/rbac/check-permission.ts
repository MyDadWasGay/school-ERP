import type { CurrentUser } from "@/lib/auth/types";
import { hasPermission, type PermissionCheckResult } from "./permissions";

export function checkPermission(user: CurrentUser, permission: string): PermissionCheckResult {
  if (hasPermission(user, permission)) return { allowed: true };
  return { allowed: false, reason: `Missing permission: ${permission}` };
}
