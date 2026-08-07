import { z } from "zod";

export const messageSchema = z.object({
  subject: z.string().trim().min(3).max(180),
  body: z.string().trim().min(3).max(10_000),
  audienceType: z.enum(["all", "role"]),
  audienceRole: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().max(40).optional()),
});

export type MessageInput = z.infer<typeof messageSchema>;
