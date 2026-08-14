import { z } from "zod";
import { parseIndiaDateValue } from "@/lib/utils/india-time";

const campusId = z.string().min(1);
const name = z.string().trim().min(2).max(120);

export const academicSetupSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("academic_year"),
    campusId,
    name,
    startsOn: z.preprocess(parseIndiaDateValue, z.coerce.date()),
    endsOn: z.preprocess(parseIndiaDateValue, z.coerce.date()),
    isActive: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal("class"),
    campusId,
    name,
    code: z.string().trim().min(1).max(30).transform((value) => value.toUpperCase()),
    sortOrder: z.coerce.number().int().min(0).max(1000),
  }),
  z.object({
    kind: z.literal("section"),
    campusId,
    classId: z.string().min(1),
    name,
    capacity: z.coerce.number().int().min(1).max(500),
  }),
  z.object({
    kind: z.literal("subject"),
    campusId,
    name,
    code: z.string().trim().min(1).max(30).transform((value) => value.toUpperCase()),
    isOptional: z.boolean().default(false),
  }),
]).superRefine((input, context) => {
  if (input.kind === "academic_year" && input.endsOn <= input.startsOn) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date must be after start date.",
      path: ["endsOn"],
    });
  }
});

export type AcademicSetupInput = z.infer<typeof academicSetupSchema>;
export type AcademicSetupKind = AcademicSetupInput["kind"];

export const academicSetupUpdateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("academic_year"), id: z.string().min(1), name, startsOn: z.preprocess(parseIndiaDateValue, z.coerce.date()), endsOn: z.preprocess(parseIndiaDateValue, z.coerce.date()), isActive: z.boolean().default(false) }),
  z.object({ kind: z.literal("class"), id: z.string().min(1), name, code: z.string().trim().min(1).max(30).transform((value) => value.toUpperCase()), sortOrder: z.coerce.number().int().min(0).max(1000) }),
  z.object({ kind: z.literal("section"), id: z.string().min(1), name, capacity: z.coerce.number().int().min(1).max(500) }),
  z.object({ kind: z.literal("subject"), id: z.string().min(1), name, code: z.string().trim().min(1).max(30).transform((value) => value.toUpperCase()), isOptional: z.boolean().default(false) }),
]).superRefine((input, context) => {
  if (input.kind === "academic_year" && input.endsOn <= input.startsOn) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "End date must be after start date.", path: ["endsOn"] });
  }
});
export type AcademicSetupUpdateInput = z.infer<typeof academicSetupUpdateSchema>;

export const academicSetupArchiveSchema = z.object({ kind: z.enum(["academic_year", "class", "section", "subject"]), id: z.string().min(1) });
export type AcademicSetupArchiveInput = z.infer<typeof academicSetupArchiveSchema>;
