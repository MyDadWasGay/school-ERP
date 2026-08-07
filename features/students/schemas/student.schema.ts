import { z } from "zod";

export const studentSchema = z.object({
  admissionNumber: z.string().trim().min(2).max(40),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(1).max(80),
  campusId: z.string().trim().min(1),
  gender: z.enum(["female", "male", "non_binary", "prefer_not_to_say"]).optional().or(z.literal("")),
  dateOfBirth: z.coerce.date().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  academicYearId: z.string().trim().min(1).optional().or(z.literal("")),
  classId: z.string().trim().min(1).optional().or(z.literal("")),
  sectionId: z.string().trim().min(1).optional().or(z.literal("")),
  rollNumber: z.string().trim().max(30).optional(),
  guardian: z.object({
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(1).max(80),
    relationship: z.string().trim().min(2).max(40),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  }).optional(),
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

export const guardianSchema = z.object({
  studentId: z.string().min(1),
  guardianId: z.string().min(1).optional(),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(1).max(80),
  relationship: z.string().trim().min(2).max(40),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  occupation: z.string().trim().max(120).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  custodyNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  isPrimary: z.boolean().optional(),
});
export type GuardianInput = z.infer<typeof guardianSchema>;

export const guardianUpdateSchema = guardianSchema.extend({ id: z.string().min(1) });
export type GuardianUpdateInput = z.infer<typeof guardianUpdateSchema>;

export const guardianUnlinkSchema = z.object({
  studentId: z.string().min(1),
  guardianId: z.string().min(1),
});
export type GuardianUnlinkInput = z.infer<typeof guardianUnlinkSchema>;

export const enrollmentTransferSchema = z.object({
  studentId: z.string().min(1),
  academicYearId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  rollNumber: z.string().trim().max(30).optional().or(z.literal("")),
  startsOn: z.coerce.date(),
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
