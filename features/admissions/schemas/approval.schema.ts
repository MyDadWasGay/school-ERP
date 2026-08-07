import { z } from "zod";

export const admissionApprovalSchema = z.object({
  applicationId: z.string().min(1),
  rollNumber: z.string().trim().max(30).optional(),
});
export type AdmissionApprovalInput = z.infer<typeof admissionApprovalSchema>;
