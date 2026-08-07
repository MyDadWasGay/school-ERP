import { z } from "zod";

export const disciplineIncidentSchema = z.object({
  studentId: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z.string().trim().min(3).max(160),
  details: z.string().trim().max(2000).optional(),
  confidential: z.coerce.boolean().default(true),
  occurredAt: z.coerce.date(),
});

export type DisciplineIncidentInput = z.infer<typeof disciplineIncidentSchema>;

export const disciplineDecisionSchema = z.object({
  incidentId: z.string().min(1),
  status: z.enum(["open", "resolved", "dismissed"]),
});
