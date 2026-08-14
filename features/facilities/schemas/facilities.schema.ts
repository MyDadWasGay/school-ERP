import { z } from "zod";
import { parseIndiaDateTimeValue } from "@/lib/utils/india-time";

const dateInput = z.preprocess(parseIndiaDateTimeValue, z.coerce.date());

export const facilityBookingSchema = z.object({
  facilityName: z.string().trim().min(2).max(160),
  purpose: z.string().trim().min(2).max(240),
  startsAt: dateInput,
  endsAt: dateInput,
});

export const facilityBookingStatusSchema = z.object({ id: z.string().min(1), toStatus: z.enum(["approved", "rejected", "cancelled", "completed"]) });

export const facilityMaintenanceSchema = z.object({
  facilityName: z.string().trim().min(2).max(160),
  title: z.string().trim().min(2).max(160),
  priority: z.enum(["low", "medium", "high", "critical"]),
  details: z.string().trim().min(2).max(1_000),
});

export const facilityMaintenanceStatusSchema = z.object({ id: z.string().min(1), toStatus: z.enum(["in_progress", "completed", "cancelled"]) });

export const facilityComplaintSchema = z.object({ facilityName: z.string().trim().min(2).max(160), title: z.string().trim().min(2).max(160), details: z.string().trim().min(2).max(1_000) });
export const facilityComplaintStatusSchema = z.object({ id: z.string().min(1), toStatus: z.enum(["in_progress", "resolved", "closed", "rejected"]) });

export type FacilityBookingInput = z.infer<typeof facilityBookingSchema>;
export type FacilityBookingStatusInput = z.infer<typeof facilityBookingStatusSchema>;
export type FacilityMaintenanceInput = z.infer<typeof facilityMaintenanceSchema>;
export type FacilityMaintenanceStatusInput = z.infer<typeof facilityMaintenanceStatusSchema>;
export type FacilityComplaintInput = z.infer<typeof facilityComplaintSchema>;
export type FacilityComplaintStatusInput = z.infer<typeof facilityComplaintStatusSchema>;
