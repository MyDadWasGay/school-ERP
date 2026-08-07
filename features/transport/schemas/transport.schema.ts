import { z } from "zod";

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
  expiresOn: z.coerce.date(),
});

export type TransportRouteInput = z.infer<typeof transportRouteSchema>;
export type TransportStopInput = z.infer<typeof transportStopSchema>;
export type RouteAllocationInput = z.infer<typeof routeAllocationSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type VehicleDocumentInput = z.infer<typeof vehicleDocumentSchema>;
