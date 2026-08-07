import { describe, expect, it } from "vitest";
import { attendanceSchema } from "../schemas/attendance.schema";
import { isValidAttendanceScope } from "../services/scope.service";
import type { CurrentUser } from "@/lib/auth/types";
const user: CurrentUser = { id: "u1", firebaseUid: "f1", email: "teacher@example.com", displayName: "Teacher", role: "teacher", organizationId: "org-1", campusId: "campus-1", permissions: ["attendance:mark"] };
describe("attendance marking", () => { it("validates supported states", () => expect(attendanceSchema.safeParse({ studentId: "s1", attendanceDate: "2026-07-23", state: "present" }).success).toBe(true)); it("rejects unknown state", () => expect(attendanceSchema.safeParse({ studentId: "s1", attendanceDate: "2026-07-23", state: "unknown" }).success).toBe(false)); it("keeps writes within tenant scope", () => expect(isValidAttendanceScope(user, "org-2", "campus-1")).toBe(false)); });
