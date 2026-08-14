import { z } from "zod";
import { parseIndiaDateInput, parseIndiaDateTimeInput } from "@/lib/utils/india-time";

function indiaDate(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try { return parseIndiaDateInput(value); } catch { return value; }
  }
  return value;
}

function indiaDateTime(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) {
    try { return parseIndiaDateTimeInput(value); } catch { return value; }
  }
  return value;
}

const optionalIndiaDateTime = z.preprocess(indiaDateTime, z.coerce.date().optional());
const requiredIndiaDateTime = z.preprocess(indiaDateTime, z.coerce.date());
const optionalIndiaDate = z.preprocess(indiaDate, z.coerce.date().optional());

export const enquirySchema = z.object({
  campusId: z.string().min(1),
  applicantName: z.string().trim().min(2).max(160),
  guardianName: z.string().trim().max(160).optional().or(z.literal("")),
  guardianEmail: z.string().email().optional().or(z.literal("")),
  guardianPhone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  source: z.string().trim().min(2).max(80),
  notes: z.string().trim().max(1_000).optional().or(z.literal("")),
  nextFollowUpAt: optionalIndiaDateTime,
});

export const applicationSchema = z.object({
  campusId: z.string().min(1),
  applicantName: z.string().trim().min(2).max(160),
  dateOfBirth: optionalIndiaDate,
  gender: z.enum(["female", "male", "non_binary", "prefer_not_to_say"]).optional().or(z.literal("")),
  academicYearId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  sourceEnquiryId: z.string().optional().or(z.literal("")),
  guardian: z.object({
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(1).max(80),
    relationship: z.string().trim().min(2).max(40),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  }),
});

export const applicationReviewSchema = z.object({
  applicationId: z.string().min(1),
  decision: z.enum(["verified", "waitlisted", "rejected"]),
  reason: z.string().trim().max(500).optional(),
}).superRefine((input, context) => {
  if (input.decision === "rejected" && !input.reason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reason"],
      message: "A rejection reason is required.",
    });
  }
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;
export type ApplicationReviewInput = z.infer<typeof applicationReviewSchema>;

export const enquiryUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["new", "contacted", "qualified", "lost", "converted"]),
  source: z.string().trim().min(2).max(80),
  campaign: z.string().trim().max(120).optional().or(z.literal("")),
  lostReason: z.string().trim().max(500).optional().or(z.literal("")),
  guardianName: z.string().trim().max(160).optional().or(z.literal("")),
  guardianEmail: z.string().email().optional().or(z.literal("")),
  guardianPhone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(1_000).optional().or(z.literal("")),
  nextFollowUpAt: optionalIndiaDateTime,
}).superRefine((input, context) => {
  if (input.status === "lost" && !input.lostReason) context.addIssue({ code: z.ZodIssueCode.custom, path: ["lostReason"], message: "A lost reason is required." });
});
export type EnquiryUpdateInput = z.infer<typeof enquiryUpdateSchema>;

export const followUpSchema = z.object({
  enquiryId: z.string().min(1),
  dueAt: requiredIndiaDateTime,
  note: z.string().trim().min(2).max(1000),
  assignedTo: z.string().min(1).optional().or(z.literal("")),
});
export type FollowUpInput = z.infer<typeof followUpSchema>;

export const followUpCompleteSchema = z.object({
  id: z.string().min(1),
  outcome: z.string().trim().min(2).max(500),
});
export type FollowUpCompleteInput = z.infer<typeof followUpCompleteSchema>;

export const assessmentSchema = z.object({
  applicationId: z.string().min(1),
  campusId: z.string().min(1),
  assessmentType: z.enum(["entrance_test", "interview", "interaction"]),
  scheduledAt: requiredIndiaDateTime,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type AssessmentInput = z.infer<typeof assessmentSchema>;

export const assessmentResultSchema = z.object({
  id: z.string().min(1),
  score: z.coerce.number().int().min(0).max(1000).optional(),
  outcome: z.enum(["pending", "passed", "failed", "no_show"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type AssessmentResultInput = z.infer<typeof assessmentResultSchema>;
