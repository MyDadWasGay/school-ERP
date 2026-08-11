import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  apiKeys,
  integrationConfigs,
  integrationLogs,
  webhookEvents,
} from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { databaseErrorIncludes } from "@/lib/errors/database-error";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-box";
import { createId } from "@/lib/utils/ids";
import type { CurrentUser } from "@/lib/auth/types";
import type {
  ApiKeyCreateInput,
  IntegrationConfigInput,
} from "../schemas/integration.schema";

export async function saveIntegrationConfig(
  user: CurrentUser,
  input: IntegrationConfigInput,
) {
  if (input.provider.toLowerCase() === "razorpay")
    throw new AppError(
      "VALIDATION_ERROR",
      "Use the dedicated Razorpay configuration form.",
      422,
    );
  const encrypted = encryptSecret(JSON.stringify(input.config));
  return getDb().transaction(async (tx) => {
    const existing = await tx.query.integrationConfigs.findFirst({
      where: and(
        eq(integrationConfigs.organizationId, user.organizationId),
        eq(integrationConfigs.provider, input.provider),
        user.campusId
          ? eq(integrationConfigs.campusId, user.campusId)
          : undefined,
      ),
    });
    if (existing) {
      const [row] = await tx
        .update(integrationConfigs)
        .set({
          configJson: encrypted,
          status: "configured",
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(
          and(
            eq(integrationConfigs.id, existing.id),
            eq(integrationConfigs.organizationId, user.organizationId),
          ),
        )
        .returning();
      return row;
    }
    const [row] = await tx
      .insert(integrationConfigs)
      .values({
        organizationId: user.organizationId,
        campusId: user.campusId,
        provider: input.provider,
        configJson: encrypted,
        status: "configured",
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();
    return row;
  });
}

export async function listIntegrationConfigs(user: CurrentUser) {
  const rows = await getDb()
    .select({
      id: integrationConfigs.id,
      provider: integrationConfigs.provider,
      status: integrationConfigs.status,
      updatedAt: integrationConfigs.updatedAt,
    })
    .from(integrationConfigs)
    .where(
      and(
        eq(integrationConfigs.organizationId, user.organizationId),
        user.campusId
          ? or(
              eq(integrationConfigs.campusId, user.campusId),
              isNull(integrationConfigs.campusId),
            )
          : undefined,
      ),
    )
    .orderBy(integrationConfigs.provider);
  return rows.map((row) => ({
    ...row,
    updatedAt: row.updatedAt.toLocaleString(),
  }));
}

/** Read tenant-scoped provider settings only inside the API boundary. Secrets
 * are decrypted for the adapter and are never returned by a web route. */
export async function loadIntegrationProviderConfig(input: {
  organizationId: string;
  provider: string;
  campusId?: string;
}) {
  const row = await getDb().query.integrationConfigs.findFirst({
    where: and(
      eq(integrationConfigs.organizationId, input.organizationId),
      eq(integrationConfigs.provider, input.provider),
      eq(integrationConfigs.status, "configured"),
      input.campusId
        ? or(eq(integrationConfigs.campusId, input.campusId), isNull(integrationConfigs.campusId))
        : undefined,
    ),
  });
  if (!row) throw new AppError("PROVIDER_NOT_CONFIGURED", `${input.provider} is not configured for this school.`, 503);
  try {
    const value = JSON.parse(decryptSecret(row.configJson)) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid provider configuration");
    return value as Record<string, string>;
  } catch {
    throw new AppError("PROVIDER_NOT_CONFIGURED", `${input.provider} configuration cannot be read.`, 503);
  }
}

export async function setIntegrationStatus(
  user: CurrentUser,
  id: string,
  status: "configured" | "disabled",
) {
  const [row] = await getDb()
    .update(integrationConfigs)
    .set({ status, updatedAt: new Date(), updatedBy: user.id })
    .where(
      and(
        eq(integrationConfigs.id, id),
        eq(integrationConfigs.organizationId, user.organizationId),
        user.campusId
          ? or(
              eq(integrationConfigs.campusId, user.campusId),
              isNull(integrationConfigs.campusId),
            )
          : undefined,
      ),
    )
    .returning({
      id: integrationConfigs.id,
      provider: integrationConfigs.provider,
      status: integrationConfigs.status,
    });
  if (!row)
    throw new AppError(
      "NOT_FOUND",
      "Integration configuration not found.",
      404,
    );
  return row;
}

export async function listIntegrationLogs(user: CurrentUser) {
  const rows = await getDb()
    .select({
      id: integrationLogs.id,
      provider: integrationLogs.provider,
      eventType: integrationLogs.eventType,
      error: integrationLogs.error,
      status: integrationLogs.status,
      createdAt: integrationLogs.createdAt,
    })
    .from(integrationLogs)
    .where(
      and(
        eq(integrationLogs.organizationId, user.organizationId),
        user.campusId ? eq(integrationLogs.campusId, user.campusId) : undefined,
      ),
    )
    .orderBy(desc(integrationLogs.createdAt))
    .limit(100);
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toLocaleString(),
  }));
}

export async function createApiKey(
  user: CurrentUser,
  input: ApiKeyCreateInput,
) {
  const rawKey = `serp_${randomBytes(32).toString("base64url")}`;
  const prefix = rawKey.slice(0, 16);
  const hash = createHash("sha256").update(rawKey).digest("hex");
  const [row] = await getDb()
    .insert(apiKeys)
    .values({
      id: createId("api_key"),
      organizationId: user.organizationId,
      campusId: user.campusId,
      name: input.name,
      code: prefix,
      detailsJson: JSON.stringify({
        hash,
        lastFour: rawKey.slice(-4),
        scopes: ["webhooks:receive"],
        issuedAt: new Date().toISOString(),
      }),
      status: "active",
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning();
  if (!row)
    throw new AppError("DATABASE_ERROR", "Unable to create API key.", 500);
  return { id: row.id, name: row.name, prefix, secret: rawKey };
}

export async function listApiKeys(user: CurrentUser) {
  const rows = await getDb()
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.code,
      status: apiKeys.status,
      createdAt: apiKeys.createdAt,
      updatedAt: apiKeys.updatedAt,
    })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.organizationId, user.organizationId),
        user.campusId ? eq(apiKeys.campusId, user.campusId) : undefined,
      ),
    )
    .orderBy(desc(apiKeys.createdAt));
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toLocaleString(),
    updatedAt: row.updatedAt.toLocaleString(),
  }));
}

export async function setApiKeyStatus(
  user: CurrentUser,
  id: string,
  status: "active" | "revoked",
) {
  const [row] = await getDb()
    .update(apiKeys)
    .set({ status, updatedAt: new Date(), updatedBy: user.id })
    .where(
      and(
        eq(apiKeys.id, id),
        eq(apiKeys.organizationId, user.organizationId),
        user.campusId ? eq(apiKeys.campusId, user.campusId) : undefined,
      ),
    )
    .returning({ id: apiKeys.id, name: apiKeys.name, status: apiKeys.status });
  if (!row) throw new AppError("NOT_FOUND", "API key not found.", 404);
  return row;
}

export async function listWebhookEvents(user: CurrentUser) {
  const rows = await getDb()
    .select({
      id: webhookEvents.id,
      provider: webhookEvents.name,
      eventId: webhookEvents.referenceId,
      eventCode: webhookEvents.code,
      status: webhookEvents.status,
      createdAt: webhookEvents.createdAt,
    })
    .from(webhookEvents)
    .where(
      and(
        eq(webhookEvents.organizationId, user.organizationId),
        user.campusId ? eq(webhookEvents.campusId, user.campusId) : undefined,
      ),
    )
    .orderBy(desc(webhookEvents.createdAt))
    .limit(100);
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toLocaleString(),
  }));
}

function safeSignatureEquals(actual: string, expected: string) {
  const normalizedActual = actual
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase();
  const normalizedExpected = expected.toLowerCase();
  const actualBuffer = Buffer.from(normalizedActual, "utf8");
  const expectedBuffer = Buffer.from(normalizedExpected, "utf8");
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function receiveWebhook(input: {
  organizationId: string;
  campusId?: string;
  provider: string;
  eventId: string;
  eventType: string;
  signature: string;
  body: string;
}) {
  const config = await getDb().query.integrationConfigs.findFirst({
    where: and(
      eq(integrationConfigs.organizationId, input.organizationId),
      eq(integrationConfigs.provider, input.provider),
      eq(integrationConfigs.status, "configured"),
      input.campusId
        ? eq(integrationConfigs.campusId, input.campusId)
        : undefined,
    ),
  });
  if (!config)
    throw new AppError(
      "PROVIDER_NOT_CONFIGURED",
      "Configured integration was not found.",
      404,
    );
  let providerConfig: Record<string, string>;
  try {
    providerConfig = JSON.parse(decryptSecret(config.configJson)) as Record<
      string,
      string
    >;
  } catch {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "Integration configuration cannot be read.",
      503,
    );
  }
  const webhookSecret = providerConfig.webhookSecret?.trim();
  if (!webhookSecret)
    throw new AppError(
      "CONFIGURATION_ERROR",
      "This integration has no webhook secret configured.",
      503,
    );
  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(input.body, "utf8")
    .digest("hex");
  const signatureValid = safeSignatureEquals(
    input.signature,
    expectedSignature,
  );
  const eventCode = `${input.provider}:${input.eventId}`;
  const existing = await getDb().query.webhookEvents.findFirst({
    where: and(
      eq(webhookEvents.organizationId, input.organizationId),
      eq(webhookEvents.code, eventCode),
    ),
  });
  if (existing)
    return {
      duplicate: true as const,
      accepted: existing.status !== "rejected",
      id: existing.id,
    };
  const status = signatureValid ? "received" : "rejected";
  let event: typeof webhookEvents.$inferSelect | undefined;
  try {
    [event] = await getDb()
      .insert(webhookEvents)
      .values({
        id: createId("webhook"),
        organizationId: input.organizationId,
        campusId: config.campusId,
        name: input.provider,
        code: eventCode,
        referenceId: input.eventId,
        detailsJson: encryptSecret(
          JSON.stringify({
            eventType: input.eventType,
            signatureValid,
            body: input.body,
            receivedAt: new Date().toISOString(),
          }),
        ),
        status,
        createdBy: null,
        updatedBy: null,
      })
      .returning();
  } catch (error) {
    if (
      !databaseErrorIncludes(
        error,
        "webhook_events_org_code_unique",
        "unique constraint failed: webhook_events.organization_id, webhook_events.code",
      )
    )
      throw error;
    const duplicate = await getDb().query.webhookEvents.findFirst({
      where: and(
        eq(webhookEvents.organizationId, input.organizationId),
        eq(webhookEvents.code, eventCode),
      ),
    });
    if (!duplicate) throw error;
    return {
      duplicate: true as const,
      accepted: duplicate.status !== "rejected",
      id: duplicate.id,
    };
  }
  await getDb()
    .insert(integrationLogs)
    .values({
      id: createId("integration_log"),
      organizationId: input.organizationId,
      campusId: config.campusId,
      provider: input.provider,
      eventType: input.eventType,
      payloadJson: JSON.stringify({ eventId: input.eventId, signatureValid }),
      error: signatureValid ? null : "Webhook signature validation failed.",
      status: signatureValid ? "received" : "failed",
    });
  if (!signatureValid)
    throw new AppError(
      "FORBIDDEN",
      "Webhook signature validation failed.",
      401,
    );
  return {
    duplicate: false as const,
    accepted: true as const,
    id: event?.id ?? eventCode,
  };
}
