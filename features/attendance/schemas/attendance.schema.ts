import { z } from "zod";
import { indiaDateKey, indiaTodayKey, parseIndiaDateValue } from "@/lib/utils/india-time";
export const attendanceSchema = z.object({
  studentId: z.string().min(1),
  attendanceDate: z.preprocess(parseIndiaDateValue, z.coerce.date()),
  periodKey: z.string().trim().min(1).max(40).default("daily"),
  state: z.enum(["present", "absent", "late", "leave", "half_day", "medical"]),
  note: z.string().trim().max(300).optional(),
}).refine(
  (input) => indiaDateKey(input.attendanceDate) <= indiaTodayKey(),
  { message: "Attendance cannot be marked for a future date.", path: ["attendanceDate"] },
);
export type AttendanceInput = z.infer<typeof attendanceSchema>;
