import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { integrationConfigs } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import { AppError } from "@/lib/errors/app-error";
import {
  razorpayConfigurationSchema,
  type RazorpayConfiguration,
} from "@/lib/integrations/razorpay";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-box";

export const RAZORPAY_PROVIDER = "razorpay";

export async function saveRazorpayConfiguration(
  user: CurrentUser,
  input: RazorpayConfiguration,
) {
  const configuration = razorpayConfigurationSchema.parse(input);
  const encrypted = encryptSecret(JSON.stringify(configuration));
  return getDb().transaction(async (tx) => {
    const existing = await tx.query.integrationConfigs.findFirst({
      where: and(
        eq(integrationConfigs.organizationId, user.organizationId),
        eq(integrationConfigs.provider, RAZORPAY_PROVIDER),
        isNull(integrationConfigs.campusId),
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
        campusId: null,
        provider: RAZORPAY_PROVIDER,
        configJson: encrypted,
        status: "configured",
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();
    if (!row)
      throw new AppError(
        "DATABASE_ERROR",
        "Unable to save Razorpay configuration.",
        500,
      );
    return row;
  });
}

export async function loadRazorpayConfiguration(organizationId: string) {
  const row = await getDb().query.integrationConfigs.findFirst({
    where: and(
      eq(integrationConfigs.organizationId, organizationId),
      eq(integrationConfigs.provider, RAZORPAY_PROVIDER),
      isNull(integrationConfigs.campusId),
      eq(integrationConfigs.status, "configured"),
    ),
  });
  if (!row)
    throw new AppError(
      "PROVIDER_NOT_CONFIGURED",
      "Razorpay is not configured for this school.",
      503,
    );
  try {
    const parsed = razorpayConfigurationSchema.safeParse(
      JSON.parse(decryptSecret(row.configJson)),
    );
    if (!parsed.success) throw new Error("invalid Razorpay configuration");
    return { row, configuration: parsed.data };
  } catch {
    throw new AppError(
      "PROVIDER_NOT_CONFIGURED",
      "Razorpay configuration cannot be read.",
      503,
    );
  }
}
