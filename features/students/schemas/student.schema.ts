import { z } from "zod";
import { parseIndiaDateInput } from "@/lib/utils/india-time";

export const guardianRelationshipOptions = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "grandfather", label: "Grandfather" },
  { value: "grandmother", label: "Grandmother" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "uncle", label: "Uncle" },
  { value: "aunt", label: "Aunt" },
  { value: "legal_guardian", label: "Legal guardian" },
  { value: "foster_parent", label: "Foster parent" },
  { value: "other", label: "Other" },
] as const;

const guardianRelationshipValues: [string, ...string[]] = [
  "father",
  "mother",
  "grandfather",
  "grandmother",
  "brother",
  "sister",
  "uncle",
  "aunt",
  "legal_guardian",
  "foster_parent",
  "other",
  // Keep values accepted by older clients while new screens use the
  // structured options above.
  "parent",
  "guardian",
];
const guardianRelationship = z.enum(guardianRelationshipValues);

function indiaDate(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try { return parseIndiaDateInput(value); } catch { return value; }
  }
  return value;
}

const optionalIndiaDate = z.preprocess(indiaDate, z.coerce.date().optional());
const requiredIndiaDate = z.preprocess(indiaDate, z.coerce.date());

const guardianDetailsFields = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(1).max(80),
  relationship: guardianRelationship,
  customRelationship: z.string().trim().max(80).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  occupation: z.string().trim().max(120).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  custodyNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  isPrimary: z.boolean().optional(),
  isEmergencyContact: z.boolean().optional(),
  isBillingContact: z.boolean().optional(),
});

function requireCustomRelationship<T extends { relationship: string; customRelationship?: string }>(schema: z.ZodType<T>) {
  return schema.superRefine((input, context) => {
  if (input.relationship === "other" && !input.customRelationship) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customRelationship"],
      message: "Specify the relationship when Other is selected.",
    });
  }
  });
}

export const guardianDetailsSchema = requireCustomRelationship(guardianDetailsFields);

export const studentSchema = z.object({
  admissionNumber: z.string().trim().min(2).max(40),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(1).max(80),
  campusId: z.string().trim().min(1),
  gender: z.enum(["female", "male", "non_binary", "prefer_not_to_say"]).optional().or(z.literal("")),
  dateOfBirth: optionalIndiaDate,
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  academicYearId: z.string().trim().min(1).optional().or(z.literal("")),
  classId: z.string().trim().min(1).optional().or(z.literal("")),
  sectionId: z.string().trim().min(1).optional().or(z.literal("")),
  rollNumber: z.string().trim().max(30).optional(),
  inviteStudent: z.boolean().optional(),
  inviteGuardian: z.boolean().optional(),
  guardian: requireCustomRelationship(guardianDetailsFields.pick({
    firstName: true,
    lastName: true,
    relationship: true,
    customRelationship: true,
    email: true,
    phone: true,
  })).optional(),
}).superRefine((input, context) => {
  const enrollmentFields = [input.academicYearId, input.classId, input.sectionId];
  if (enrollmentFields.some(Boolean) && !enrollmentFields.every(Boolean)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Academic year, class and section are all required for enrollment.", path: ["academicYearId"] });
  }
});
export type StudentInput = z.infer<typeof studentSchema>;

export const studentUpdateSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(1).max(80),
  gender: z.enum(["female", "male", "non_binary", "prefer_not_to_say"]).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "withdrawn", "graduated"]),
});
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;

export const guardianSchema = requireCustomRelationship(guardianDetailsFields.extend({
  studentId: z.string().min(1),
  guardianId: z.string().min(1).optional(),
}));
export type GuardianInput = z.infer<typeof guardianSchema>;

export const guardianUpdateSchema = requireCustomRelationship(guardianDetailsFields.extend({
  studentId: z.string().min(1),
  guardianId: z.string().min(1).optional(),
  id: z.string().min(1),
}));
export type GuardianUpdateInput = z.infer<typeof guardianUpdateSchema>;

export const guardianUnlinkSchema = z.object({
  studentId: z.string().min(1),
  guardianId: z.string().min(1),
});
export type GuardianUnlinkInput = z.infer<typeof guardianUnlinkSchema>;

export const inviteStudentSchema = z.object({
  studentId: z.string().min(1),
});
export type InviteStudentInput = z.infer<typeof inviteStudentSchema>;

export const inviteGuardianSchema = z.object({
  studentId: z.string().min(1),
  guardianId: z.string().min(1),
});
export type InviteGuardianInput = z.infer<typeof inviteGuardianSchema>;

export const enrollmentTransferSchema = z.object({
  studentId: z.string().min(1),
  academicYearId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  rollNumber: z.string().trim().max(30).optional().or(z.literal("")),
  startsOn: requiredIndiaDate,
});
export type EnrollmentTransferInput = z.infer<typeof enrollmentTransferSchema>;

export const medicalProfileSchema = z.object({
  studentId: z.string().min(1),
  allergies: z.string().trim().max(2000).optional().or(z.literal("")),
  conditions: z.string().trim().max(2000).optional().or(z.literal("")),
  medications: z.string().trim().max(2000).optional().or(z.literal("")),
  emergencyNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type MedicalProfileInput = z.infer<typeof medicalProfileSchema>;

export const certificateIssueSchema = z.object({
  studentId: z.string().min(1),
  certificateType: z.string().trim().min(2).max(80),
  templateId: z.string().min(1).optional().or(z.literal("")),
});
export type CertificateIssueInput = z.infer<typeof certificateIssueSchema>;
