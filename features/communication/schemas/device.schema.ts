import { z } from "zod";

export const mobileDeviceSchema = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.enum(["android", "ios", "web"]),
  appVersion: z.string().trim().max(40).optional(),
});

export type MobileDeviceInput = z.infer<typeof mobileDeviceSchema>;
