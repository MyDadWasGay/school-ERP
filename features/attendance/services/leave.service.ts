import "server-only";

import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { leaveRequests } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import type { LeaveRequestInput } from "../schemas/leave.schema";

function requester(user: CurrentUser) {
  if (user.linkedStudentId) return { requesterType: "student", requesterId: user.linkedStudentId } as const;
  return { requesterType: "employee", requesterId: user.id } as const;
}

export async function createLeaveRequest(user: CurrentUser, input: LeaveRequestInput) {
  const subject = requester(user);
  return getDb().transaction(async (tx) => {
    const overlap = await tx.query.leaveRequests.findFirst({ where: and(
      eq(leaveRequests.organizationId, user.organizationId),
      eq(leaveRequests.requesterType, subject.requesterType),
      eq(leaveRequests.requesterId, subject.requesterId),
      inArray(leaveRequests.status, ["pending", "approved"]),
      lte(leaveRequests.startsOn, input.endsOn),
      gte(leaveRequests.endsOn, input.startsOn),
    ) });
    if (overlap) throw new AppError("CONFLICT", "This request overlaps an existing pending or approved leave.", 409);
    const [row] = await tx.insert(leaveRequests).values({
      organizationId: user.organizationId,
      campusId: user.campusId,
      requesterType: subject.requesterType,
      requesterId: subject.requesterId,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      reason: input.reason,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    return row;
  });
}

export async function listLeaveRequests(user: CurrentUser) {
  const subject = requester(user);
  const canReview = user.permissions.includes("*") || user.permissions.includes("attendance:approve_leave") || user.permissions.includes("hr:read");
  const rows = await getDb().query.leaveRequests.findMany({ where: and(
    eq(leaveRequests.organizationId, user.organizationId),
    user.campusId ? eq(leaveRequests.campusId, user.campusId) : undefined,
    canReview ? undefined : and(eq(leaveRequests.requesterType, subject.requesterType), eq(leaveRequests.requesterId, subject.requesterId)),
  ), orderBy: (table, { desc }) => [desc(table.createdAt)], limit: 100 });
  return rows.map((row) => ({
    id: row.id,
    requester: row.requesterId === subject.requesterId ? "My request" : `${row.requesterType} · ${row.requesterId}`,
    startsOn: row.startsOn.toLocaleDateString(),
    endsOn: row.endsOn.toLocaleDateString(),
    reason: row.reason,
    status: row.status,
    canReview: canReview && row.requesterId !== subject.requesterId && row.status === "pending",
  }));
}

export async function reviewLeaveRequest(user: CurrentUser, leaveId: string, decision: "approved" | "rejected") {
  return getDb().transaction(async (tx) => {
    const subject = requester(user);
    const leave = await tx.query.leaveRequests.findFirst({ where: and(
      eq(leaveRequests.id, leaveId),
      eq(leaveRequests.organizationId, user.organizationId),
      user.campusId ? eq(leaveRequests.campusId, user.campusId) : undefined,
      eq(leaveRequests.status, "pending"),
    ) });
    if (!leave) throw new AppError("NOT_FOUND", "Pending leave request not found.", 404);
    if (leave.requesterType === subject.requesterType && leave.requesterId === subject.requesterId) throw new AppError("FORBIDDEN", "You cannot approve your own leave request.", 403);
    const [row] = await tx.update(leaveRequests).set({
      status: decision,
      reviewedBy: user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
      updatedBy: user.id,
    }).where(and(eq(leaveRequests.id, leave.id), eq(leaveRequests.organizationId, user.organizationId), eq(leaveRequests.status, "pending"))).returning();
    return { before: leave, row };
  });
}
