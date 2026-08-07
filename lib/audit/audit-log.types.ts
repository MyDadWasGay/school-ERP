import type { AuditAction } from "@/config/constants";

export type AuditInput = {
  action: AuditAction;
  module: string;
  entityType: string;
  entityId?: string;
  campusId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
};
