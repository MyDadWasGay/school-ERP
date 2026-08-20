import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  assignmentSubmissions,
  assignments,
  applications,
  assets,
  cmsMedia,
  employees,
  healthProfiles,
  libraryItems,
  studentCertificates,
  students,
} from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import type { UploadEntityType } from "@/lib/cloudinary/types";
import { hasPermission } from "@/lib/rbac/permissions";
import { getStudentProfile, resolvePermittedStudentIds } from "@/features/students/services/students.service";

function submissionStudentId(detailsJson: string | null, fallback: string) {
  if (detailsJson) {
    try {
      const details = JSON.parse(detailsJson) as Record<string, unknown>;
      if (typeof details.studentId === "string") return details.studentId;
    } catch {
      // The submission name remains the legacy student-id fallback.
    }
  }
  return fallback;
}

export async function assertDocumentEntityScope(user: CurrentUser, entityType: UploadEntityType, entityId: string) {
  if (entityType === "custom") return;
  if (entityType === "assignment_submission") {
    const submission = await getDb().query.assignmentSubmissions.findFirst({
      where: and(
        eq(assignmentSubmissions.id, entityId),
        eq(assignmentSubmissions.organizationId, user.organizationId),
        user.campusId ? eq(assignmentSubmissions.campusId, user.campusId) : undefined,
        eq(assignmentSubmissions.status, "active"),
      ),
    });
    const assignment = submission?.referenceId
      ? await getDb().query.assignments.findFirst({
          where: and(
            eq(assignments.id, submission.referenceId),
            eq(assignments.organizationId, user.organizationId),
            user.campusId ? eq(assignments.campusId, user.campusId) : undefined,
            eq(assignments.status, "published"),
          ),
        })
      : undefined;
    if (!submission || !assignment) {
      throw new AppError("TENANT_SCOPE_ERROR", "The linked assignment submission is outside your organization or campus scope.", 403);
    }
    if (user.role === "teacher") {
      if (
        assignment.teacherId !== user.id ||
        !(user.classSectionScopes ?? []).some((scope) => scope.classId === assignment.classId)
      ) {
        throw new AppError("FORBIDDEN", "This assignment submission is outside your teaching scope.", 403);
      }
    } else if (user.role === "student" || user.role === "parent") {
      const permitted = await resolvePermittedStudentIds(user);
      if (!permitted?.includes(submissionStudentId(submission.detailsJson, submission.name))) {
        throw new AppError("FORBIDDEN", "This assignment submission is outside your linked student scope.", 403);
      }
    } else if (!hasPermission(user, "academics:read")) {
      throw new AppError("FORBIDDEN", "Academic access is required for this assignment submission.", 403);
    }
    return;
  }
  if (
    entityType === "employee" &&
    user.linkedEmployeeId !== entityId &&
    !hasPermission(user, "hr:read")
  ) {
    throw new AppError("FORBIDDEN", "You may only access staff documents in your permitted HR scope.", 403);
  }
  if (entityType === "student" && ["parent", "student", "teacher"].includes(user.role)) {
    await getStudentProfile(user, entityId);
  }
  const tenant = user.organizationId;
  const campus = user.campusId;
  const found = entityType === "student"
    ? await getDb().query.students.findFirst({ where: and(eq(students.id, entityId), eq(students.organizationId, tenant), campus ? eq(students.campusId, campus) : undefined) })
    : entityType === "employee"
      ? await getDb().query.employees.findFirst({ where: and(eq(employees.id, entityId), eq(employees.organizationId, tenant), campus ? eq(employees.campusId, campus) : undefined) })
      : entityType === "application"
        ? await getDb().query.applications.findFirst({ where: and(eq(applications.id, entityId), eq(applications.organizationId, tenant), campus ? eq(applications.campusId, campus) : undefined) })
        : entityType === "certificate"
          ? await getDb().query.studentCertificates.findFirst({ where: and(eq(studentCertificates.id, entityId), eq(studentCertificates.organizationId, tenant), campus ? eq(studentCertificates.campusId, campus) : undefined) })
          : entityType === "library_item"
            ? await getDb().query.libraryItems.findFirst({ where: and(eq(libraryItems.id, entityId), eq(libraryItems.organizationId, tenant), campus ? eq(libraryItems.campusId, campus) : undefined) })
            : entityType === "asset"
              ? await getDb().query.assets.findFirst({ where: and(eq(assets.id, entityId), eq(assets.organizationId, tenant), campus ? eq(assets.campusId, campus) : undefined) })
              : entityType === "cms_media"
                ? await getDb().query.cmsMedia.findFirst({ where: and(eq(cmsMedia.id, entityId), eq(cmsMedia.organizationId, tenant), campus ? eq(cmsMedia.campusId, campus) : undefined) })
                : await getDb().query.healthProfiles.findFirst({ where: and(eq(healthProfiles.id, entityId), eq(healthProfiles.organizationId, tenant), campus ? eq(healthProfiles.campusId, campus) : undefined) });
  if (!found) throw new AppError("TENANT_SCOPE_ERROR", "The linked record is outside your organization or campus scope.", 403);
}
