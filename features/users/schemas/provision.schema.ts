import { z } from "zod";

export const provisionRoles = ["management", "principal", "office_staff", "teacher", "accountant", "librarian", "transport_staff", "hostel_warden", "parent", "student", "alumni"] as const;
export const provisionUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  displayName: z.string().trim().min(2, "Enter the person’s name.").max(120),
  role: z.enum(provisionRoles),
  campusId: z.string().trim().min(1, "Choose a campus."),
});
export type ProvisionUserInput = z.infer<typeof provisionUserSchema>;
