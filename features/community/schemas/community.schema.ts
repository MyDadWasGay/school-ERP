import { z } from "zod";
import { parseIndiaDateTimeValue, parseIndiaDateValue } from "@/lib/utils/india-time";

const dateInput = z.preprocess(parseIndiaDateValue, z.coerce.date());
const dateTimeInput = z.preprocess(parseIndiaDateTimeValue, z.coerce.date());

export const clubSchema = z.object({
  name: z.string().trim().min(2).max(160),
  coordinatorUserId: z.string().trim().max(120).optional(),
});

export const achievementSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  achievedOn: dateInput,
});

export const clubMembershipSchema = z.object({
  clubId: z.string().min(1),
  studentId: z.string().min(1),
});
export const sportsTeamSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sport: z.string().trim().min(2).max(80),
});
export const sportsFixtureSchema = z.object({
  teamId: z.string().min(1),
  opponent: z.string().trim().min(2).max(160),
  startsAt: dateTimeInput,
  venue: z.string().trim().min(2).max(200),
});

export const alumniProfileSchema = z.object({
  name: z.string().trim().min(2).max(160),
  studentId: z.string().trim().max(120).optional(),
  graduationYear: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Graduation year must use YYYY format."),
  directoryVisible: z.boolean(),
});

export const alumniEventSchema = z.object({
  name: z.string().trim().min(2).max(160),
  startsAt: dateTimeInput,
  details: z.string().trim().min(2).max(1_000),
});

export const mentorshipSchema = z.object({
  mentorName: z.string().trim().min(2).max(160),
  menteeName: z.string().trim().min(2).max(160),
  details: z.string().trim().min(2).max(1_000),
});

export const jobBoardPostSchema = z.object({
  title: z.string().trim().min(2).max(160),
  company: z.string().trim().min(2).max(160),
  details: z.string().trim().min(2).max(1_000),
});

export const alumniEventRegistrationSchema = z.object({
  eventId: z.string().min(1),
  attendeeName: z.string().trim().min(2).max(160),
  email: z.string().email().max(320),
});
export const alumniDonationSchema = z.object({
  donorName: z.string().trim().min(2).max(160),
  email: z.string().email().max(320).optional(),
  amountMinor: z.coerce.number().int().positive().max(100_000_000),
  purpose: z.string().trim().min(2).max(300),
});

export const communityTransitionSchema = z.object({
  id: z.string().min(1),
  toStatus: z.string().trim().min(2).max(40),
});

export const cmsPageSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must use lowercase letters, numbers, and hyphens.",
    ),
  title: z.string().trim().min(2).max(160),
  body: z.string().trim().min(2).max(100_000),
  seoTitle: z.string().trim().max(160).optional(),
  seoDescription: z.string().trim().max(320).optional(),
});

export const cmsMediaSchema = z.object({
  name: z.string().trim().min(2).max(160),
  mediaType: z.enum(["image", "video", "document"]),
  secureUrl: z
    .string()
    .url()
    .max(2_000)
    .refine(
      (url) => new URL(url).hostname === "res.cloudinary.com",
      "CMS media must be hosted by Cloudinary.",
    ),
  publicId: z.string().trim().min(1).max(300),
});

export const cmsFieldSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[a-zA-Z][a-zA-Z0-9_]{1,63}$/),
  type: z.enum([
    "text",
    "email",
    "number",
    "date",
    "textarea",
    "checkbox",
    "select",
  ]),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
});

export const cmsFieldsSchema = z.array(cmsFieldSchema).min(1).max(100);

export const cmsFormSchema = z.object({
  name: z.string().trim().min(2).max(160),
  fieldsJson: z.string().trim().min(2).max(50_000),
  admissionEnquiry: z.boolean().default(false),
});

export const formSubmissionSchema = z.object({
  formId: z.string().min(1),
  payloadJson: z.string().trim().min(2).max(100_000),
});

export type ClubInput = z.infer<typeof clubSchema>;
export type AchievementInput = z.infer<typeof achievementSchema>;
export type ClubMembershipInput = z.infer<typeof clubMembershipSchema>;
export type SportsTeamInput = z.infer<typeof sportsTeamSchema>;
export type SportsFixtureInput = z.infer<typeof sportsFixtureSchema>;
export type AlumniProfileInput = z.infer<typeof alumniProfileSchema>;
export type AlumniEventInput = z.infer<typeof alumniEventSchema>;
export type MentorshipInput = z.infer<typeof mentorshipSchema>;
export type JobBoardPostInput = z.infer<typeof jobBoardPostSchema>;
export type AlumniEventRegistrationInput = z.infer<
  typeof alumniEventRegistrationSchema
>;
export type AlumniDonationInput = z.infer<typeof alumniDonationSchema>;
export type CommunityTransitionInput = z.infer<
  typeof communityTransitionSchema
>;
export type CmsPageInput = z.infer<typeof cmsPageSchema>;
export type CmsMediaInput = z.infer<typeof cmsMediaSchema>;
export type CmsFormInput = z.infer<typeof cmsFormSchema>;
export type FormSubmissionInput = z.infer<typeof formSubmissionSchema>;
