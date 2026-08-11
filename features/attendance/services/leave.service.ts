import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { leaveRequests } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import type { LeaveRequestInput } from "../schemas/leave.schema";
import {
  getReadableStudent,
  resolvePermittedStudentIds,
} from "@/features/students/services/students.service";

async function requester(user: CurrentUser, requestedStudentId?: string) {
  if (user.role === "student") {
    if (!user.linkedStudentId)
      throw new AppError(
        "FORBIDDEN",
        "No student record is linked to this account.",
        403,
      );
    if (requestedStudentId && requestedStudentId !== user.linkedStudentId)
      throw new AppError(
        "FORBIDDEN",
        "You can request leave only for your linked student record.",
        403,
      );
    await getReadableStudent(user, user.linkedStudentId);
    return {
      requesterType: "student",
      requesterId: user.linkedStudentId,
    } as const;
  }
  if (user.role === "parent") {
    if (!requestedStudentId)
      throw new AppError(
        "VALIDATION_ERROR",
        "Choose the child requesting leave.",
        422,
      );
    const student = await getReadableStudent(user, requestedStudentId);
    return { requesterType: "student", requesterId: student.id } as const;
  }
  if (requestedStudentId)
    throw new AppError(
      "FORBIDDEN",
      "Staff leave requests cannot select a student.",
      403,
    );
  return { requesterType: "employee", requesterId: user.id } as const;
}

export async function createLeaveRequest(
  user: CurrentUser,
  input: LeaveRequestInput,
) {
  const subject = await requester(user, input.studentId);
  return getDb().transaction(async (tx) => {
    const overlap = await tx.query.leaveRequests.findFirst({
      where: and(
        eq(leaveRequests.organizationId, user.organizationId),
        eq(leaveRequests.requesterType, subject.requesterType),
        eq(leaveRequests.requesterId, subject.requesterId),
        inArray(leaveRequests.status, ["pending", "approved"]),
        lte(leaveRequests.startsOn, input.endsOn),
        gte(leaveRequests.endsOn, input.startsOn),
      ),
    });
    if (overlap)
      throw new AppError(
        "CONFLICT",
        "This request overlaps an existing pending or approved leave.",
        409,
      );
    const [row] = await tx
      .insert(leaveRequests)
      .values({
        organizationId: user.organizationId,
        campusId: user.campusId,
        requesterType: subject.requesterType,
        requesterId: subject.requesterId,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        reason: input.reason,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();
    return row;
  });
}

export async function listLeaveRequests(user: CurrentUser) {
  const canReview =
    user.permissions.includes("*") ||
    user.permissions.includes("attendance:approve_leave") ||
    user.permissions.includes("hr:read");
  const permittedStudentIds = await resolvePermittedStudentIds(user);
  const ownStudentIds =
    user.role === "parent" || user.role === "student"
      ? (permittedStudentIds ?? [])
      : [];
  const ownScope =
    user.role === "student"
      ? and(
          eq(leaveRequests.requesterType, "student"),
          eq(leaveRequests.requesterId, user.linkedStudentId ?? "__unlinked__"),
        )
      : user.role === "parent"
        ? and(
            eq(leaveRequests.requesterType, "student"),
            ownStudentIds.length
              ? inArray(leaveRequests.requesterId, ownStudentIds)
              : eq(leaveRequests.requesterId, "__unlinked__"),
          )
        : and(
            eq(leaveRequests.requesterType, "employee"),
            eq(leaveRequests.requesterId, user.id),
          );
  const rows = await getDb().query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.organizationId, user.organizationId),
      user.campusId ? eq(leaveRequests.campusId, user.campusId) : undefined,
      canReview ? undefined : ownScope,
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    limit: 100,
  });
  return rows.map((row) => ({
    id: row.id,
    requester:
      !canReview ||
      row.requesterId === user.id ||
      ownStudentIds.includes(row.requesterId)
        ? "My request"
        : `${row.requesterType} · ${row.requesterId}`,
    startsOn: row.startsOn.toLocaleDateString(),
    endsOn: row.endsOn.toLocaleDateString(),
    reason: row.reason,
    status: row.status,
    canReview:
      canReview &&
      row.requesterId !== user.id &&
      !ownStudentIds.includes(row.requesterId) &&
      row.status === "pending",
  }));
}

export async function reviewLeaveRequest(
  user: CurrentUser,
  leaveId: string,
  decision: "approved" | "rejected",
) {
  return getDb().transaction(async (tx) => {
    const permittedStudentIds = await resolvePermittedStudentIds(user);
    const ownStudentIds =
      user.role === "parent" || user.role === "student"
        ? (permittedStudentIds ?? [])
        : [];
    const leave = await tx.query.leaveRequests.findFirst({
      where: and(
        eq(leaveRequests.id, leaveId),
        eq(leaveRequests.organizationId, user.organizationId),
        user.campusId ? eq(leaveRequests.campusId, user.campusId) : undefined,
        eq(leaveRequests.status, "pending"),
      ),
    });
    if (!leave)
      throw new AppError("NOT_FOUND", "Pending leave request not found.", 404);
    const ownRequest =
      leave.requesterId === user.id ||
      ownStudentIds.includes(leave.requesterId);
    if (ownRequest)
      throw new AppError(
        "FORBIDDEN",
        "You cannot approve your own leave request.",
        403,
      );
    const [row] = await tx
      .update(leaveRequests)
      .set({
        status: decision,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(
        and(
          eq(leaveRequests.id, leave.id),
          eq(leaveRequests.organizationId, user.organizationId),
          eq(leaveRequests.status, "pending"),
        ),
      )
      .returning();
    return { before: leave, row };
  });
}
