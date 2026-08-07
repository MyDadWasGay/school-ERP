import { z } from "zod";

export const invitationAcceptSchema = z.object({
  token: z.string().trim().min(40).max(160),
  password: z.string().min(12).max(128).regex(/[A-Z]/, "Password must contain an uppercase letter.").regex(/[a-z]/, "Password must contain a lowercase letter.").regex(/[0-9]/, "Password must contain a number."),
});
export type InvitationAcceptInput = z.infer<typeof invitationAcceptSchema>;
