import { z } from "zod";
import { parseIndiaDateValue } from "@/lib/utils/india-time";

export const leaveRequestSchema = z
  .object({
    studentId: z.string().trim().min(1).max(200).optional(),
    startsOn: z.preprocess(parseIndiaDateValue, z.coerce.date()),
    endsOn: z.preprocess(parseIndiaDateValue, z.coerce.date()),
    reason: z.string().trim().min(3).max(500),
  })
  .superRefine((input, context) => {
    if (input.endsOn < input.startsOn)
      context.addIssue({
        code: "custom",
        message: "Leave end date must be on or after the start date.",
        path: ["endsOn"],
      });
  });

export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
