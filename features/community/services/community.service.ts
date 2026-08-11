import { and, asc, desc, eq, inArray, type AnyColumn } from "drizzle-orm";
import { getDb } from "@/db/client";
import { admissionsEnquiries, alumniDonations, alumniEvents, alumniProfiles, clubs, clubsMemberships, cmsMedia, cmsPages, eventRegistrations, formSubmissions, forms, jobBoardPosts, mentorships, organizations, sportsFixtures, sportsTeams, studentAchievements, students, users } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import { cmsFieldsSchema } from "../schemas/community.schema";
import type { AchievementInput, AlumniDonationInput, AlumniEventInput, AlumniEventRegistrationInput, AlumniProfileInput, ClubInput, ClubMembershipInput, CmsFormInput, CmsMediaInput, CmsPageInput, FormSubmissionInput, JobBoardPostInput, MentorshipInput, SportsFixtureInput, SportsTeamInput } from "../schemas/community.schema";

function campusScope(user: CurrentUser, column: AnyColumn) {
  if (user.campusIds?.length) return inArray(column, user.campusIds);
  return user.campusId ? eq(column, user.campusId) : undefined;
}

async function getStudent(user: CurrentUser, id: string) {
  const row = await getDb().query.students.findFirst({ where: and(eq(students.id, id), eq(students.organizationId, user.organizationId), campusScope(user, students.campusId), eq(students.status, "active")) });
  if (!row) throw new AppError("NOT_FOUND", "Student not found in your scope.", 404);
  return row;
}

async function getForm(user: CurrentUser, id: string) {
  const row = await getDb().query.forms.findFirst({ where: and(eq(forms.id, id), eq(forms.organizationId, user.organizationId), campusScope(user, forms.campusId), eq(forms.status, "published")) });
  if (!row) throw new AppError("NOT_FOUND", "Published form not found in your scope.", 404);
  return row;
}

export async function listClubs(user: CurrentUser) { return getDb().select().from(clubs).where(and(eq(clubs.organizationId, user.organizationId), campusScope(user, clubs.campusId))).orderBy(asc(clubs.name)).limit(300); }
export async function createClub(user: CurrentUser, input: ClubInput) {
  if (input.coordinatorUserId) {
    const coordinator = await getDb().query.users.findFirst({ where: and(eq(users.id, input.coordinatorUserId), eq(users.organizationId, user.organizationId), campusScope(user, users.campusId), eq(users.status, "active")) });
    if (!coordinator) throw new AppError("NOT_FOUND", "Coordinator is not an active user in your scope.", 404);
  }
  const [row] = await getDb().insert(clubs).values({ id: createId("club"), organizationId: user.organizationId, campusId: user.campusId, name: input.name, coordinatorUserId: input.coordinatorUserId || null, status: "active", createdBy: user.id, updatedBy: user.id }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create club.", 500);
  return row;
}

export async function listAchievements(user: CurrentUser) { return getDb().select({ id: studentAchievements.id, studentId: studentAchievements.studentId, studentName: students.firstName, title: studentAchievements.title, achievedOn: studentAchievements.achievedOn, status: studentAchievements.status }).from(studentAchievements).innerJoin(students, and(eq(students.id, studentAchievements.studentId), eq(students.organizationId, user.organizationId))).where(and(eq(studentAchievements.organizationId, user.organizationId), campusScope(user, studentAchievements.campusId))).orderBy(desc(studentAchievements.achievedOn)).limit(500); }
export async function createAchievement(user: CurrentUser, input: AchievementInput) { const student = await getStudent(user, input.studentId); const [row] = await getDb().insert(studentAchievements).values({ id: createId("achievement"), organizationId: user.organizationId, campusId: student.campusId, studentId: student.id, title: input.title, achievedOn: input.achievedOn, status: "active", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to record achievement.", 500); return row; }

export async function listClubMemberships(user: CurrentUser) { return getDb().select({ id: clubsMemberships.id, clubName: clubs.name, student: clubsMemberships.name, studentId: clubsMemberships.detailsJson, status: clubsMemberships.status, createdAt: clubsMemberships.createdAt }).from(clubsMemberships).innerJoin(clubs, and(eq(clubs.id, clubsMemberships.referenceId), eq(clubs.organizationId, user.organizationId))).where(and(eq(clubsMemberships.organizationId, user.organizationId), campusScope(user, clubsMemberships.campusId))).orderBy(desc(clubsMemberships.createdAt)).limit(500); }
export async function createClubMembership(user: CurrentUser, input: ClubMembershipInput) { const [club, student] = await Promise.all([getDb().query.clubs.findFirst({ where: and(eq(clubs.id, input.clubId), eq(clubs.organizationId, user.organizationId), campusScope(user, clubs.campusId), eq(clubs.status, "active")) }), getStudent(user, input.studentId)]); if (!club) throw new AppError("NOT_FOUND", "Club not found in your scope.", 404); const detailsJson = JSON.stringify({ studentId: student.id }); const existing = await getDb().query.clubsMemberships.findFirst({ where: and(eq(clubsMemberships.organizationId, user.organizationId), eq(clubsMemberships.referenceId, club.id), eq(clubsMemberships.detailsJson, detailsJson), eq(clubsMemberships.status, "active")) }); if (existing) throw new AppError("DUPLICATE_RECORD", "Student is already a member of this club.", 409); const [row] = await getDb().insert(clubsMemberships).values({ id: createId("club_membership"), organizationId: user.organizationId, campusId: club.campusId, name: `${student.firstName} ${student.lastName}`, referenceId: club.id, detailsJson, status: "active", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to add club membership.", 500); return row; }

export async function listSportsTeams(user: CurrentUser) { return getDb().select().from(sportsTeams).where(and(eq(sportsTeams.organizationId, user.organizationId), campusScope(user, sportsTeams.campusId))).orderBy(asc(sportsTeams.name)).limit(300); }
export async function createSportsTeam(user: CurrentUser, input: SportsTeamInput) { const [row] = await getDb().insert(sportsTeams).values({ id: createId("sports_team"), organizationId: user.organizationId, campusId: user.campusId, name: input.name, detailsJson: JSON.stringify({ sport: input.sport }), status: "active", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to create sports team.", 500); return row; }
export async function listSportsFixtures(user: CurrentUser) { return getDb().select({ id: sportsFixtures.id, name: sportsFixtures.name, teamId: sportsFixtures.referenceId, startsAt: sportsFixtures.effectiveAt, detailsJson: sportsFixtures.detailsJson, status: sportsFixtures.status }).from(sportsFixtures).where(and(eq(sportsFixtures.organizationId, user.organizationId), campusScope(user, sportsFixtures.campusId))).orderBy(desc(sportsFixtures.effectiveAt)).limit(500); }
export async function createSportsFixture(user: CurrentUser, input: SportsFixtureInput) { const team = await getDb().query.sportsTeams.findFirst({ where: and(eq(sportsTeams.id, input.teamId), eq(sportsTeams.organizationId, user.organizationId), campusScope(user, sportsTeams.campusId), eq(sportsTeams.status, "active")) }); if (!team) throw new AppError("NOT_FOUND", "Sports team not found in your scope.", 404); const [row] = await getDb().insert(sportsFixtures).values({ id: createId("fixture"), organizationId: user.organizationId, campusId: team.campusId, name: `${team.name} vs ${input.opponent}`, referenceId: team.id, effectiveAt: input.startsAt, detailsJson: JSON.stringify({ opponent: input.opponent, venue: input.venue }), status: "planned", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to create sports fixture.", 500); return row; }

export async function listAlumniProfiles(user: CurrentUser) { return getDb().select().from(alumniProfiles).where(and(eq(alumniProfiles.organizationId, user.organizationId), campusScope(user, alumniProfiles.campusId))).orderBy(asc(alumniProfiles.name)).limit(500); }
export async function createAlumniProfile(user: CurrentUser, input: AlumniProfileInput) { const studentId = input.studentId || null; let campusId: string | null = user.campusId ?? null; if (studentId) { const student = await getStudent(user, studentId); campusId = student.campusId; } const [row] = await getDb().insert(alumniProfiles).values({ id: createId("alumni"), organizationId: user.organizationId, campusId, studentId, name: input.name, graduationYear: input.graduationYear, directoryVisible: input.directoryVisible, status: "active", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to create alumni profile.", 500); return row; }

export async function listAlumniEvents(user: CurrentUser) { return getDb().select().from(alumniEvents).where(and(eq(alumniEvents.organizationId, user.organizationId), campusScope(user, alumniEvents.campusId))).orderBy(desc(alumniEvents.effectiveAt)).limit(300); }
export async function createAlumniEvent(user: CurrentUser, input: AlumniEventInput) { const [row] = await getDb().insert(alumniEvents).values({ id: createId("alumni_event"), organizationId: user.organizationId, campusId: user.campusId, name: input.name, effectiveAt: input.startsAt, detailsJson: JSON.stringify({ details: input.details }), status: "planned", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to create alumni event.", 500); return row; }
export async function listAlumniEventRegistrations(user: CurrentUser) { return getDb().select({ id: eventRegistrations.id, eventId: eventRegistrations.referenceId, attendee: eventRegistrations.name, detailsJson: eventRegistrations.detailsJson, status: eventRegistrations.status, createdAt: eventRegistrations.createdAt }).from(eventRegistrations).where(and(eq(eventRegistrations.organizationId, user.organizationId), campusScope(user, eventRegistrations.campusId))).orderBy(desc(eventRegistrations.createdAt)).limit(500); }
export async function createAlumniEventRegistration(user: CurrentUser, input: AlumniEventRegistrationInput) { const event = await getDb().query.alumniEvents.findFirst({ where: and(eq(alumniEvents.id, input.eventId), eq(alumniEvents.organizationId, user.organizationId), campusScope(user, alumniEvents.campusId), eq(alumniEvents.status, "planned")) }); if (!event) throw new AppError("NOT_FOUND", "Alumni event is not open for registration.", 404); const [row] = await getDb().insert(eventRegistrations).values({ id: createId("event_registration"), organizationId: user.organizationId, campusId: event.campusId, name: input.attendeeName, referenceId: event.id, detailsJson: JSON.stringify({ email: input.email }), status: "registered", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to register attendee.", 500); return row; }

export async function listMentorships(user: CurrentUser) { return getDb().select().from(mentorships).where(and(eq(mentorships.organizationId, user.organizationId), campusScope(user, mentorships.campusId))).orderBy(desc(mentorships.createdAt)).limit(300); }
export async function createMentorship(user: CurrentUser, input: MentorshipInput) { const [row] = await getDb().insert(mentorships).values({ id: createId("mentorship"), organizationId: user.organizationId, campusId: user.campusId, name: `${input.mentorName} → ${input.menteeName}`, detailsJson: JSON.stringify({ mentorName: input.mentorName, menteeName: input.menteeName, details: input.details }), status: "requested", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to create mentorship request.", 500); return row; }

export async function listJobBoardPosts(user: CurrentUser) { return getDb().select().from(jobBoardPosts).where(and(eq(jobBoardPosts.organizationId, user.organizationId), campusScope(user, jobBoardPosts.campusId))).orderBy(desc(jobBoardPosts.createdAt)).limit(300); }
export async function createJobBoardPost(user: CurrentUser, input: JobBoardPostInput) { const [row] = await getDb().insert(jobBoardPosts).values({ id: createId("job_post"), organizationId: user.organizationId, campusId: user.campusId, name: input.title, detailsJson: JSON.stringify({ company: input.company, details: input.details }), status: "draft", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to create job post.", 500); return row; }
export async function listAlumniDonations(user: CurrentUser) { return getDb().select().from(alumniDonations).where(and(eq(alumniDonations.organizationId, user.organizationId), campusScope(user, alumniDonations.campusId))).orderBy(desc(alumniDonations.createdAt)).limit(500); }
export async function createAlumniDonation(user: CurrentUser, input: AlumniDonationInput) { const [row] = await getDb().insert(alumniDonations).values({ id: createId("donation"), organizationId: user.organizationId, campusId: user.campusId, name: input.donorName, detailsJson: JSON.stringify({ email: input.email || null, amountMinor: input.amountMinor, purpose: input.purpose }), status: "received", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to record alumni donation.", 500); return row; }

export async function listCmsPages(user: CurrentUser) { return getDb().select().from(cmsPages).where(and(eq(cmsPages.organizationId, user.organizationId), campusScope(user, cmsPages.campusId))).orderBy(desc(cmsPages.updatedAt)).limit(300); }
export async function createCmsPage(user: CurrentUser, input: CmsPageInput) { const existing = await getDb().query.cmsPages.findFirst({ where: and(eq(cmsPages.organizationId, user.organizationId), eq(cmsPages.slug, input.slug)) }); if (existing) throw new AppError("CONFLICT", "That page slug is already in use.", 409); const [row] = await getDb().insert(cmsPages).values({ id: createId("cms_page"), organizationId: user.organizationId, campusId: user.campusId, slug: input.slug, title: input.title, body: input.body, seoJson: JSON.stringify({ title: input.seoTitle || null, description: input.seoDescription || null }), status: "draft", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to create CMS page.", 500); return row; }
const pageTransitions: Record<string, string[]> = { draft: ["published", "archived"], published: ["archived"], archived: ["draft"] };
export async function transitionCmsPage(user: CurrentUser, id: string, toStatus: string) { const row = await getDb().query.cmsPages.findFirst({ where: and(eq(cmsPages.id, id), eq(cmsPages.organizationId, user.organizationId), campusScope(user, cmsPages.campusId)) }); if (!row) throw new AppError("NOT_FOUND", "CMS page not found.", 404); if (!pageTransitions[row.status]?.includes(toStatus)) throw new AppError("CONFLICT", `Cannot move page from ${row.status} to ${toStatus}.`, 409); const [updated] = await getDb().update(cmsPages).set({ status: toStatus, updatedAt: new Date(), updatedBy: user.id }).where(and(eq(cmsPages.id, row.id), eq(cmsPages.status, row.status))).returning(); if (!updated) throw new AppError("CONFLICT", "CMS page changed before publication.", 409); return updated; }

export async function listCmsMedia(user: CurrentUser) { return getDb().select().from(cmsMedia).where(and(eq(cmsMedia.organizationId, user.organizationId), campusScope(user, cmsMedia.campusId))).orderBy(desc(cmsMedia.createdAt)).limit(300); }
export async function createCmsMedia(user: CurrentUser, input: CmsMediaInput) { const [row] = await getDb().insert(cmsMedia).values({ id: createId("cms_media"), organizationId: user.organizationId, campusId: user.campusId, name: input.name, detailsJson: JSON.stringify({ mediaType: input.mediaType, secureUrl: input.secureUrl, publicId: input.publicId || null }), status: "draft", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to register CMS media.", 500); return row; }
export async function transitionCmsMedia(user: CurrentUser, id: string, toStatus: string) { const row = await getDb().query.cmsMedia.findFirst({ where: and(eq(cmsMedia.id, id), eq(cmsMedia.organizationId, user.organizationId), campusScope(user, cmsMedia.campusId)) }); if (!row) throw new AppError("NOT_FOUND", "CMS media not found.", 404); if (!pageTransitions[row.status]?.includes(toStatus)) throw new AppError("CONFLICT", `Cannot move media from ${row.status} to ${toStatus}.`, 409); const [updated] = await getDb().update(cmsMedia).set({ status: toStatus, updatedAt: new Date(), updatedBy: user.id }).where(and(eq(cmsMedia.id, row.id), eq(cmsMedia.status, row.status))).returning(); if (!updated) throw new AppError("CONFLICT", "CMS media changed before publication.", 409); return updated; }

export async function listCmsForms(user: CurrentUser) { return getDb().select().from(forms).where(and(eq(forms.organizationId, user.organizationId), campusScope(user, forms.campusId))).orderBy(desc(forms.updatedAt)).limit(300); }
export async function createCmsForm(user: CurrentUser, input: CmsFormInput) { let fields: unknown; try { fields = JSON.parse(input.fieldsJson); } catch { throw new AppError("VALIDATION_ERROR", "Form fields must be valid JSON.", 400); } const parsedFields = cmsFieldsSchema.safeParse(fields); if (!parsedFields.success) throw new AppError("VALIDATION_ERROR", "Form fields must be a valid bounded field definition.", 422); const [row] = await getDb().insert(forms).values({ id: createId("form"), organizationId: user.organizationId, campusId: user.campusId, name: input.name, detailsJson: JSON.stringify({ fields: parsedFields.data, admissionEnquiry: input.admissionEnquiry }), status: "draft", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to create form.", 500); return row; }
export async function transitionCmsForm(user: CurrentUser, id: string, toStatus: string) { const row = await getDb().query.forms.findFirst({ where: and(eq(forms.id, id), eq(forms.organizationId, user.organizationId), campusScope(user, forms.campusId)) }); if (!row) throw new AppError("NOT_FOUND", "Form not found.", 404); if (!pageTransitions[row.status]?.includes(toStatus)) throw new AppError("CONFLICT", `Cannot move form from ${row.status} to ${toStatus}.`, 409); const [updated] = await getDb().update(forms).set({ status: toStatus, updatedAt: new Date(), updatedBy: user.id }).where(and(eq(forms.id, row.id), eq(forms.status, row.status))).returning(); if (!updated) throw new AppError("CONFLICT", "Form changed before publication.", 409); return updated; }
export async function listFormSubmissions(user: CurrentUser) { return getDb().select({ id: formSubmissions.id, formId: formSubmissions.formId, payloadJson: formSubmissions.payloadJson, createdAt: formSubmissions.createdAt, status: formSubmissions.status }).from(formSubmissions).innerJoin(forms, and(eq(forms.id, formSubmissions.formId), eq(forms.organizationId, user.organizationId))).where(and(eq(formSubmissions.organizationId, user.organizationId), campusScope(user, formSubmissions.campusId))).orderBy(desc(formSubmissions.createdAt)).limit(500); }
export async function createFormSubmission(user: CurrentUser, input: FormSubmissionInput) { const form = await getForm(user, input.formId); try { JSON.parse(input.payloadJson); } catch { throw new AppError("VALIDATION_ERROR", "Submission payload must be valid JSON.", 400); } const [row] = await getDb().insert(formSubmissions).values({ id: createId("form_submission"), organizationId: user.organizationId, campusId: form.campusId, formId: form.id, payloadJson: input.payloadJson, status: "received", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to create form submission.", 500); return row; }

function publicFormDefinition(detailsJson: string) {
  try {
    const parsed = JSON.parse(detailsJson) as unknown;
    const fieldsValue = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" && "fields" in parsed ? parsed.fields : null);
    const fields = cmsFieldsSchema.parse(fieldsValue);
    const admissionEnquiry = Boolean(parsed && typeof parsed === "object" && "admissionEnquiry" in parsed && parsed.admissionEnquiry);
    return { fields, admissionEnquiry };
  } catch { throw new AppError("CONFIGURATION_ERROR", "Published form definition is invalid.", 500); }
}

export async function getPublicCmsPage(organizationSlug: string, slug: string, campusId?: string) {
  const row = await getDb().select({ page: cmsPages, organizationName: organizations.name, timezone: organizations.timezone }).from(cmsPages).innerJoin(organizations, and(eq(organizations.id, cmsPages.organizationId), eq(organizations.status, "active"))).where(and(eq(organizations.slug, organizationSlug), eq(cmsPages.slug, slug), eq(cmsPages.status, "published"), campusId ? eq(cmsPages.campusId, campusId) : undefined)).limit(1);
  return row[0] ?? null;
}

export async function getPublicCmsForm(formId: string) {
  const row = await getDb().query.forms.findFirst({ where: and(eq(forms.id, formId), eq(forms.status, "published")) });
  if (!row) return null;
  const definition = publicFormDefinition(row.detailsJson ?? "");
  return { id: row.id, name: row.name, campusId: row.campusId, fields: definition.fields, admissionEnquiry: definition.admissionEnquiry };
}

export async function submitPublicCmsForm(formId: string, payload: Record<string, unknown>) {
  const form = await getDb().query.forms.findFirst({ where: and(eq(forms.id, formId), eq(forms.status, "published")) });
  if (!form) throw new AppError("NOT_FOUND", "Published form not found.", 404);
  const definition = publicFormDefinition(form.detailsJson ?? "");
  const allowed = new Set(definition.fields.map((field) => field.name));
  for (const key of Object.keys(payload)) if (!allowed.has(key)) throw new AppError("VALIDATION_ERROR", `Unknown form field '${key}'.`, 422);
  for (const field of definition.fields) {
    const value = payload[field.name];
    if (field.required && (value === undefined || value === null || value === "" || (field.type === "checkbox" && value !== true))) throw new AppError("VALIDATION_ERROR", `${field.name} is required.`, 422);
    if (field.type === "select" && value !== undefined && (!field.options?.includes(String(value)))) throw new AppError("VALIDATION_ERROR", `${field.name} is not a valid option.`, 422);
    if (typeof value === "string" && value.length > 2_000) throw new AppError("VALIDATION_ERROR", `${field.name} is too long.`, 422);
  }
  const serializedPayload = JSON.stringify(payload);
  return getDb().transaction(async (tx) => {
    const [submission] = await tx.insert(formSubmissions).values({ id: createId("form_submission"), organizationId: form.organizationId, campusId: form.campusId, formId: form.id, payloadJson: serializedPayload, status: "received", createdBy: null, updatedBy: null }).returning();
    if (!submission) throw new AppError("DATABASE_ERROR", "Unable to record form submission.", 500);
    let enquiryId: string | null = null;
    if (definition.admissionEnquiry) {
      const applicantName = String(payload.applicantName ?? payload.name ?? "Website enquiry").trim().slice(0, 160) || "Website enquiry";
      const email = typeof payload.email === "string" ? payload.email.slice(0, 320) : null;
      const [enquiry] = await tx.insert(admissionsEnquiries).values({ id: createId("enquiry"), organizationId: form.organizationId, campusId: form.campusId, applicantName, guardianEmail: email, source: "cms_form", campaign: form.id, status: "new", createdBy: null, updatedBy: null }).returning({ id: admissionsEnquiries.id });
      enquiryId = enquiry?.id ?? null;
    }
    return { submissionId: submission.id, enquiryId };
  });
}
