import { z } from "zod";

export const staffAttendanceSchema = z.object({
  employeeId: z.string().min(1).max(120),
  attendanceDate: z.coerce.date(),
  state: z.enum(["present", "absent", "late", "leave"]),
  note: z.string().trim().max(500).optional(),
});

export type StaffAttendanceInput = z.infer<typeof staffAttendanceSchema>;
