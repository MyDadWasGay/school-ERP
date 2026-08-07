import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { integrationConfigs, integrationLogs } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { encryptSecret } from "@/lib/security/secret-box";
import type { CurrentUser } from "@/lib/auth/types";
import type { IntegrationConfigInput } from "../schemas/integration.schema";

export async function saveIntegrationConfig(user: CurrentUser, input: IntegrationConfigInput) {
  const encrypted = encryptSecret(JSON.stringify(input.config));
  return getDb().transaction(async (tx) => {
    const existing = await tx.query.integrationConfigs.findFirst({ where: and(
      eq(integrationConfigs.organizationId, user.organizationId),
      eq(integrationConfigs.provider, input.provider),
      user.campusId ? eq(integrationConfigs.campusId, user.campusId) : undefined,
    ) });
    if (existing) {
      const [row] = await tx.update(integrationConfigs).set({ configJson: encrypted, status: "configured", updatedAt: new Date(), updatedBy: user.id }).where(and(
        eq(integrationConfigs.id, existing.id), eq(integrationConfigs.organizationId, user.organizationId),
      )).returning();
      return row;
    }
    const [row] = await tx.insert(integrationConfigs).values({
      organizationId: user.organizationId, campusId: user.campusId, provider: input.provider,
      configJson: encrypted, status: "configured", createdBy: user.id, updatedBy: user.id,
    }).returning();
    return row;
  });
}

export async function listIntegrationConfigs(user: CurrentUser) {
  const rows = await getDb().select({ id: integrationConfigs.id, provider: integrationConfigs.provider, status: integrationConfigs.status, updatedAt: integrationConfigs.updatedAt }).from(integrationConfigs).where(and(
    eq(integrationConfigs.organizationId, user.organizationId),
    user.campusId ? eq(integrationConfigs.campusId, user.campusId) : undefined,
  )).orderBy(integrationConfigs.provider);
  return rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toLocaleString() }));
}

export async function setIntegrationStatus(user: CurrentUser, id: string, status: "configured" | "disabled") {
  const [row] = await getDb().update(integrationConfigs).set({ status, updatedAt: new Date(), updatedBy: user.id }).where(and(
    eq(integrationConfigs.id, id), eq(integrationConfigs.organizationId, user.organizationId),
    user.campusId ? eq(integrationConfigs.campusId, user.campusId) : undefined,
  )).returning({ id: integrationConfigs.id, provider: integrationConfigs.provider, status: integrationConfigs.status });
  if (!row) throw new AppError("NOT_FOUND", "Integration configuration not found.", 404);
  return row;
}

export async function listIntegrationLogs(user: CurrentUser) {
  const rows = await getDb().select({ id: integrationLogs.id, provider: integrationLogs.provider, eventType: integrationLogs.eventType, error: integrationLogs.error, status: integrationLogs.status, createdAt: integrationLogs.createdAt }).from(integrationLogs).where(and(
    eq(integrationLogs.organizationId, user.organizationId),
    user.campusId ? eq(integrationLogs.campusId, user.campusId) : undefined,
  )).orderBy(desc(integrationLogs.createdAt)).limit(100);
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toLocaleString() }));
}
