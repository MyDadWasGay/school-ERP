import { and, asc, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { academicYears, classes, feeHeads, feeInstallments, feeStructures } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type { FeeHeadInput, FeeInstallmentInput, FeeStructureInput } from "../schemas/fee-configuration.schema";

function campusScope(user: CurrentUser, column: Parameters<typeof eq>[0]) {
  return user.campusId ? eq(column, user.campusId) : undefined;
}

async function assertAcademicYear(user: CurrentUser, id: string) {
  const row = await getDb().query.academicYears.findFirst({ where: and(eq(academicYears.id, id), eq(academicYears.organizationId, user.organizationId), campusScope(user, academicYears.campusId), ne(academicYears.status, "archived")) });
  if (!row) throw new AppError("NOT_FOUND", "Academic year is outside your campus scope.", 404);
  return row;
}

export async function listFeeConfiguration(user: CurrentUser) {
  const [heads, structures, installments] = await Promise.all([
    getDb().select().from(feeHeads).where(and(eq(feeHeads.organizationId, user.organizationId), campusScope(user, feeHeads.campusId), ne(feeHeads.status, "archived"))).orderBy(asc(feeHeads.name)).limit(500),
    getDb().select().from(feeStructures).where(and(eq(feeStructures.organizationId, user.organizationId), campusScope(user, feeStructures.campusId), ne(feeStructures.status, "archived"))).orderBy(desc(feeStructures.effectiveFrom)).limit(300),
    getDb().select().from(feeInstallments).where(and(eq(feeInstallments.organizationId, user.organizationId), campusScope(user, feeInstallments.campusId), ne(feeInstallments.status, "archived"))).orderBy(asc(feeInstallments.dueOn)).limit(500),
  ]);
  const years = await getDb().select({ id: academicYears.id, name: academicYears.name }).from(academicYears).where(and(eq(academicYears.organizationId, user.organizationId), campusScope(user, academicYears.campusId), eq(academicYears.status, "active"))).orderBy(desc(academicYears.startsOn)).limit(100);
  const scopedClasses = await getDb().select({ id: classes.id, name: classes.name }).from(classes).where(and(eq(classes.organizationId, user.organizationId), campusScope(user, classes.campusId), eq(classes.status, "active"))).orderBy(asc(classes.name)).limit(200);
  return { heads, structures, installments, years, classes: scopedClasses };
}

export async function createFeeHead(user: CurrentUser, input: FeeHeadInput) {
  const [row] = await getDb().insert(feeHeads).values({ id: createId("fee_head"), organizationId: user.organizationId, campusId: user.campusId, name: input.name, code: input.code.toUpperCase(), status: "active", createdBy: user.id, updatedBy: user.id }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create fee head.", 500);
  return row;
}

export async function createFeeStructure(user: CurrentUser, input: FeeStructureInput) {
  await assertAcademicYear(user, input.academicYearId);
  if (input.classId) {
    const classRow = await getDb().query.classes.findFirst({ where: and(eq(classes.id, input.classId), eq(classes.organizationId, user.organizationId), campusScope(user, classes.campusId), eq(classes.status, "active")) });
    if (!classRow) throw new AppError("NOT_FOUND", "Class is outside your campus scope.", 404);
  }
  const [row] = await getDb().insert(feeStructures).values({ id: createId("fee_structure"), organizationId: user.organizationId, campusId: user.campusId, academicYearId: input.academicYearId, classId: input.classId ?? null, name: input.name, effectiveFrom: input.effectiveFrom, version: 1, status: "draft", createdBy: user.id, updatedBy: user.id }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create fee structure.", 500);
  return row;
}

export async function createFeeInstallment(user: CurrentUser, input: FeeInstallmentInput) {
  const [structure, head] = await Promise.all([
    getDb().query.feeStructures.findFirst({ where: and(eq(feeStructures.id, input.feeStructureId), eq(feeStructures.organizationId, user.organizationId), campusScope(user, feeStructures.campusId), ne(feeStructures.status, "archived")) }),
    getDb().query.feeHeads.findFirst({ where: and(eq(feeHeads.id, input.feeHeadId), eq(feeHeads.organizationId, user.organizationId), campusScope(user, feeHeads.campusId), ne(feeHeads.status, "archived")) }),
  ]);
  if (!structure || !head) throw new AppError("NOT_FOUND", "Fee structure or head is outside your campus scope.", 404);
  const [row] = await getDb().insert(feeInstallments).values({ id: createId("installment"), organizationId: user.organizationId, campusId: user.campusId, feeStructureId: structure.id, feeHeadId: head.id, name: input.name, amountMinor: input.amountMinor, dueOn: input.dueOn, status: "active", createdBy: user.id, updatedBy: user.id }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create fee installment.", 500);
  return row;
}
