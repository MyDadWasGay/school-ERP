import { z } from "zod";

export const assignmentSubmissionSchema = z.object({
  studentId: z.string().trim().min(1).max(200).optional(),
  response: z.string().trim().min(1).max(10_000),
});

export const assignmentFeedbackSchema = z.object({
  score: z.number().int().min(0).optional(),
  comment: z.string().trim().max(4_000).optional(),
});

export type AssignmentSubmissionInput = z.infer<typeof assignmentSubmissionSchema>;
export type AssignmentFeedbackInput = z.infer<typeof assignmentFeedbackSchema>;
