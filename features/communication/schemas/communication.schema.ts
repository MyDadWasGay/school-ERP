import { z } from "zod";

export const messageSchema = z.object({
  subject: z.string().trim().min(3).max(180),
  body: z.string().trim().min(3).max(10_000),
  audienceType: z.enum(["all", "role", "users"]),
  audienceRole: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().max(40).optional()),
  recipientUserIds: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
}).superRefine((input, context) => {
  if (input.audienceType === "role" && !input.audienceRole) context.addIssue({ code: "custom", path: ["audienceRole"], message: "Choose a recipient role." });
  if (input.audienceType === "users" && !input.recipientUserIds?.length) context.addIssue({ code: "custom", path: ["recipientUserIds"], message: "Choose at least one recipient." });
});

export type MessageInput = z.infer<typeof messageSchema>;
