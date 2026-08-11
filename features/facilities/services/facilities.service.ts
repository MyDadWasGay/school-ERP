
import { and, desc, eq, inArray, type AnyColumn } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  facilityBookings,
  facilityComplaints,
  facilityMaintenanceTickets,
} from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { databaseErrorIncludes } from "@/lib/errors/database-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type {
  FacilityBookingInput,
  FacilityBookingStatusInput,
  FacilityComplaintInput,
  FacilityComplaintStatusInput,
  FacilityMaintenanceInput,
  FacilityMaintenanceStatusInput,
} from "../schemas/facilities.schema";

function campusScope(user: CurrentUser, column: AnyColumn) {
  if (user.campusIds && user.campusIds.length > 0)
    return inArray(column, user.campusIds);
  return user.campusId ? eq(column, user.campusId) : undefined;
}

function parseBooking(value: string | null) {
  try {
    return value
      ? (JSON.parse(value) as { startsAt?: string; endsAt?: string })
      : {};
  } catch {
    return {};
  }
}
function ensureWindow(input: FacilityBookingInput) {
  if (input.endsAt.getTime() <= input.startsAt.getTime())
    throw new AppError(
      "VALIDATION_ERROR",
      "Facility booking must end after it starts.",
      400,
    );
}

export async function listFacilityBookings(user: CurrentUser) {
  return getDb()
    .select()
    .from(facilityBookings)
    .where(
      and(
        eq(facilityBookings.organizationId, user.organizationId),
        campusScope(user, facilityBookings.campusId),
      ),
    )
    .orderBy(desc(facilityBookings.effectiveAt))
    .limit(500);
}

export async function createFacilityBooking(
  user: CurrentUser,
  input: FacilityBookingInput,
) {
  ensureWindow(input);
  const rows = await getDb()
    .select()
    .from(facilityBookings)
    .where(
      and(
        eq(facilityBookings.organizationId, user.organizationId),
        campusScope(user, facilityBookings.campusId),
        eq(facilityBookings.status, "approved"),
      ),
    );
  const requestedStart = input.startsAt.getTime();
  const requestedEnd = input.endsAt.getTime();
  for (const row of rows) {
    const existing = parseBooking(row.detailsJson);
    if (
      existing.startsAt &&
      existing.endsAt &&
      new Date(existing.startsAt).getTime() < requestedEnd &&
      new Date(existing.endsAt).getTime() > requestedStart &&
      row.name === input.facilityName
    )
      throw new AppError(
        "CONFLICT",
        "That facility is already booked for the requested time.",
        409,
      );
  }
  const [row] = await getDb()
    .insert(facilityBookings)
    .values({
      id: createId("facility_booking"),
      organizationId: user.organizationId,
      campusId: user.campusId,
      name: input.facilityName,
      effectiveAt: input.startsAt,
      detailsJson: JSON.stringify({
        purpose: input.purpose,
        startsAt: input.startsAt.toISOString(),
        endsAt: input.endsAt.toISOString(),
      }),
      status: "requested",
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning();
  if (!row)
    throw new AppError(
      "DATABASE_ERROR",
      "Unable to request facility booking.",
      500,
    );
  return row;
}

const bookingTransitions: Record<string, string[]> = {
  requested: ["approved", "rejected", "cancelled"],
  approved: ["completed", "cancelled"],
};
export async function transitionFacilityBooking(
  user: CurrentUser,
  input: FacilityBookingStatusInput,
) {
  const row = await getDb().query.facilityBookings.findFirst({
    where: and(
      eq(facilityBookings.id, input.id),
      eq(facilityBookings.organizationId, user.organizationId),
      campusScope(user, facilityBookings.campusId),
    ),
  });
  if (!row) throw new AppError("NOT_FOUND", "Facility booking not found.", 404);
  if (!bookingTransitions[row.status]?.includes(input.toStatus)) {
    throw new AppError(
      "CONFLICT",
      `Cannot move booking from ${row.status} to ${input.toStatus}.`,
      409,
    );
  }
  try {
    const [updated] = await getDb()
      .update(facilityBookings)
      .set({
        status: input.toStatus,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(
        and(
          eq(facilityBookings.id, row.id),
          eq(facilityBookings.organizationId, user.organizationId),
          eq(facilityBookings.status, row.status),
        ),
      )
      .returning();
    if (!updated)
      throw new AppError(
        "CONFLICT",
        "Booking changed before the transition was saved.",
        409,
      );
    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (databaseErrorIncludes(error, "facility booking approval overlaps")) {
      throw new AppError(
        "CONFLICT",
        "That facility is already approved for an overlapping time.",
        409,
      );
    }
    throw error;
  }
}

export async function listFacilityMaintenance(user: CurrentUser) {
  return getDb()
    .select()
    .from(facilityMaintenanceTickets)
    .where(
      and(
        eq(facilityMaintenanceTickets.organizationId, user.organizationId),
        campusScope(user, facilityMaintenanceTickets.campusId),
      ),
    )
    .orderBy(desc(facilityMaintenanceTickets.createdAt))
    .limit(500);
}
export async function createFacilityMaintenance(
  user: CurrentUser,
  input: FacilityMaintenanceInput,
) {
  const [row] = await getDb()
    .insert(facilityMaintenanceTickets)
    .values({
      id: createId("facility_ticket"),
      organizationId: user.organizationId,
      campusId: user.campusId,
      name: input.title,
      detailsJson: JSON.stringify({
        facilityName: input.facilityName,
        priority: input.priority,
        details: input.details,
      }),
      status: "open",
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning();
  if (!row)
    throw new AppError(
      "DATABASE_ERROR",
      "Unable to create facility maintenance ticket.",
      500,
    );
  return row;
}
const maintenanceTransitions: Record<string, string[]> = {
  open: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
};
export async function transitionFacilityMaintenance(
  user: CurrentUser,
  input: FacilityMaintenanceStatusInput,
) {
  const row = await getDb().query.facilityMaintenanceTickets.findFirst({
    where: and(
      eq(facilityMaintenanceTickets.id, input.id),
      eq(facilityMaintenanceTickets.organizationId, user.organizationId),
      campusScope(user, facilityMaintenanceTickets.campusId),
    ),
  });
  if (!row)
    throw new AppError(
      "NOT_FOUND",
      "Facility maintenance ticket not found.",
      404,
    );
  if (!maintenanceTransitions[row.status]?.includes(input.toStatus))
    throw new AppError(
      "CONFLICT",
      `Cannot move maintenance ticket from ${row.status} to ${input.toStatus}.`,
      409,
    );
  const [updated] = await getDb()
    .update(facilityMaintenanceTickets)
    .set({ status: input.toStatus, updatedAt: new Date(), updatedBy: user.id })
    .where(
      and(
        eq(facilityMaintenanceTickets.id, row.id),
        eq(facilityMaintenanceTickets.status, row.status),
      ),
    )
    .returning();
  if (!updated)
    throw new AppError(
      "CONFLICT",
      "Maintenance ticket changed before the transition was saved.",
      409,
    );
  return updated;
}

export async function listFacilityComplaints(user: CurrentUser) {
  return getDb()
    .select()
    .from(facilityComplaints)
    .where(
      and(
        eq(facilityComplaints.organizationId, user.organizationId),
        campusScope(user, facilityComplaints.campusId),
      ),
    )
    .orderBy(desc(facilityComplaints.createdAt))
    .limit(500);
}
export async function createFacilityComplaint(
  user: CurrentUser,
  input: FacilityComplaintInput,
) {
  const [row] = await getDb()
    .insert(facilityComplaints)
    .values({
      id: createId("facility_complaint"),
      organizationId: user.organizationId,
      campusId: user.campusId,
      name: input.title,
      detailsJson: JSON.stringify({
        facilityName: input.facilityName,
        details: input.details,
      }),
      status: "open",
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning();
  if (!row)
    throw new AppError(
      "DATABASE_ERROR",
      "Unable to create facility complaint.",
      500,
    );
  return row;
}
const complaintTransitions: Record<string, string[]> = {
  open: ["in_progress", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: ["closed"],
};
export async function transitionFacilityComplaint(
  user: CurrentUser,
  input: FacilityComplaintStatusInput,
) {
  const row = await getDb().query.facilityComplaints.findFirst({
    where: and(
      eq(facilityComplaints.id, input.id),
      eq(facilityComplaints.organizationId, user.organizationId),
      campusScope(user, facilityComplaints.campusId),
    ),
  });
  if (!row)
    throw new AppError("NOT_FOUND", "Facility complaint not found.", 404);
  if (!complaintTransitions[row.status]?.includes(input.toStatus))
    throw new AppError(
      "CONFLICT",
      `Cannot move complaint from ${row.status} to ${input.toStatus}.`,
      409,
    );
  const [updated] = await getDb()
    .update(facilityComplaints)
    .set({ status: input.toStatus, updatedAt: new Date(), updatedBy: user.id })
    .where(
      and(
        eq(facilityComplaints.id, row.id),
        eq(facilityComplaints.status, row.status),
      ),
    )
    .returning();
  if (!updated)
    throw new AppError(
      "CONFLICT",
      "Complaint changed before the transition was saved.",
      409,
    );
  return updated;
}
