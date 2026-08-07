import { z } from "zod";

export const bootstrapSchema = z.object({
  schoolName: z.string().trim().min(2, "Enter your school name.").max(120),
  schoolSlug: z.string().trim().min(2, "Enter a short school URL name.").max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
  campusName: z.string().trim().min(2, "Enter your first campus name.").max(120),
  campusCode: z.string().trim().min(2, "Enter a campus code.").max(20)
    .regex(/^[a-zA-Z0-9-]+$/, "Use letters, numbers, and hyphens only."),
  campusAddress: z.string().trim().max(500).optional(),
});

export type BootstrapInput = z.infer<typeof bootstrapSchema>;
