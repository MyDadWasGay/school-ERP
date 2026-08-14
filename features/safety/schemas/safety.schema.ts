import { z } from "zod";
import { parseIndiaDateTimeValue } from "@/lib/utils/india-time";

const dateInput = z.preprocess(parseIndiaDateTimeValue, z.coerce.date());

export const visitorSchema = z.object({
  visitorName: z.string().trim().min(2).max(160),
  purpose: z.string().trim().min(2).max(240),
  hostName: z.string().trim().min(2).max(160),
  visitAt: dateInput,
});

export const gatePassSchema = z.object({
  visitorId: z.string().min(1),
  reason: z.string().trim().min(2).max(240),
  validUntil: dateInput,
});

export const gatePassStatusSchema = z.object({
  id: z.string().min(1),
  toStatus: z.enum(["approved", "rejected", "used", "expired", "cancelled"]),
});

export const securityIncidentSchema = z.object({
  title: z.string().trim().min(2).max(160),
  severity: z.enum(["low", "medium", "high", "critical"]),
  occurredAt: dateInput,
  details: z.string().trim().min(2).max(1_000),
});

export const securityIncidentStatusSchema = z.object({
  id: z.string().min(1),
  toStatus: z.enum(["investigating", "resolved", "closed"]),
});

export const evacuationSchema = z.object({
  title: z.string().trim().min(2).max(160),
  startedAt: dateInput,
  notes: z.string().trim().max(1_000).optional(),
});

export const evacuationStatusSchema = z.object({
  id: z.string().min(1),
  toStatus: z.enum(["closed"]),
});

export type VisitorInput = z.infer<typeof visitorSchema>;
export type GatePassInput = z.infer<typeof gatePassSchema>;
export type GatePassStatusInput = z.infer<typeof gatePassStatusSchema>;
export type SecurityIncidentInput = z.infer<typeof securityIncidentSchema>;
export type SecurityIncidentStatusInput = z.infer<typeof securityIncidentStatusSchema>;
export type EvacuationInput = z.infer<typeof evacuationSchema>;
export type EvacuationStatusInput = z.infer<typeof evacuationStatusSchema>;
