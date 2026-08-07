import "server-only";

import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { hostelAllotments, hostelBeds, hostelRooms, students } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type { HostelAllotmentInput, HostelBedInput, HostelRoomInput } from "../schemas/hostel.schema";

function campusScope(user: CurrentUser, column: Parameters<typeof eq>[0]) {
  if (user.campusIds && user.campusIds.length > 0) return inArray(column, user.campusIds);
  return user.campusId ? eq(column, user.campusId) : undefined;
}

async function getRoom(user: CurrentUser, roomId: string) {
  const room = await getDb().query.hostelRooms.findFirst({ where: and(
    eq(hostelRooms.id, roomId),
    eq(hostelRooms.organizationId, user.organizationId),
    campusScope(user, hostelRooms.campusId),
    eq(hostelRooms.status, "active"),
  ) });
  if (!room) throw new AppError("NOT_FOUND", "Hostel room not found in your scope.", 404);
  return room;
}

export async function listHostelRooms(user: CurrentUser) {
  const rows = await getDb().select({
    id: hostelRooms.id,
    building: hostelRooms.building,
    floor: hostelRooms.floor,
    roomNumber: hostelRooms.roomNumber,
    capacity: hostelRooms.capacity,
    occupancy: count(hostelAllotments.id),
  }).from(hostelRooms).leftJoin(hostelAllotments, and(
    eq(hostelAllotments.roomId, hostelRooms.id),
    eq(hostelAllotments.organizationId, user.organizationId),
    eq(hostelAllotments.status, "active"),
  )).where(and(
    eq(hostelRooms.organizationId, user.organizationId),
    campusScope(user, hostelRooms.campusId),
    eq(hostelRooms.status, "active"),
  )).groupBy(hostelRooms.id, hostelRooms.building, hostelRooms.floor, hostelRooms.roomNumber, hostelRooms.capacity).orderBy(asc(hostelRooms.building), asc(hostelRooms.roomNumber));
  return rows.map((row) => ({ ...row, available: Math.max(0, row.capacity - row.occupancy) }));
}

export async function createHostelRoom(user: CurrentUser, input: HostelRoomInput) {
  const existing = await getDb().query.hostelRooms.findFirst({ where: and(
    eq(hostelRooms.organizationId, user.organizationId),
    user.campusId ? eq(hostelRooms.campusId, user.campusId) : isNull(hostelRooms.campusId),
    eq(hostelRooms.building, input.building),
    eq(hostelRooms.roomNumber, input.roomNumber),
  ) });
  if (existing) throw new AppError("CONFLICT", "That room already exists in this campus.", 409);
  const [row] = await getDb().insert(hostelRooms).values({
    id: createId("hostel_room"),
    organizationId: user.organizationId,
    campusId: user.campusId,
    building: input.building,
    floor: input.floor || null,
    roomNumber: input.roomNumber,
    capacity: input.capacity,
    status: "active",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create hostel room.", 500);
  return row;
}

export async function listHostelBeds(user: CurrentUser) {
  const rows = await getDb().select({
    id: hostelBeds.id,
    code: hostelBeds.code,
    name: hostelBeds.name,
    roomId: hostelRooms.id,
    building: hostelRooms.building,
    roomNumber: hostelRooms.roomNumber,
    status: hostelBeds.status,
  }).from(hostelBeds).innerJoin(hostelRooms, and(
    eq(hostelRooms.id, hostelBeds.referenceId),
    eq(hostelRooms.organizationId, user.organizationId),
  )).where(and(
    eq(hostelBeds.organizationId, user.organizationId),
    campusScope(user, hostelBeds.campusId),
    eq(hostelBeds.status, "active"),
  )).orderBy(asc(hostelRooms.building), asc(hostelRooms.roomNumber), asc(hostelBeds.code));
  return rows;
}

export async function createHostelBed(user: CurrentUser, input: HostelBedInput) {
  const room = await getRoom(user, input.roomId);
  const existing = await getDb().query.hostelBeds.findFirst({ where: and(
    eq(hostelBeds.organizationId, user.organizationId),
    eq(hostelBeds.referenceId, room.id),
    eq(hostelBeds.code, input.code),
  ) });
  if (existing) throw new AppError("CONFLICT", "That bed code already exists in this room.", 409);
  const [row] = await getDb().insert(hostelBeds).values({
    id: createId("hostel_bed"),
    organizationId: user.organizationId,
    campusId: room.campusId,
    name: `Bed ${input.code}`,
    code: input.code,
    referenceId: room.id,
    status: "active",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create hostel bed.", 500);
  return row;
}

export async function listHostelStudents(user: CurrentUser) {
  const rows = await getDb().select({ id: students.id, name: students.firstName, lastName: students.lastName }).from(students).where(and(
    eq(students.organizationId, user.organizationId),
    campusScope(user, students.campusId),
    eq(students.status, "active"),
  )).orderBy(asc(students.firstName), asc(students.lastName)).limit(500);
  return rows.map((row) => ({ id: row.id, name: `${row.name} ${row.lastName}` }));
}

export async function allocateHostelBed(user: CurrentUser, input: HostelAllotmentInput) {
  const room = await getRoom(user, input.roomId);
  const bed = await getDb().query.hostelBeds.findFirst({ where: and(
    eq(hostelBeds.id, input.bedId),
    eq(hostelBeds.organizationId, user.organizationId),
    eq(hostelBeds.referenceId, room.id),
    eq(hostelBeds.status, "active"),
  ) });
  if (!bed) throw new AppError("NOT_FOUND", "Bed not found in the selected room.", 404);
  const student = await getDb().query.students.findFirst({ where: and(
    eq(students.id, input.studentId),
    eq(students.organizationId, user.organizationId),
    room.campusId ? eq(students.campusId, room.campusId) : undefined,
    eq(students.status, "active"),
  ) });
  if (!student) throw new AppError("NOT_FOUND", "Student not found in the room campus.", 404);
  const existing = await getDb().query.hostelAllotments.findFirst({ where: and(
    eq(hostelAllotments.organizationId, user.organizationId),
    eq(hostelAllotments.studentId, student.id),
    eq(hostelAllotments.status, "active"),
  ) });
  if (existing) throw new AppError("CONFLICT", "The student already has an active hostel allotment.", 409);
  const activeCount = await getDb().select({ value: count() }).from(hostelAllotments).where(and(
    eq(hostelAllotments.organizationId, user.organizationId),
    eq(hostelAllotments.roomId, room.id),
    eq(hostelAllotments.status, "active"),
  ));
  if ((activeCount[0]?.value ?? 0) >= room.capacity) throw new AppError("CONFLICT", "The room has reached its bed capacity.", 409);
  const [row] = await getDb().insert(hostelAllotments).values({
    id: createId("hostel_allotment"),
    organizationId: user.organizationId,
    campusId: room.campusId,
    roomId: room.id,
    bedId: bed.id,
    studentId: student.id,
    allottedOn: new Date(),
    status: "active",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to allot hostel bed.", 500);
  return row;
}

export async function listHostelAllotments(user: CurrentUser) {
  return getDb().select({
    id: hostelAllotments.id,
    studentName: students.firstName,
    studentLastName: students.lastName,
    building: hostelRooms.building,
    roomNumber: hostelRooms.roomNumber,
    bedCode: hostelBeds.code,
    allottedOn: hostelAllotments.allottedOn,
    checkedOutOn: hostelAllotments.checkedOutOn,
    status: hostelAllotments.status,
  }).from(hostelAllotments)
    .innerJoin(students, and(eq(students.id, hostelAllotments.studentId), eq(students.organizationId, user.organizationId)))
    .innerJoin(hostelRooms, and(eq(hostelRooms.id, hostelAllotments.roomId), eq(hostelRooms.organizationId, user.organizationId)))
    .leftJoin(hostelBeds, and(eq(hostelBeds.id, hostelAllotments.bedId), eq(hostelBeds.organizationId, user.organizationId)))
    .where(and(eq(hostelAllotments.organizationId, user.organizationId), campusScope(user, hostelAllotments.campusId)))
    .orderBy(desc(hostelAllotments.allottedOn)).limit(500);
}

export async function checkoutHostelAllotment(user: CurrentUser, allotmentId: string) {
  const [row] = await getDb().update(hostelAllotments).set({
    status: "completed",
    checkedOutOn: new Date(),
    updatedAt: new Date(),
    updatedBy: user.id,
  }).where(and(
    eq(hostelAllotments.id, allotmentId),
    eq(hostelAllotments.organizationId, user.organizationId),
    campusScope(user, hostelAllotments.campusId),
    eq(hostelAllotments.status, "active"),
  )).returning();
  if (!row) throw new AppError("NOT_FOUND", "Active hostel allotment not found.", 404);
  return row;
}
