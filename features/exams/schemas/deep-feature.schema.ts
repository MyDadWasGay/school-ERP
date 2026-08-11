import { z } from "zod";

export const questionBankSchema = z.object({
  subjectId: z.string().min(1),
  questionType: z.enum(["mcq", "short_answer", "long_answer", "true_false"]),
  prompt: z.string().trim().min(3).max(2_000),
  answer: z.string().trim().max(2_000).optional(),
  maximumMarks: z.coerce.number().int().positive().max(1_000),
});

export const reportCardSchema = z.object({
  examId: z.string().min(1),
  studentId: z.string().min(1),
});

export type QuestionBankInput = z.infer<typeof questionBankSchema>;
export type ReportCardInput = z.infer<typeof reportCardSchema>;
