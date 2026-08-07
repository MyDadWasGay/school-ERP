import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
export const campusSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(20).transform((value) => value.toUpperCase()),
  address: z.string().trim().max(500).optional(),
});
export type OrganizationInput = z.infer<typeof organizationSchema>;
export type CampusInput = z.infer<typeof campusSchema>;

export const campusUpdateSchema = campusSchema.extend({ id: z.string().min(1) });
export type CampusUpdateInput = z.infer<typeof campusUpdateSchema>;
export const campusArchiveSchema = z.object({ id: z.string().min(1) });
export type CampusArchiveInput = z.infer<typeof campusArchiveSchema>;
