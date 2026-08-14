import { z } from "zod";
import { SUPPORTED_ROLES } from "@/config/constants";
import { permissionKeys } from "@/config/permissions";
import { parseIndiaDateTimeValue } from "@/lib/utils/india-time";

const roleSchema = z.enum(SUPPORTED_ROLES);

export const userAccessUpdateSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().trim().min(2).max(120),
  role: roleSchema,
  status: z.enum(["active", "inactive", "suspended"]),
  primaryCampusId: z.string().min(1),
  campusIds: z.array(z.string().min(1)).min(1),
  classSectionScopes: z.array(z.object({
    classId: z.string().min(1),
    sectionId: z.string().min(1),
  })).max(100),
}).superRefine((input, context) => {
  if (!input.campusIds.includes(input.primaryCampusId)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["primaryCampusId"],
      message: "The primary campus must be included in the assigned campus scope.",
    });
  }
});

export const delegationCreateSchema = z.object({
  userId: z.string().min(1),
  campusId: z.string().optional().or(z.literal("")),
  permissionKey: z.string().refine(
    (value) => permissionKeys.includes(value),
    "Choose a known permission.",
  ),
  startsAt: z.preprocess(parseIndiaDateTimeValue, z.coerce.date()),
  endsAt: z.preprocess(parseIndiaDateTimeValue, z.coerce.date()),
}).refine((input) => input.endsAt > input.startsAt, {
  path: ["endsAt"],
  message: "Delegated access must end after it starts.",
});

export const delegationRevokeSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
});

export type UserAccessUpdateInput = z.infer<typeof userAccessUpdateSchema>;
export type DelegationCreateInput = z.infer<typeof delegationCreateSchema>;
export type DelegationRevokeInput = z.infer<typeof delegationRevokeSchema>;
