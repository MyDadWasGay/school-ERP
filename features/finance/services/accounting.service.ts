import { and, asc, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { chartOfAccounts, donations, expenses, ledgerEntries } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type { AccountInput, DonationInput, ExpenseInput } from "../schemas/accounting.schema";

function campusScope(user: CurrentUser, column: Parameters<typeof eq>[0]) { return user.campusId ? eq(column, user.campusId) : undefined; }

export async function listChartOfAccounts(user: CurrentUser) {
  return getDb().select().from(chartOfAccounts).where(and(eq(chartOfAccounts.organizationId, user.organizationId), campusScope(user, chartOfAccounts.campusId), ne(chartOfAccounts.status, "archived"))).orderBy(asc(chartOfAccounts.code)).limit(500);
}

export async function listExpenses(user: CurrentUser) {
  return getDb().select().from(expenses).where(and(eq(expenses.organizationId, user.organizationId), campusScope(user, expenses.campusId), ne(expenses.status, "archived"))).orderBy(desc(expenses.incurredOn)).limit(500);
}

export async function listLedgerEntries(user: CurrentUser) {
  return getDb().select().from(ledgerEntries).where(and(eq(ledgerEntries.organizationId, user.organizationId), campusScope(user, ledgerEntries.campusId), ne(ledgerEntries.status, "archived"))).orderBy(desc(ledgerEntries.postedAt)).limit(500);
}

export async function listDonations(user: CurrentUser) {
  return getDb().select().from(donations).where(and(eq(donations.organizationId, user.organizationId), campusScope(user, donations.campusId), ne(donations.status, "archived"))).orderBy(desc(donations.receivedAt)).limit(500);
}

export async function createDonation(user: CurrentUser, input: DonationInput) {
  const [row] = await getDb().insert(donations).values({
    id: createId("donation"), organizationId: user.organizationId, campusId: user.campusId,
    donorName: input.donorName, donorEmail: input.donorEmail || null, amountMinor: input.amountMinor,
    purpose: input.purpose, paymentReference: input.paymentReference || null, receivedAt: input.receivedAt,
    status: "received", createdBy: user.id, updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to record donation.", 500);
  return row;
}

export async function createChartAccount(user: CurrentUser, input: AccountInput) {
  if (input.parentId) {
    const parent = await getDb().query.chartOfAccounts.findFirst({ where: and(eq(chartOfAccounts.id, input.parentId), eq(chartOfAccounts.organizationId, user.organizationId), campusScope(user, chartOfAccounts.campusId), ne(chartOfAccounts.status, "archived")) });
    if (!parent) throw new AppError("NOT_FOUND", "Parent account is outside your scope.", 404);
  }
  const [row] = await getDb().insert(chartOfAccounts).values({ id: createId("account"), organizationId: user.organizationId, campusId: user.campusId, code: input.code.toUpperCase(), name: input.name, accountType: input.accountType, parentId: input.parentId ?? null, status: "active", createdBy: user.id, updatedBy: user.id }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create account.", 500);
  return row;
}

export async function createExpense(user: CurrentUser, input: ExpenseInput) {
  const account = await getDb().query.chartOfAccounts.findFirst({ where: and(eq(chartOfAccounts.id, input.accountId), eq(chartOfAccounts.organizationId, user.organizationId), campusScope(user, chartOfAccounts.campusId), ne(chartOfAccounts.status, "archived")) });
  if (!account) throw new AppError("NOT_FOUND", "Expense account is outside your scope.", 404);
  const [row] = await getDb().insert(expenses).values({ id: createId("expense"), organizationId: user.organizationId, campusId: user.campusId, accountId: account.id, description: input.description, amountMinor: input.amountMinor, incurredOn: input.incurredOn, status: "draft", createdBy: user.id, updatedBy: user.id }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create expense.", 500);
  return row;
}
