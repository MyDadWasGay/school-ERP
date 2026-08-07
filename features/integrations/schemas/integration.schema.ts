import { z } from "zod";

export const integrationConfigSchema = z.object({
  provider: z.string().trim().min(2).max(80).regex(/^[a-z0-9_.-]+$/i),
  config: z.record(z.string().trim().min(1).max(500)).refine((value) => Object.keys(value).length > 0, "At least one provider setting is required."),
});

export type IntegrationConfigInput = z.infer<typeof integrationConfigSchema>;

export const integrationStatusSchema = z.object({ id: z.string().min(1), status: z.enum(["configured", "disabled"]) });

export const apiKeyCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const apiKeyStatusSchema = z.object({ id: z.string().min(1), status: z.enum(["active", "revoked"]) });

export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateSchema>;
