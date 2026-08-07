import { z } from "zod";

export const healthProfileSchema = z.object({
  studentId: z.string().min(1),
  allergies: z.string().trim().max(2_000).optional(),
  conditions: z.string().trim().max(2_000).optional(),
});

export const clinicVisitSchema = z.object({
  studentId: z.string().min(1),
  visitedAt: z.coerce.date(),
  summary: z.string().trim().min(2).max(4_000),
});

export type HealthProfileInput = z.infer<typeof healthProfileSchema>;
export type ClinicVisitInput = z.infer<typeof clinicVisitSchema>;
