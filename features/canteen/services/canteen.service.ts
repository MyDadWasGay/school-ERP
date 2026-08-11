import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { canteenTransactions, messMenus, students } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type { CanteenTransactionInput, MenuInput } from "../schemas/canteen.schema";

function campusScope(user: CurrentUser, column: Parameters<typeof eq>[0]) {
  if (user.campusIds && user.campusIds.length > 0) return inArray(column, user.campusIds);
  return user.campusId ? eq(column, user.campusId) : undefined;
}

export async function listMenus(user: CurrentUser) {
  return getDb().select().from(messMenus).where(and(
    eq(messMenus.organizationId, user.organizationId),
    campusScope(user, messMenus.campusId),
    eq(messMenus.status, "active"),
  )).orderBy(asc(messMenus.name)).limit(300);
}

export async function createMenu(user: CurrentUser, input: MenuInput) {
  const [row] = await getDb().insert(messMenus).values({
    id: createId("mess_menu"), organizationId: user.organizationId, campusId: user.campusId,
    name: input.name, detailsJson: JSON.stringify({ priceMinor: input.priceMinor }), status: "active", createdBy: user.id, updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create menu item.", 500);
  return row;
}

export async function listCanteenStudents(user: CurrentUser) {
  return getDb().select({ id: students.id, name: sql<string>`${students.firstName} || ' ' || ${students.lastName}` }).from(students).where(and(
    eq(students.organizationId, user.organizationId), campusScope(user, students.campusId), eq(students.status, "active"),
  )).orderBy(asc(students.firstName), asc(students.lastName)).limit(500);
}

export async function createCanteenTransaction(user: CurrentUser, input: CanteenTransactionInput) {
  const [menu, student] = await Promise.all([
    getDb().query.messMenus.findFirst({ where: and(eq(messMenus.id, input.menuId), eq(messMenus.organizationId, user.organizationId), campusScope(user, messMenus.campusId), eq(messMenus.status, "active")) }),
    getDb().query.students.findFirst({ where: and(eq(students.id, input.studentId), eq(students.organizationId, user.organizationId), campusScope(user, students.campusId), eq(students.status, "active")) }),
  ]);
  if (!menu || !student) throw new AppError("NOT_FOUND", "Menu or student is outside your canteen scope.", 404);
  const details = menu.detailsJson ? JSON.parse(menu.detailsJson) as { priceMinor?: number } : {};
  const [row] = await getDb().insert(canteenTransactions).values({
    id: createId("canteen_transaction"), organizationId: user.organizationId, campusId: student.campusId,
    name: `${menu.name} · ${student.firstName} ${student.lastName}`, referenceId: menu.id,
    detailsJson: JSON.stringify({ menuId: menu.id, studentId: student.id, quantity: input.quantity, priceMinor: (details.priceMinor ?? 0) * input.quantity }),
    status: "posted", createdBy: user.id, updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to record canteen transaction.", 500);
  return row;
}

export async function listCanteenTransactions(user: CurrentUser) {
  return getDb().select().from(canteenTransactions).where(and(
    eq(canteenTransactions.organizationId, user.organizationId), campusScope(user, canteenTransactions.campusId),
  )).orderBy(desc(canteenTransactions.createdAt)).limit(500);
}
