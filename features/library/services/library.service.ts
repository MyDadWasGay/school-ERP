import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  like,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  digitalResources,
  libraryCopies,
  libraryIssueTransactions,
  libraryItems,
  libraryReservations,
  students,
  users,
} from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { hasPermission } from "@/lib/rbac/permissions";
import { createId } from "@/lib/utils/ids";
import { resolvePermittedStudentIds } from "@/features/students/services/students.service";
import type {
  IssueLibraryCopyInput,
  LibraryCopyInput,
  LibraryItemInput,
  RenewLibraryCopyInput,
  ReturnLibraryCopyInput,
  DigitalResourceInput,
  LibraryReservationInput,
} from "../schemas/library.schema";

const BORROWER_LIMIT = 5;
const MAX_ISSUE_DAYS = 60;

function hasCampusScope(
  user: CurrentUser,
  campusId: string | null | undefined,
) {
  if (!campusId) return true;
  const campusIds =
    user.campusIds ??
    [user.campusId].filter((value): value is string => Boolean(value));
  return (
    hasPermission(user, "organizations:update") ||
    campusIds.length === 0 ||
    campusIds.includes(campusId)
  );
}

function scopeCampus(user: CurrentUser, campusId: string | null | undefined) {
  if (campusId && !hasCampusScope(user, campusId))
    throw new AppError(
      "FORBIDDEN",
      "Library record is outside your campus scope.",
      403,
    );
}

export async function listLibraryItems(user: CurrentUser, search?: string) {
  const query = search?.trim();
  const rows = await getDb()
    .select()
    .from(libraryItems)
    .where(
      and(
        eq(libraryItems.organizationId, user.organizationId),
        user.campusId ? eq(libraryItems.campusId, user.campusId) : undefined,
        eq(libraryItems.status, "active"),
        query
          ? or(
              like(libraryItems.title, `%${query}%`),
              like(libraryItems.author, `%${query}%`),
              like(libraryItems.isbn, `%${query}%`),
            )
          : undefined,
      ),
    )
    .orderBy(asc(libraryItems.title))
    .limit(200);
  return rows;
}

export async function createLibraryItem(
  user: CurrentUser,
  input: LibraryItemInput,
) {
  const [row] = await getDb()
    .insert(libraryItems)
    .values({
      id: createId("library_item"),
      organizationId: user.organizationId,
      campusId: user.campusId,
      title: input.title,
      author: input.author || null,
      isbn: input.isbn || null,
      totalCopies: 0,
      availableCopies: 0,
      status: "active",
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning();
  if (!row)
    throw new AppError("DATABASE_ERROR", "Unable to create library item.", 500);
  return row;
}

export async function listLibraryCopies(
  user: CurrentUser,
  itemId?: string,
  availableOnly = true,
) {
  const rows = await getDb()
    .select({
      id: libraryCopies.id,
      accessionNumber: libraryCopies.accessionNumber,
      status: libraryCopies.status,
      itemId: libraryCopies.itemId,
      title: libraryItems.title,
      campusId: libraryCopies.campusId,
    })
    .from(libraryCopies)
    .innerJoin(
      libraryItems,
      and(
        eq(libraryItems.id, libraryCopies.itemId),
        eq(libraryItems.organizationId, user.organizationId),
      ),
    )
    .where(
      and(
        eq(libraryCopies.organizationId, user.organizationId),
        user.campusId ? eq(libraryCopies.campusId, user.campusId) : undefined,
        itemId ? eq(libraryCopies.itemId, itemId) : undefined,
        availableOnly ? eq(libraryCopies.status, "available") : undefined,
      ),
    )
    .orderBy(asc(libraryItems.title), asc(libraryCopies.accessionNumber))
    .limit(500);
  return rows;
}

export async function addLibraryCopy(
  user: CurrentUser,
  input: LibraryCopyInput,
) {
  const item = await getDb().query.libraryItems.findFirst({
    where: and(
      eq(libraryItems.id, input.itemId),
      eq(libraryItems.organizationId, user.organizationId),
      user.campusId ? eq(libraryItems.campusId, user.campusId) : undefined,
      eq(libraryItems.status, "active"),
    ),
  });
  if (!item) throw new AppError("NOT_FOUND", "Library item not found.", 404);
  scopeCampus(user, item.campusId);
  return getDb().transaction(async (tx) => {
    const [copy] = await tx
      .insert(libraryCopies)
      .values({
        id: createId("library_copy"),
        organizationId: user.organizationId,
        campusId: item.campusId,
        itemId: item.id,
        accessionNumber: input.accessionNumber,
        status: "available",
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();
    if (!copy)
      throw new AppError("DATABASE_ERROR", "Unable to add library copy.", 500);
    const [updatedItem] = await tx
      .update(libraryItems)
      .set({
        totalCopies: sql`${libraryItems.totalCopies} + 1`,
        availableCopies: sql`${libraryItems.availableCopies} + 1`,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(
        and(
          eq(libraryItems.id, item.id),
          eq(libraryItems.organizationId, user.organizationId),
        ),
      )
      .returning();
    if (!updatedItem)
      throw new AppError(
        "DATABASE_ERROR",
        "Unable to update library availability.",
        500,
      );
    return copy;
  });
}

async function assertBorrower(user: CurrentUser, input: IssueLibraryCopyInput) {
  if (input.borrowerType === "student") {
    const student = await getDb().query.students.findFirst({
      where: and(
        eq(students.id, input.borrowerId),
        eq(students.organizationId, user.organizationId),
        eq(students.status, "active"),
      ),
    });
    if (!student)
      throw new AppError("NOT_FOUND", "Student borrower not found.", 404);
    scopeCampus(user, student.campusId);
    return student;
  }
  const borrower = await getDb().query.users.findFirst({
    where: and(
      eq(users.id, input.borrowerId),
      eq(users.organizationId, user.organizationId),
      eq(users.status, "active"),
    ),
  });
  if (!borrower)
    throw new AppError("NOT_FOUND", "User borrower not found.", 404);
  scopeCampus(user, borrower.campusId);
  return borrower;
}

export async function issueLibraryCopy(
  user: CurrentUser,
  input: IssueLibraryCopyInput,
) {
  const now = new Date();
  if (input.dueAt <= now)
    throw new AppError(
      "VALIDATION_ERROR",
      "Due date must be in the future.",
      422,
    );
  if (input.dueAt.getTime() - now.getTime() > MAX_ISSUE_DAYS * 86_400_000) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Library issues cannot exceed ${MAX_ISSUE_DAYS} days.`,
      422,
    );
  }
  await assertBorrower(user, input);
  const copy = await getDb().query.libraryCopies.findFirst({
    where: and(
      eq(libraryCopies.id, input.copyId),
      eq(libraryCopies.organizationId, user.organizationId),
      user.campusId ? eq(libraryCopies.campusId, user.campusId) : undefined,
      eq(libraryCopies.status, "available"),
    ),
  });
  if (!copy)
    throw new AppError("CONFLICT", "That library copy is not available.", 409);
  const item = await getDb().query.libraryItems.findFirst({
    where: and(
      eq(libraryItems.id, copy.itemId),
      eq(libraryItems.organizationId, user.organizationId),
    ),
  });
  if (!item || item.availableCopies < 1)
    throw new AppError(
      "CONFLICT",
      "Library availability is inconsistent; reconcile the item before issuing it.",
      409,
    );
  const activeIssues = await getDb()
    .select({ id: libraryIssueTransactions.id })
    .from(libraryIssueTransactions)
    .where(
      and(
        eq(libraryIssueTransactions.organizationId, user.organizationId),
        eq(libraryIssueTransactions.borrowerType, input.borrowerType),
        or(
          eq(libraryIssueTransactions.borrowerId, input.borrowerId),
          and(
            isNull(libraryIssueTransactions.borrowerId),
            eq(libraryIssueTransactions.borrowerUserId, input.borrowerId),
          ),
        ),
        eq(libraryIssueTransactions.status, "issued"),
      ),
    )
    .limit(BORROWER_LIMIT + 1);
  if (activeIssues.length >= BORROWER_LIMIT)
    throw new AppError(
      "CONFLICT",
      `Borrower limit of ${BORROWER_LIMIT} active items reached.`,
      409,
    );
  return getDb().transaction(async (tx) => {
    const [claimed] = await tx
      .update(libraryCopies)
      .set({ status: "issued", updatedAt: now, updatedBy: user.id })
      .where(
        and(
          eq(libraryCopies.id, copy.id),
          eq(libraryCopies.organizationId, user.organizationId),
          eq(libraryCopies.status, "available"),
        ),
      )
      .returning();
    if (!claimed)
      throw new AppError(
        "CONFLICT",
        "That library copy was issued by another operator.",
        409,
      );
    const [issue] = await tx
      .insert(libraryIssueTransactions)
      .values({
        id: createId("library_issue"),
        organizationId: user.organizationId,
        campusId: copy.campusId,
        copyId: copy.id,
        borrowerUserId: input.borrowerType === "user" ? input.borrowerId : null,
        borrowerType: input.borrowerType,
        borrowerId: input.borrowerId,
        issuedAt: now,
        dueAt: input.dueAt,
        fineMinor: 0,
        renewalCount: 0,
        status: "issued",
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();
    if (!issue)
      throw new AppError(
        "DATABASE_ERROR",
        "Unable to create library issue.",
        500,
      );
    const [updatedItem] = await tx
      .update(libraryItems)
      .set({
        availableCopies: sql`${libraryItems.availableCopies} - 1`,
        updatedAt: now,
        updatedBy: user.id,
      })
      .where(
        and(
          eq(libraryItems.id, item.id),
          eq(libraryItems.organizationId, user.organizationId),
          gt(libraryItems.availableCopies, 0),
        ),
      )
      .returning();
    if (!updatedItem)
      throw new AppError(
        "CONFLICT",
        "Library availability changed during issue.",
        409,
      );
    return issue;
  });
}

export async function returnLibraryCopy(
  user: CurrentUser,
  input: ReturnLibraryCopyInput,
) {
  const issue = await getDb().query.libraryIssueTransactions.findFirst({
    where: and(
      eq(libraryIssueTransactions.id, input.transactionId),
      eq(libraryIssueTransactions.organizationId, user.organizationId),
      user.campusId
        ? eq(libraryIssueTransactions.campusId, user.campusId)
        : undefined,
      eq(libraryIssueTransactions.status, "issued"),
    ),
  });
  if (!issue)
    throw new AppError("NOT_FOUND", "Active library issue not found.", 404);
  const copy = await getDb().query.libraryCopies.findFirst({
    where: and(
      eq(libraryCopies.id, issue.copyId),
      eq(libraryCopies.organizationId, user.organizationId),
    ),
  });
  if (!copy)
    throw new AppError(
      "DATABASE_ERROR",
      "Issued library copy is missing.",
      500,
    );
  const item = await getDb().query.libraryItems.findFirst({
    where: and(
      eq(libraryItems.id, copy.itemId),
      eq(libraryItems.organizationId, user.organizationId),
    ),
  });
  if (!item)
    throw new AppError(
      "DATABASE_ERROR",
      "Issued library item is missing.",
      500,
    );
  const now = new Date();
  const overdueDays = issue.dueAt
    ? Math.max(
        0,
        Math.ceil((now.getTime() - issue.dueAt.getTime()) / 86_400_000),
      )
    : 0;
  const fineMinor = overdueDays * input.dailyFineMinor;
  return getDb().transaction(async (tx) => {
    const [updatedIssue] = await tx
      .update(libraryIssueTransactions)
      .set({
        status: input.outcome,
        returnedAt: now,
        fineMinor,
        updatedAt: now,
        updatedBy: user.id,
      })
      .where(
        and(
          eq(libraryIssueTransactions.id, issue.id),
          eq(libraryIssueTransactions.organizationId, user.organizationId),
          eq(libraryIssueTransactions.status, "issued"),
        ),
      )
      .returning();
    if (!updatedIssue)
      throw new AppError(
        "CONFLICT",
        "That library issue was already closed.",
        409,
      );
    await tx
      .update(libraryCopies)
      .set({
        status: input.outcome === "returned" ? "available" : input.outcome,
        updatedAt: now,
        updatedBy: user.id,
      })
      .where(
        and(
          eq(libraryCopies.id, copy.id),
          eq(libraryCopies.organizationId, user.organizationId),
          eq(libraryCopies.status, "issued"),
        ),
      );
    if (input.outcome === "returned") {
      await tx
        .update(libraryItems)
        .set({
          availableCopies: sql`${libraryItems.availableCopies} + 1`,
          updatedAt: now,
          updatedBy: user.id,
        })
        .where(
          and(
            eq(libraryItems.id, item.id),
            eq(libraryItems.organizationId, user.organizationId),
          ),
        );
    }
    return { issue: updatedIssue, overdueDays, fineMinor };
  });
}

export async function renewLibraryCopy(
  user: CurrentUser,
  input: RenewLibraryCopyInput,
) {
  const issue = await getDb().query.libraryIssueTransactions.findFirst({
    where: and(
      eq(libraryIssueTransactions.id, input.transactionId),
      eq(libraryIssueTransactions.organizationId, user.organizationId),
      user.campusId
        ? eq(libraryIssueTransactions.campusId, user.campusId)
        : undefined,
      eq(libraryIssueTransactions.status, "issued"),
    ),
  });
  if (!issue)
    throw new AppError("NOT_FOUND", "Active library issue not found.", 404);
  if (issue.renewalCount >= 2)
    throw new AppError(
      "CONFLICT",
      "This library issue has reached its renewal limit.",
      409,
    );
  const base = issue.dueAt ?? issue.issuedAt;
  const dueAt = new Date(base.getTime() + input.extensionDays * 86_400_000);
  const [updated] = await getDb()
    .update(libraryIssueTransactions)
    .set({
      dueAt,
      renewalCount: issue.renewalCount + 1,
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(
      and(
        eq(libraryIssueTransactions.id, issue.id),
        eq(libraryIssueTransactions.organizationId, user.organizationId),
        eq(libraryIssueTransactions.status, "issued"),
      ),
    )
    .returning();
  if (!updated)
    throw new AppError(
      "CONFLICT",
      "Library issue changed before renewal.",
      409,
    );
  return updated;
}

export async function listActiveLibraryIssues(user: CurrentUser) {
  const permittedStudentIds = await resolvePermittedStudentIds(user);
  if (permittedStudentIds !== undefined && permittedStudentIds.length === 0)
    return [];
  const rows = await getDb()
    .select({
      id: libraryIssueTransactions.id,
      borrowerType: libraryIssueTransactions.borrowerType,
      borrowerId: libraryIssueTransactions.borrowerId,
      issuedAt: libraryIssueTransactions.issuedAt,
      dueAt: libraryIssueTransactions.dueAt,
      renewalCount: libraryIssueTransactions.renewalCount,
      accessionNumber: libraryCopies.accessionNumber,
      title: libraryItems.title,
    })
    .from(libraryIssueTransactions)
    .innerJoin(
      libraryCopies,
      and(
        eq(libraryCopies.id, libraryIssueTransactions.copyId),
        eq(libraryCopies.organizationId, user.organizationId),
      ),
    )
    .innerJoin(
      libraryItems,
      and(
        eq(libraryItems.id, libraryCopies.itemId),
        eq(libraryItems.organizationId, user.organizationId),
      ),
    )
    .where(
      and(
        eq(libraryIssueTransactions.organizationId, user.organizationId),
        user.campusId
          ? eq(libraryIssueTransactions.campusId, user.campusId)
          : undefined,
        eq(libraryIssueTransactions.status, "issued"),
        permittedStudentIds
          ? and(
              eq(libraryIssueTransactions.borrowerType, "student"),
              inArray(libraryIssueTransactions.borrowerId, permittedStudentIds),
            )
          : undefined,
      ),
    )
    .orderBy(desc(libraryIssueTransactions.dueAt))
    .limit(500);
  return rows.map((row) => ({
    ...row,
    issuedAt: row.issuedAt.toISOString(),
    dueAt: row.dueAt?.toISOString() ?? null,
  }));
}

export async function listLibraryBorrowers(user: CurrentUser) {
  const permittedStudentIds = await resolvePermittedStudentIds(user);
  if (permittedStudentIds !== undefined && permittedStudentIds.length === 0) {
    return { students: [], users: [] };
  }
  const [studentRows, userRows] = await Promise.all([
    getDb()
      .select({
        id: students.id,
        name: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
      })
      .from(students)
      .where(
        and(
          eq(students.organizationId, user.organizationId),
          user.campusId ? eq(students.campusId, user.campusId) : undefined,
          eq(students.status, "active"),
          permittedStudentIds
            ? inArray(students.id, permittedStudentIds)
            : undefined,
        ),
      )
      .orderBy(students.firstName)
      .limit(200),
    permittedStudentIds !== undefined
      ? Promise.resolve([])
      : getDb()
          .select({ id: users.id, name: users.displayName })
          .from(users)
          .where(
            and(
              eq(users.organizationId, user.organizationId),
              user.campusId ? eq(users.campusId, user.campusId) : undefined,
              eq(users.status, "active"),
            ),
          )
          .orderBy(users.displayName)
          .limit(200),
  ]);
  return { students: studentRows, users: userRows };
}

export async function listLibraryReservations(user: CurrentUser) {
  return getDb()
    .select({
      id: libraryReservations.id,
      name: libraryReservations.name,
      itemId: libraryReservations.referenceId,
      status: libraryReservations.status,
      createdAt: libraryReservations.createdAt,
      detailsJson: libraryReservations.detailsJson,
    })
    .from(libraryReservations)
    .where(
      and(
        eq(libraryReservations.organizationId, user.organizationId),
        user.campusId
          ? eq(libraryReservations.campusId, user.campusId)
          : undefined,
        user.role === "student" || user.role === "parent"
          ? eq(libraryReservations.createdBy, user.id)
          : undefined,
      ),
    )
    .orderBy(desc(libraryReservations.createdAt))
    .limit(300);
}

export async function reserveLibraryItem(
  user: CurrentUser,
  input: LibraryReservationInput,
) {
  const item = await getDb().query.libraryItems.findFirst({
    where: and(
      eq(libraryItems.id, input.itemId),
      eq(libraryItems.organizationId, user.organizationId),
      user.campusId ? eq(libraryItems.campusId, user.campusId) : undefined,
      eq(libraryItems.status, "active"),
    ),
  });
  if (!item)
    throw new AppError(
      "NOT_FOUND",
      "Library item not found in your scope.",
      404,
    );
  const existing = await getDb().query.libraryReservations.findFirst({
    where: and(
      eq(libraryReservations.organizationId, user.organizationId),
      eq(libraryReservations.referenceId, item.id),
      eq(libraryReservations.createdBy, user.id),
      eq(libraryReservations.status, "pending"),
    ),
  });
  if (existing)
    throw new AppError(
      "CONFLICT",
      "You already have a pending reservation for this item.",
      409,
    );
  const [row] = await getDb()
    .insert(libraryReservations)
    .values({
      id: createId("library_reservation"),
      organizationId: user.organizationId,
      campusId: item.campusId,
      name: item.title,
      code: item.isbn,
      referenceId: item.id,
      detailsJson: JSON.stringify({ requesterUserId: user.id }),
      status: "pending",
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning();
  if (!row)
    throw new AppError(
      "DATABASE_ERROR",
      "Unable to create library reservation.",
      500,
    );
  return row;
}

export async function listDigitalResources(user: CurrentUser) {
  return getDb()
    .select()
    .from(digitalResources)
    .where(
      and(
        eq(digitalResources.organizationId, user.organizationId),
        user.campusId
          ? eq(digitalResources.campusId, user.campusId)
          : undefined,
        eq(digitalResources.status, "active"),
      ),
    )
    .orderBy(asc(digitalResources.name))
    .limit(300);
}

export async function createDigitalResource(
  user: CurrentUser,
  input: DigitalResourceInput,
) {
  const [row] = await getDb()
    .insert(digitalResources)
    .values({
      id: createId("digital_resource"),
      organizationId: user.organizationId,
      campusId: user.campusId,
      name: input.name,
      code: null,
      referenceId: null,
      detailsJson: JSON.stringify({
        url: input.url,
        description: input.description || null,
      }),
      status: "active",
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning();
  if (!row)
    throw new AppError(
      "DATABASE_ERROR",
      "Unable to create digital resource.",
      500,
    );
  return row;
}
