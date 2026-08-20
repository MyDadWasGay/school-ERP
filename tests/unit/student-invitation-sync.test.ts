import { createClient, type Client } from "@libsql/client";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as schema from "@/db/schema";
import {
  getMyStudentProfile,
  getReadableStudent,
  getStudentProfile,
  inviteStudentPortalUser,
  resolvePermittedStudentIds,
  updateStudentRecord,
} from "@/features/students/services/students.service";
import { provisionUser } from "@/features/users/services/provision.service";
import { acceptInvitation } from "@/features/users/services/invitation.service";
import type { CurrentUser } from "@/lib/auth/types";
import { AppError } from "@/lib/errors/app-error";

let client: Client;
let db: ReturnType<typeof drizzle<typeof schema>>;
let tempDirectory: string;

vi.mock("@/db/client", () => ({
  getDb: () => db,
}));

vi.mock("@/lib/auth/firebase-admin-core", () => ({
  getFirebaseAdminAuth: vi.fn(() => ({
    createUser: vi.fn(async ({ email, displayName }: any) => ({ uid: `fb-${email}`, email, displayName })),
    updateUser: vi.fn(async () => ({})),
    deleteUser: vi.fn(async () => ({})),
    generateEmailVerificationLink: vi.fn(async (email: string) => `https://auth.example.com/verify?email=${email}`),
  })),
}));

describe("Student Invitation & Profile Data Synchronization", () => {
  const adminActor: CurrentUser = {
    id: "admin-1",
    firebaseUid: "fb-admin",
    email: "admin@thinkschool.in",
    displayName: "School Administrator",
    role: "super_admin",
    organizationId: "org-thinkschool",
    campusId: "campus-main",
    campusIds: ["campus-main"],
    permissions: ["*"],
  };

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.thinkschool.in";
    tempDirectory = mkdtempSync(path.join(tmpdir(), "school-erp-sync-"));
    const databasePath = path.join(tempDirectory, "sync.db");
    client = createClient({ url: `file:${databasePath}` });
    db = drizzle(client, { schema });
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
  });

  afterAll(() => {
    try {
      client.close();
      rmSync(tempDirectory, { recursive: true, force: true });
    } catch {
      // Best effort cleanup
    }
  });

  beforeEach(async () => {
    // Reset data
    const now = Date.now();
    await client.batch([
      { sql: "DELETE FROM invitation_tokens", args: [] },
      { sql: "DELETE FROM user_campus_scopes", args: [] },
      { sql: "DELETE FROM users", args: [] },
      { sql: "DELETE FROM enrollments", args: [] },
      { sql: "DELETE FROM student_guardian_links", args: [] },
      { sql: "DELETE FROM guardians", args: [] },
      { sql: "DELETE FROM students", args: [] },
      { sql: "DELETE FROM sections", args: [] },
      { sql: "DELETE FROM classes", args: [] },
      { sql: "DELETE FROM academic_years", args: [] },
      { sql: "DELETE FROM campuses", args: [] },
      { sql: "DELETE FROM organizations", args: [] },
      {
        sql: "INSERT INTO organizations (id, name, slug, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?)",
        args: ["org-thinkschool", "Think School", "think-school", now, now, "active"],
      },
      {
        sql: "INSERT INTO campuses (id, organization_id, name, code, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: ["campus-main", "org-thinkschool", "Main Campus", "MAIN", now, now, "active"],
      },
      {
        sql: "INSERT INTO academic_years (id, organization_id, name, starts_on, ends_on, is_active, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: ["ay-2026", "org-thinkschool", "2026-2027", now, now + 31536000000, 1, now, now, "active"],
      },
      {
        sql: "INSERT INTO classes (id, organization_id, name, code, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: ["class-10", "org-thinkschool", "Class 10", "10", now, now, "active"],
      },
      {
        sql: "INSERT INTO sections (id, organization_id, class_id, name, capacity, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: ["section-a", "org-thinkschool", "class-10", "Section A", 40, now, now, "active"],
      },
      {
        sql: "INSERT INTO students (id, organization_id, campus_id, admission_number, first_name, last_name, gender, date_of_birth, email, phone, blood_group, joined_on, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          "student-sam-123",
          "org-thinkschool",
          "campus-main",
          "ADM-2026-001",
          "Sam",
          "Altman",
          "male",
          new Date("2010-05-15").getTime(),
          "sam@thinkschool.in",
          "9876543210",
          "O+",
          new Date("2026-01-10").getTime(),
          now,
          now,
          "active",
        ],
      },
      {
        sql: "INSERT INTO guardians (id, organization_id, first_name, last_name, email, email_normalized, phone, phone_normalized, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          "guardian-1",
          "org-thinkschool",
          "John",
          "Altman",
          "john@thinkschool.in",
          "john@thinkschool.in",
          "9876543211",
          "9876543211",
          now,
          now,
          "active",
        ],
      },
      {
        sql: "INSERT INTO student_guardian_links (id, organization_id, student_id, guardian_id, relationship, is_primary, is_emergency_contact, is_billing_contact, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: ["link-1", "org-thinkschool", "student-sam-123", "guardian-1", "father", 1, 1, 1, now, now],
      },
      {
        sql: "INSERT INTO enrollments (id, organization_id, campus_id, student_id, academic_year_id, class_id, section_id, roll_number, starts_on, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          "enrollment-1",
          "org-thinkschool",
          "campus-main",
          "student-sam-123",
          "ay-2026",
          "class-10",
          "section-a",
          "12",
          now,
          now,
          now,
          "active",
        ],
      },
    ]);
  });

  it("Test 1: Admin Create -> Invite -> Accept -> Dashboard Data Sync Flow", async () => {
    // 1. Admin invites the student
    const invite = await inviteStudentPortalUser(adminActor, "student-sam-123");
    expect(invite.email).toBe("sam@thinkschool.in");
    expect(invite.inviteLink).toContain("https://");

    // Extract raw token from invite link: https://.../invite/accept?token=RAW_TOKEN
    const rawToken = new URL(invite.inviteLink).searchParams.get("token")!;
    expect(rawToken).toBeDefined();

    // 2. Student accepts the invitation
    const acceptResult = await acceptInvitation({
      token: rawToken,
      password: "SecurePassword123",
    });
    expect(acceptResult.email).toBe("sam@thinkschool.in");

    // 3. Verify user account in DB
    const userRow = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "sam@thinkschool.in"),
    });
    expect(userRow).toBeDefined();
    expect(userRow?.status).toBe("active");
    expect(userRow?.linkedStudentId).toBe("student-sam-123");

    // 4. Student logs in and fetches self profile
    const studentUser: CurrentUser = {
      id: userRow!.id,
      firebaseUid: userRow!.firebaseUid,
      email: userRow!.email,
      displayName: userRow!.displayName,
      role: "student",
      organizationId: userRow!.organizationId,
      campusId: userRow!.campusId,
      campusIds: [userRow!.campusId!],
      linkedStudentId: userRow!.linkedStudentId,
      permissions: ["students:read", "portals:read"],
    };

    const profile = await getMyStudentProfile(studentUser);
    expect(profile.student.id).toBe("student-sam-123");
    expect(profile.student.admissionNumber).toBe("ADM-2026-001");
    expect(profile.student.firstName).toBe("Sam");
    expect(profile.student.lastName).toBe("Altman");
    expect(profile.student.bloodGroup).toBe("O+");
    expect(profile.student.email).toBe("sam@thinkschool.in");
    expect(profile.campusName).toBe("Main Campus");
    expect(profile.enrollments).toHaveLength(1);
    expect(profile.enrollments[0].className).toBe("Class 10");
    expect(profile.enrollments[0].sectionName).toBe("Section A");
    expect(profile.enrollments[0].rollNumber).toBe("12");
    expect(profile.guardians).toHaveLength(1);
    expect(profile.guardians[0].firstName).toBe("John");
    expect(profile.guardians[0].relationship).toBe("father");
  });

  it("Test 2: Zero Student Duplication - Student table count remains 1", async () => {
    const studentsBefore = await db.query.students.findMany();
    expect(studentsBefore).toHaveLength(1);

    const invite = await inviteStudentPortalUser(adminActor, "student-sam-123");
    const rawToken = new URL(invite.inviteLink).searchParams.get("token")!;
    await acceptInvitation({ token: rawToken, password: "SecurePassword123" });

    const studentsAfter = await db.query.students.findMany();
    expect(studentsAfter).toHaveLength(1);
    expect(studentsAfter[0].id).toBe("student-sam-123");
  });

  it("Test 3: Canonical Link Check - user.linkedStudentId matches student.id", async () => {
    const invite = await inviteStudentPortalUser(adminActor, "student-sam-123");
    const rawToken = new URL(invite.inviteLink).searchParams.get("token")!;
    await acceptInvitation({ token: rawToken, password: "SecurePassword123" });

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "sam@thinkschool.in"),
    });
    expect(user?.linkedStudentId).toBe("student-sam-123");
  });

  it("Test 4: Auto-link during General User Provisioning without explicit linkedStudentId", async () => {
    const result = await provisionUser(adminActor, {
      email: "sam@thinkschool.in",
      displayName: "Sam Altman",
      role: "student",
      campusId: "campus-main",
    });
    expect(result.userId).toBeDefined();

    const createdUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, result.userId),
    });
    expect(createdUser?.linkedStudentId).toBe("student-sam-123");
  });

  it("Test 5: Conflicting Link Protection - Prevents hijacking when user is already bound to another student", async () => {
    // Provision student user for student-sam-123
    await provisionUser(adminActor, {
      email: "sam@thinkschool.in",
      displayName: "Sam Altman",
      role: "student",
      campusId: "campus-main",
      linkedStudentId: "student-sam-123",
    });

    // Attempting to provision same email with a DIFFERENT student ID throws CONFLICT
    await expect(
      provisionUser(adminActor, {
        email: "sam@thinkschool.in",
        displayName: "Sam Altman",
        role: "student",
        campusId: "campus-main",
        linkedStudentId: "student-OTHER-999",
      }),
    ).rejects.toThrow(/already linked to a different student/);
  });

  it("Test 6: Multi-Tenant Isolation - Student in Org 1 cannot match User in Org 2", async () => {
    const foreignActor: CurrentUser = {
      id: "admin-foreign",
      firebaseUid: "fb-foreign",
      email: "admin@otherschool.in",
      displayName: "Other Admin",
      role: "super_admin",
      organizationId: "org-OTHER",
      campusId: "campus-foreign",
      campusIds: ["campus-foreign"],
      permissions: ["*"],
    };

    await expect(
      getReadableStudent(foreignActor, "student-sam-123"),
    ).rejects.toThrow();
  });

  it("Test 7: Case-Insensitive Email Matching handles mixed casing", async () => {
    // Update student email to mixed case
    await db
      .update(schema.students)
      .set({ email: "Sam.Altman@ThinkSchool.IN" })
      .where(eq(schema.students.id, "student-sam-123"));

    const result = await provisionUser(adminActor, {
      email: "sam.altman@thinkschool.in",
      displayName: "Sam Altman",
      role: "student",
      campusId: "campus-main",
    });
    expect(result.userId).toBeDefined();

    const createdUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, result.userId),
    });
    expect(createdUser?.linkedStudentId).toBe("student-sam-123");
  });

  it("Test 8: Missing Student Relationship returns controlled STUDENT_NOT_LINKED error", async () => {
    const unlinkedStudentUser: CurrentUser = {
      id: "user-unlinked",
      firebaseUid: "fb-unlinked",
      email: "unlinked@thinkschool.in",
      displayName: "Unlinked Student",
      role: "student",
      organizationId: "org-thinkschool",
      campusId: "campus-main",
      campusIds: ["campus-main"],
      permissions: ["students:read"],
    };

    await expect(getMyStudentProfile(unlinkedStudentUser)).rejects.toThrow(
      /Your account is active, but your student profile has not been linked yet/,
    );
  });

  it("Test 9: Cross-Student Authorization - Student A cannot fetch Student B profile", async () => {
    const studentUserA: CurrentUser = {
      id: "user-a",
      firebaseUid: "fb-a",
      email: "a@thinkschool.in",
      displayName: "Student A",
      role: "student",
      organizationId: "org-thinkschool",
      campusId: "campus-main",
      campusIds: ["campus-main"],
      linkedStudentId: "student-sam-123",
      permissions: ["students:read"],
    };

    await expect(
      getStudentProfile(studentUserA, "student-OTHER-999"),
    ).rejects.toThrow(/Student is outside your linked or assigned scope/);
  });

  it("Test 10: Data Visibility & Redaction - Sensitive fields are not exposed in self profile", async () => {
    const studentUser: CurrentUser = {
      id: "user-sam-456",
      firebaseUid: "fb-sam",
      email: "sam@thinkschool.in",
      displayName: "Sam Altman",
      role: "student",
      organizationId: "org-thinkschool",
      campusId: "campus-main",
      campusIds: ["campus-main"],
      linkedStudentId: "student-sam-123",
      permissions: ["students:read"],
    };

    const profile = await getMyStudentProfile(studentUser);
    expect(profile.student).not.toHaveProperty("internalNotes");
    expect(profile.student).not.toHaveProperty("disciplinaryNotes");
    expect(profile.student.admissionNumber).toBe("ADM-2026-001");
    expect(profile.student.firstName).toBe("Sam");
  });

  it("Test 11: Parent Self-Healing Resolution in resolvePermittedStudentIds", async () => {
    const parentUser: CurrentUser = {
      id: "user-parent-1",
      firebaseUid: "fb-parent",
      email: "john@thinkschool.in",
      displayName: "John Altman",
      role: "parent",
      organizationId: "org-thinkschool",
      campusId: "campus-main",
      campusIds: ["campus-main"],
      permissions: ["students:read", "portals:read"],
    };

    const permitted = await resolvePermittedStudentIds(parentUser);
    expect(permitted).toContain("student-sam-123");
  });

  it("Test 12: Student Status Lifecycle Sync to User Account", async () => {
    // 1. Provision user
    const invite = await inviteStudentPortalUser(adminActor, "student-sam-123");
    const rawToken = new URL(invite.inviteLink).searchParams.get("token")!;
    await acceptInvitation({ token: rawToken, password: "SecurePassword123" });

    // 2. Admin updates student status to suspended
    await updateStudentRecord(adminActor, {
      id: "student-sam-123",
      firstName: "Sam",
      lastName: "Altman",
      status: "suspended",
    });

    // 3. User account is automatically set to inactive
    const updatedUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "sam@thinkschool.in"),
    });
    expect(updatedUser?.status).toBe("inactive");
  });
});
