import type { RoleKey } from "@/config/constants";
import { AppError } from "@/lib/errors/app-error";

export type PortalKind = "teacher" | "parent" | "student";

const supervisoryRoles = new Set<RoleKey>([
  "super_admin",
  "management",
  "principal",
]);

/** Server-side direct-URL boundary for role-specific portals. */
export function canAccessPortal(role: RoleKey, portal: PortalKind) {
  return supervisoryRoles.has(role) || role === portal;
}

export function assertPortalAccess(role: RoleKey, portal: PortalKind) {
  if (!canAccessPortal(role, portal)) {
    throw new AppError(
      "FORBIDDEN",
      `Your account cannot open the ${portal} portal.`,
      403,
    );
  }
}
