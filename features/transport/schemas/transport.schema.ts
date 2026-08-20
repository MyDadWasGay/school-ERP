import { z } from "zod";
import { parseIndiaDateValue } from "@/lib/utils/india-time";

export const transportRouteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  capacity: z.coerce.number().int().min(1).max(500),
  vehicleId: z.string().trim().min(1).optional(),
});

export const transportStopSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(240).optional(),
});

export const routeAllocationSchema = z.object({
  routeId: z.string().min(1),
  studentId: z.string().min(1),
  stopId: z.string().min(1),
});

export const vehicleSchema = z.object({
  registrationNumber: z.string().trim().min(2).max(40),
  type: z.string().trim().min(2).max(60),
  capacity: z.coerce.number().int().min(1).max(500),
});

export const vehicleDocumentSchema = z.object({
  vehicleId: z.string().min(1),
  documentType: z.string().trim().min(2).max(80),
  expiresOn: z.preprocess(parseIndiaDateValue, z.coerce.date()),
});

export const transportBoardingEventSchema = z.object({
  routeId: z.string().min(1),
  studentId: z.string().min(1),
  stopId: z.string().min(1),
  eventDate: z.preprocess(parseIndiaDateValue, z.coerce.date()),
  tripType: z.enum(["morning", "afternoon"]),
  eventType: z.enum(["boarded", "absent", "dropped", "cannot_board"]),
  note: z.string().trim().max(300).optional(),
});

export const transportLocationSchema = z.object({
  routeId: z.string().min(1),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracyMeters: z.coerce.number().min(0).max(10_000).optional(),
  recordedAt: z.preprocess(
    (value) => value === undefined || value === null ? undefined : value,
    z.coerce.date().optional(),
  ),
});

export type TransportRouteInput = z.infer<typeof transportRouteSchema>;
export type TransportStopInput = z.infer<typeof transportStopSchema>;
export type RouteAllocationInput = z.infer<typeof routeAllocationSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type VehicleDocumentInput = z.infer<typeof vehicleDocumentSchema>;
export type TransportBoardingEventInput = z.infer<typeof transportBoardingEventSchema>;
export type TransportLocationInput = z.infer<typeof transportLocationSchema>;
