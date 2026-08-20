import { z } from "zod";

export const invitationAcceptSchema = z.object({
  token: z.string().trim().min(40).max(160),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .max(128)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
});
export type InvitationAcceptInput = z.infer<typeof invitationAcceptSchema>;
