import { getDb } from "@/db/client";
import { academicYears, campuses, organizations, userCampusScopes, users } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { createId } from "@/lib/utils/ids";
import { ensureOrganizationAccessDefaults } from "./access-defaults.service";
import type { BootstrapInput } from "../schemas/bootstrap.schema";

type FirebaseIdentity = { uid: string; email: string; displayName: string; emailVerified: boolean };

export async function bootstrapSchool(input: BootstrapInput, identity: FirebaseIdentity) {
  return getDb().transaction(async (tx) => {
    const [existingUser] = await tx.select({ id: users.id }).from(users).limit(1);
    const [existingOrganization] = await tx.select({ id: organizations.id }).from(organizations).limit(1);
    if (existingUser || existingOrganization) throw new AppError("CONFLICT", "School setup is already complete. Ask your school administrator to provision your account.", 409);
    const organizationId = createId("org"); const campusId = createId("campus"); const userId = createId("user"); const academicYearId = createId("year"); const now = new Date();
    await tx.insert(organizations).values({ id: organizationId, name: input.schoolName, slug: input.schoolSlug, createdBy: userId, updatedBy: userId });
    await tx.insert(campuses).values({ id: campusId, organizationId, name: input.campusName, code: input.campusCode.toUpperCase(), address: input.campusAddress || undefined, createdBy: userId, updatedBy: userId });
    await tx.insert(academicYears).values({ id: academicYearId, organizationId, campusId, name: `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`, startsOn: new Date(now.getFullYear(), 3, 1), endsOn: new Date(now.getFullYear() + 1, 2, 31), isActive: true, createdBy: userId, updatedBy: userId });
    await ensureOrganizationAccessDefaults(tx, organizationId, userId);
    await tx.insert(users).values({ id: userId, firebaseUid: identity.uid, organizationId, campusId, email: identity.email, displayName: identity.displayName, role: "super_admin", emailVerified: identity.emailVerified, createdBy: userId, updatedBy: userId });
    await tx.insert(userCampusScopes).values({ organizationId, userId, campusId, createdBy: userId, updatedBy: userId });
    return { organizationId, campusId, userId };
  });
}
