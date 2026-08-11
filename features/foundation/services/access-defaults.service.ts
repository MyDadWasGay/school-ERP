import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { permissions, rolePermissions, roles } from "@/db/schema";
import { permissionKeys, rolePermissionDefaults } from "@/config/permissions";
import { SUPPORTED_ROLES } from "@/config/constants";
import { createId } from "@/lib/utils/ids";

type DatabaseTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/**
 * Creates or repairs the persisted access catalog for one organization.
 * Permission definitions are global; role records and role mappings are tenant-owned.
 */
export async function ensureOrganizationAccessDefaults(
  tx: DatabaseTransaction,
  organizationId: string,
  actorId: string,
) {
  const permissionRows = permissionKeys.map((key) => {
    const [module, action] = key.split(":");
    return {
      id: `permission-${key.replaceAll(":", "-")}`,
      key,
      name: key,
      module: module ?? "system",
      action: action ?? "read",
      createdBy: actorId,
      updatedBy: actorId,
    };
  });
  await tx.insert(permissions).values(permissionRows).onConflictDoNothing();

  const persistedPermissions = await tx.select({ id: permissions.id, key: permissions.key })
    .from(permissions)
    .where(inArray(permissions.key, permissionKeys));
  const permissionIdByKey = new Map(persistedPermissions.map((row) => [row.key, row.id]));

  const existingRoles = await tx.select({ id: roles.id, key: roles.key })
    .from(roles)
    .where(eq(roles.organizationId, organizationId));
  const roleIdByKey = new Map(existingRoles.map((row) => [row.key, row.id]));
  const missingRoleRows = SUPPORTED_ROLES.filter((key) => !roleIdByKey.has(key)).map((key) => ({
    id: createId("role"),
    organizationId,
    key,
    name: key.replaceAll("_", " "),
    isSystem: true,
    createdBy: actorId,
    updatedBy: actorId,
  }));
  if (missingRoleRows.length > 0) {
    await tx.insert(roles).values(missingRoleRows).onConflictDoNothing();
  }

  const persistedRoles = await tx.select({ id: roles.id, key: roles.key })
    .from(roles)
    .where(eq(roles.organizationId, organizationId));
  const persistedRoleIdByKey = new Map(persistedRoles.map((row) => [row.key, row.id]));
  const mappings = SUPPORTED_ROLES.flatMap((role) => (rolePermissionDefaults[role] ?? [])
    .filter((key) => key !== "*")
    .map((key) => ({
      organizationId,
      roleId: persistedRoleIdByKey.get(role),
      permissionId: permissionIdByKey.get(key),
      createdBy: actorId,
      updatedBy: actorId,
    })))
    .filter((row): row is typeof row & { roleId: string; permissionId: string } => Boolean(row.roleId && row.permissionId));
  if (mappings.length > 0) await tx.insert(rolePermissions).values(mappings).onConflictDoNothing();
}
