import { z } from "zod";

export const hostelRoomSchema = z.object({
  building: z.string().trim().min(2).max(120),
  floor: z.string().trim().max(80).optional(),
  roomNumber: z.string().trim().min(1).max(40),
  capacity: z.coerce.number().int().min(1).max(100),
});

export const hostelBedSchema = z.object({
  roomId: z.string().min(1),
  code: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9._-]+$/, "Bed code contains unsupported characters."),
});

export const hostelAllotmentSchema = z.object({
  roomId: z.string().min(1),
  bedId: z.string().min(1),
  studentId: z.string().min(1),
});

export type HostelRoomInput = z.infer<typeof hostelRoomSchema>;
export type HostelBedInput = z.infer<typeof hostelBedSchema>;
export type HostelAllotmentInput = z.infer<typeof hostelAllotmentSchema>;
