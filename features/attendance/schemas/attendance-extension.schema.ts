import { z } from "zod";
import { indiaDateKey, indiaTodayKey, parseIndiaDateValue } from "@/lib/utils/india-time";

export const staffAttendanceSchema = z.object({
  employeeId: z.string().min(1).max(120),
  attendanceDate: z.preprocess(parseIndiaDateValue, z.coerce.date()),
  state: z.enum(["present", "absent", "late", "leave"]),
  note: z.string().trim().max(500).optional(),
}).refine(
  (input) => indiaDateKey(input.attendanceDate) <= indiaTodayKey(),
  { message: "Attendance cannot be recorded for a future date.", path: ["attendanceDate"] },
);

export type StaffAttendanceInput = z.infer<typeof staffAttendanceSchema>;
