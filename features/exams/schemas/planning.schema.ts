import { z } from "zod";

export const examStatusValues = [
  "draft",
  "planning",
  "marks_entry",
  "moderation",
  "approved",
  "published",
] as const;

export type ExamStatus = (typeof examStatusValues)[number];

export const examStatusTransitions: Record<ExamStatus, readonly ExamStatus[]> = {
  draft: ["planning", "marks_entry"],
  planning: ["marks_entry"],
  marks_entry: ["moderation"],
  moderation: ["marks_entry", "approved"],
  approved: ["published", "moderation"],
  published: [],
};

export function canTransitionExamStatus(current: string, next: ExamStatus) {
  return (examStatusTransitions[current as ExamStatus] ?? []).includes(next);
}

export const examSchema = z.object({
  academicYearId: z.string().min(1),
  examSchemeId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(2).max(120),
  maxMarks: z.coerce.number().int().positive().max(100000),
  startsOn: z.coerce.date().optional(),
  endsOn: z.coerce.date().optional(),
}).superRefine((input, context) => {
  if (input.startsOn && input.endsOn && input.endsOn < input.startsOn) {
    context.addIssue({ code: "custom", message: "Exam end date must be on or after the start date.", path: ["endsOn"] });
  }
});

export type ExamInput = z.infer<typeof examSchema>;

export const examScheduleSchema = z.object({
  examId: z.string().min(1),
  subjectId: z.string().min(1),
  classId: z.string().min(1),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  roomId: z.string().trim().max(80).optional(),
}).superRefine((input, context) => {
  if (input.endsAt <= input.startsAt) {
    context.addIssue({ code: "custom", message: "Schedule end time must be after the start time.", path: ["endsAt"] });
  }
});

export type ExamScheduleInput = z.infer<typeof examScheduleSchema>;

export const examStatusSchema = z.object({
  examId: z.string().min(1),
  status: z.enum(examStatusValues),
});

export type ExamStatusInput = z.infer<typeof examStatusSchema>;
