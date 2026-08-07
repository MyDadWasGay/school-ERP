import type { CurrentUser } from "@/lib/auth/types";
import type { AuditInput } from "./audit-log.types";

export function buildAuditRecord(user: CurrentUser, input: AuditInput) {
  return {
    organizationId: user.organizationId,
    campusId: input.campusId ?? user.campusId,
    actorUserId: user.id,
    actorRole: user.role,
    action: input.action,
    module: input.module,
    entityType: input.entityType,
    entityId: input.entityId,
    beforeJson: input.before === undefined ? undefined : JSON.stringify(input.before),
    afterJson: input.after === undefined ? undefined : JSON.stringify(input.after),
    metadataJson: input.metadata === undefined ? undefined : JSON.stringify(input.metadata),
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    createdBy: user.id,
    updatedBy: user.id,
  };
}
