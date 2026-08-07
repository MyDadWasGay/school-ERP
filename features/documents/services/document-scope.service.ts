import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
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
import { getStudentProfile } from "@/features/students/services/students.service";

export async function assertDocumentEntityScope(user: CurrentUser, entityType: UploadEntityType, entityId: string) {
  if (entityType === "custom") return;
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
