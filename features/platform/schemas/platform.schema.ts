import { z } from "zod";
import { ORGANIZATION_STATUSES } from "@/config/organization-status";
import { INDIA_TIME_ZONE } from "@/config/constants";

export const createSchoolSchema = z.object({
  name: z.string().trim().min(2, "Enter the school name.").max(120),
  slug: z.string().trim().min(2, "Enter a school slug.").max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
  timezone: z.literal(INDIA_TIME_ZONE).default(INDIA_TIME_ZONE),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("INR"),
  campusName: z.string().trim().min(2, "Enter the first campus name.").max(120),
  campusCode: z.string().trim().min(2, "Enter a campus code.").max(20)
    .regex(/^[a-zA-Z0-9-]+$/, "Use letters, numbers, and hyphens only.")
    .transform((value) => value.toUpperCase()),
  campusAddress: z.string().trim().max(500).optional(),
  adminName: z.string().trim().min(2, "Enter the school administrator name.").max(120),
  adminEmail: z.string().trim().email("Enter a valid administrator email address."),
});

export const schoolStatusSchema = z.object({
  organizationId: z.string().trim().min(1),
  status: z.enum(ORGANIZATION_STATUSES),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type SchoolStatusInput = z.infer<typeof schoolStatusSchema>;
