import { z } from "zod";

export const studentImportRowSchema = z.object({
  admissionNumber: z.string().trim().min(2).max(40),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(1).max(80),
  campusId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
  classId: z.string().trim().min(1),
  sectionId: z.string().trim().min(1),
  rollNumber: z.string().trim().max(30).optional(),
});
export type StudentImportRow = z.infer<typeof studentImportRowSchema>;
