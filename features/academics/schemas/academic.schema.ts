import { z } from "zod";
import { parseIndiaDateTimeValue } from "@/lib/utils/india-time";

export const academicKinds = [
  "curriculum",
  "lesson-plans",
  "teacher-allocation",
  "timetable",
  "substitutions",
  "assignments",
  "resources",
] as const;
export type AcademicKind = (typeof academicKinds)[number];

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(max).optional(),
);

export const academicRecordSchema = z.object({
  kind: z.enum(academicKinds),
  name: z.string().trim().min(2).max(160),
  code: optionalText(80),
  referenceId: optionalText(120),
  teacherId: optionalText(120),
  classId: optionalText(120),
  subjectId: optionalText(120),
  title: optionalText(160),
  scheduledFor: z.preprocess((value) => value === "" || value === null || value === undefined ? undefined : parseIndiaDateTimeValue(value), z.coerce.date().optional()),
  dueAt: z.preprocess((value) => value === "" || value === null || value === undefined ? undefined : parseIndiaDateTimeValue(value), z.coerce.date().optional()),
  details: optionalText(2_000),
});

export const academicArchiveSchema = z.object({
  kind: z.enum(academicKinds),
  id: z.string().min(1).max(120),
});

export type AcademicRecordInput = z.infer<typeof academicRecordSchema>;
export const lessonPlanStatusSchema = z.object({
  status: z.enum(["draft", "in_progress", "completed"]),
});
