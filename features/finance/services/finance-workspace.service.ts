import { and, count, desc, eq, inArray, or, sum } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  enrollments,
  feeInvoiceItems,
  feeInvoices,
  feePayments,
  feeRefunds,
  students,
} from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import { normalizePagination } from "@/lib/utils/pagination";
import { formatIndiaDateTime } from "@/lib/utils/india-time";
import {
  getReadableStudent,
  resolvePermittedStudentIds,
} from "@/features/students/services/students.service";
import type { InvoiceInput } from "../schemas/invoice.schema";

function money(minor: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(
    minor / 100,
  );
}

export async function listInvoicesPage(
  user: CurrentUser,
  input?: { page?: number; pageSize?: number },
) {
  const pagination = normalizePagination(input);
  const permittedIds = await resolvePermittedStudentIds(user);
  if (permittedIds && permittedIds.length === 0) {
    return {
      rows: [],
      pageInfo: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: 0,
        pageCount: 0,
      },
    };
  }
  const where = and(
    eq(feeInvoices.organizationId, user.organizationId),
    user.campusId ? eq(feeInvoices.campusId, user.campusId) : undefined,
    permittedIds ? inArray(feeInvoices.studentId, permittedIds) : undefined,
  );
  const [rows, totals] = await Promise.all([
    getDb()
      .select({
        id: feeInvoices.id,
        firstName: students.firstName,
        lastName: students.lastName,
        invoiceNumber: feeInvoices.invoiceNumber,
        totalMinor: feeInvoices.totalMinor,
        balanceMinor: feeInvoices.balanceMinor,
        currency: feeInvoices.currency,
        status: feeInvoices.status,
      })
      .from(feeInvoices)
      .innerJoin(
        students,
        and(
          eq(students.id, feeInvoices.studentId),
          eq(students.organizationId, user.organizationId),
        ),
      )
      .where(where)
      .orderBy(desc(feeInvoices.issuedOn))
      .limit(pagination.pageSize)
      .offset(pagination.offset),
    getDb().select({ value: count() }).from(feeInvoices).where(where),
  ]);
  const total = totals[0]?.value ?? 0;
  return {
    rows: rows.map((row) => ({
      id: row.id,
      student: `${row.firstName} ${row.lastName}`,
      invoiceNumber: row.invoiceNumber,
      total: money(row.totalMinor, row.currency),
      balance: money(row.balanceMinor, row.currency),
      status: row.status,
    })),
    pageInfo: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      pageCount: Math.ceil(total / pagination.pageSize),
    },
  };
}

export async function listStudentInvoices(
  user: CurrentUser,
  studentId: string,
  input?: { page?: number; pageSize?: number },
) {
  const student = await getReadableStudent(user, studentId);
  const pagination = normalizePagination(input);
  const where = and(
    eq(feeInvoices.organizationId, user.organizationId),
    eq(feeInvoices.studentId, student.id),
    student.campusId ? eq(feeInvoices.campusId, student.campusId) : undefined,
  );
  const [rows, totals] = await Promise.all([
    getDb()
      .select({
        id: feeInvoices.id,
        invoiceNumber: feeInvoices.invoiceNumber,
        issuedOn: feeInvoices.issuedOn,
        dueOn: feeInvoices.dueOn,
        totalMinor: feeInvoices.totalMinor,
        balanceMinor: feeInvoices.balanceMinor,
        currency: feeInvoices.currency,
        status: feeInvoices.status,
      })
      .from(feeInvoices)
      .where(where)
      .orderBy(desc(feeInvoices.issuedOn))
      .limit(pagination.pageSize)
      .offset(pagination.offset),
    getDb().select({ value: count() }).from(feeInvoices).where(where),
  ]);
  const total = totals[0]?.value ?? 0;
  return {
    rows: rows.map((row) => ({
      ...row,
      issuedOn: row.issuedOn.toISOString(),
      dueOn: row.dueOn.toISOString(),
    })),
    pageInfo: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      pageCount: Math.ceil(total / pagination.pageSize),
    },
  };
}

export async function getInvoiceStudentOptions(user: CurrentUser) {
  const permittedIds = await resolvePermittedStudentIds(user);
  if (permittedIds && permittedIds.length === 0) return [];
  const rows = await getDb()
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
    })
    .from(students)
    .where(
      and(
        eq(students.organizationId, user.organizationId),
        user.campusId ? eq(students.campusId, user.campusId) : undefined,
        permittedIds ? inArray(students.id, permittedIds) : undefined,
        eq(students.status, "active"),
      ),
    )
    .orderBy(students.firstName)
    .limit(200);
  return rows.map((row) => ({
    id: row.id,
    name: `${row.firstName} ${row.lastName}`,
  }));
}

export async function createInvoice(user: CurrentUser, input: InvoiceInput) {
  const student = await getDb().query.students.findFirst({
    where: and(
      eq(students.id, input.studentId),
      eq(students.organizationId, user.organizationId),
      user.campusId ? eq(students.campusId, user.campusId) : undefined,
      eq(students.status, "active"),
    ),
  });
  if (!student)
    throw new AppError(
      "NOT_FOUND",
      "Student not found in your campus scope.",
      404,
    );
  const enrollment = await getDb().query.enrollments.findFirst({
    where: and(
      eq(enrollments.organizationId, user.organizationId),
      eq(enrollments.studentId, student.id),
      eq(enrollments.status, "active"),
    ),
  });
  if (!enrollment)
    throw new AppError(
      "CONFLICT",
      "The student needs an active enrollment before invoicing.",
      409,
    );
  const invoiceNumber = `INV-${new Date().getFullYear()}-${createId("invoice").slice(-8).toUpperCase()}`;
  return getDb().transaction(async (tx) => {
    const [invoice] = await tx
      .insert(feeInvoices)
      .values({
        organizationId: user.organizationId,
        campusId: student.campusId,
        studentId: student.id,
        academicYearId: enrollment.academicYearId,
        invoiceNumber,
        dueOn: input.dueOn,
        totalMinor: input.amountMinor,
        balanceMinor: input.amountMinor,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();
    await tx.insert(feeInvoiceItems).values({
      organizationId: user.organizationId,
      campusId: student.campusId,
      invoiceId: invoice.id,
      description: input.description,
      quantity: 1,
      unitAmountMinor: input.amountMinor,
      totalMinor: input.amountMinor,
      createdBy: user.id,
      updatedBy: user.id,
    });
    return invoice;
  });
}

export async function getPaymentOptions(user: CurrentUser) {
  const permittedIds = await resolvePermittedStudentIds(user);
  if (permittedIds && permittedIds.length === 0) return [];
  const rows = await getDb()
    .select({
      id: feeInvoices.id,
      studentId: feeInvoices.studentId,
      invoiceNumber: feeInvoices.invoiceNumber,
      balanceMinor: feeInvoices.balanceMinor,
      currency: feeInvoices.currency,
      firstName: students.firstName,
      lastName: students.lastName,
    })
    .from(feeInvoices)
    .innerJoin(
      students,
      and(
        eq(students.id, feeInvoices.studentId),
        eq(students.organizationId, user.organizationId),
      ),
    )
    .where(
      and(
        eq(feeInvoices.organizationId, user.organizationId),
        user.campusId ? eq(feeInvoices.campusId, user.campusId) : undefined,
        permittedIds ? inArray(feeInvoices.studentId, permittedIds) : undefined,
        or(
          eq(feeInvoices.status, "open"),
          eq(feeInvoices.status, "partial"),
          eq(feeInvoices.status, "overdue"),
        ),
      ),
    )
    .orderBy(desc(feeInvoices.dueOn))
    .limit(200);
  return rows.map((row) => ({
    id: row.id,
    studentId: row.studentId,
    label: `${row.invoiceNumber} - ${row.firstName} ${row.lastName} - ${money(row.balanceMinor, row.currency)} due`,
    balanceMinor: row.balanceMinor,
  }));
}

export async function listPayments(user: CurrentUser) {
  const permittedIds = await resolvePermittedStudentIds(user);
  if (permittedIds && permittedIds.length === 0) return [];
  const rows = await getDb()
    .select()
    .from(feePayments)
    .where(
      and(
        eq(feePayments.organizationId, user.organizationId),
        user.campusId ? eq(feePayments.campusId, user.campusId) : undefined,
        permittedIds ? inArray(feePayments.studentId, permittedIds) : undefined,
      ),
    )
    .orderBy(desc(feePayments.paidAt))
    .limit(100);
  return rows.map((row) => ({
    id: row.id,
    receiptNumber: row.receiptNumber,
    amount: money(row.amountMinor),
    method: row.method.replaceAll("_", " "),
    paidAt: formatIndiaDateTime(row.paidAt),
    status: row.status,
  }));
}

export async function getRefundOptions(user: CurrentUser) {
  const permittedIds = await resolvePermittedStudentIds(user);
  if (permittedIds && permittedIds.length === 0) return [];
  const rows = await getDb()
    .select({
      id: feePayments.id,
      receiptNumber: feePayments.receiptNumber,
      amountMinor: feePayments.amountMinor,
      refundedMinor: sum(feeRefunds.amountMinor),
      firstName: students.firstName,
      lastName: students.lastName,
    })
    .from(feePayments)
    .innerJoin(
      students,
      and(
        eq(students.id, feePayments.studentId),
        eq(students.organizationId, user.organizationId),
      ),
    )
    .leftJoin(
      feeRefunds,
      and(
        eq(feeRefunds.paymentId, feePayments.id),
        eq(feeRefunds.organizationId, user.organizationId),
        inArray(feeRefunds.status, [
          "creating",
          "pending",
          "processing",
          "manual_review",
          "completed",
        ]),
      ),
    )
    .where(
      and(
        eq(feePayments.organizationId, user.organizationId),
        user.campusId ? eq(feePayments.campusId, user.campusId) : undefined,
        permittedIds ? inArray(feePayments.studentId, permittedIds) : undefined,
        inArray(feePayments.status, ["posted", "partially_refunded"]),
      ),
    )
    .groupBy(
      feePayments.id,
      feePayments.receiptNumber,
      feePayments.amountMinor,
      students.firstName,
      students.lastName,
    )
    .orderBy(desc(feePayments.paidAt))
    .limit(200);
  return rows.flatMap((row) => {
    const remainingMinor = row.amountMinor - Number(row.refundedMinor ?? 0);
    return remainingMinor > 0
      ? [
          {
            id: row.id,
            label: `${row.receiptNumber} - ${row.firstName} ${row.lastName}`,
            remainingMinor,
          },
        ]
      : [];
  });
}
