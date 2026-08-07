import { z } from "zod";
export const marksSchema = z.object({
  examId: z.string().min(1),
  studentId: z.string().min(1),
  subjectId: z.string().min(1),
  marks: z.coerce.number().int().min(0),
  maxMarks: z.coerce.number().int().positive().optional(),
}).refine((data) => data.maxMarks === undefined || data.marks <= data.maxMarks, { message: "Marks cannot exceed the maximum.", path: ["marks"] });
export type MarksInput = z.infer<typeof marksSchema>;
