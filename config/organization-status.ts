export const ORGANIZATION_STATUSES = [
  "provisioning",
  "active",
  "suspended",
  "archived",
  "deletion_scheduled",
] as const;

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

const allowedTransitions: Record<OrganizationStatus, readonly OrganizationStatus[]> = {
  provisioning: ["active"],
  active: ["suspended", "archived"],
  suspended: ["active", "archived"],
  archived: ["active", "deletion_scheduled"],
  deletion_scheduled: ["archived"],
};

export function isOrganizationStatus(value: string): value is OrganizationStatus {
  return (ORGANIZATION_STATUSES as readonly string[]).includes(value);
}

export function getAllowedOrganizationStatusTransitions(status: string): OrganizationStatus[] {
  return isOrganizationStatus(status) ? [...allowedTransitions[status]] : [];
}

export function canTransitionOrganizationStatus(from: string, to: string): boolean {
  if (!isOrganizationStatus(from) || !isOrganizationStatus(to)) return false;
  return from === to || allowedTransitions[from].includes(to);
}
