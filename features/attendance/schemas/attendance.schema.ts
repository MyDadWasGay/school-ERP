import { z } from "zod";
export const attendanceSchema = z.object({
  studentId: z.string().min(1),
  attendanceDate: z.coerce.date(),
  periodKey: z.string().trim().min(1).max(40).default("daily"),
  state: z.enum(["present", "absent", "late", "leave", "half_day", "medical"]),
  note: z.string().trim().max(300).optional(),
}).refine(
  (input) => input.attendanceDate.getTime() <= Date.now() + 5 * 60 * 1000,
  { message: "Attendance cannot be marked for a future date.", path: ["attendanceDate"] },
);
export type AttendanceInput = z.infer<typeof attendanceSchema>;
