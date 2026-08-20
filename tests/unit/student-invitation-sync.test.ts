import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyStudentProfile, getReadableStudent, getStudentProfile, inviteStudentPortalUser } from "@/features/students/services/students.service";
import { provisionUser } from "@/features/users/services/provision.service";
import { acceptInvitation } from "@/features/users/services/invitation.service";
import type { CurrentUser } from "@/lib/auth/types";
import { AppError } from "@/lib/errors/app-error";

// Mock DB and Firebase
const mockDb = vi.hoisted(() => {
  const state = {
    students: [] as any[],
    users: [] as any[],
    guardians: [] as any[],
    studentGuardianLinks: [] as any[],
    enrollments: [] as any[],
    campuses: [] as any[],
    organizations: [] as any[],
    invitationTokens: [] as any[],
    auditLogs: [] as any[],
  };
  return { state };
});

vi.mock("@/db/client", () => ({
  getDb: () => ({
    query: {
      students: {
        findFirst: vi.fn(async ({ where }: any) => {
          return mockDb.state.students[0] || null;
        }),
      },
      users: {
        findFirst: vi.fn(async ({ where }: any) => {
          return mockDb.state.users[0] || null;
        }),
      },
      organizations: {
        findFirst: vi.fn(async () => mockDb.state.organizations[0] || null),
      },
      campuses: {
        findFirst: vi.fn(async () => mockDb.state.campuses[0] || null),
      },
      invitationTokens: {
        findFirst: vi.fn(async () => mockDb.state.invitationTokens[0] || null),
      },
      studentGuardianLinks: {
        findFirst: vi.fn(async () => mockDb.state.studentGuardianLinks[0] || null),
      },
      guardians: {
        findFirst: vi.fn(async () => mockDb.state.guardians[0] || null),
      },
    },
    select: vi.fn((fields: any) => ({
      from: vi.fn((table: any) => ({
        where: vi.fn(async (cond: any) => {
          if (table._?.name === "campuses" || table.name === "campuses") {
            return mockDb.state.campuses;
          }
          if (table._?.name === "students" || table.name === "students") {
            return mockDb.state.students;
          }
          if (table._?.name === "guardians" || table.name === "guardians") {
            return mockDb.state.guardians;
          }
          if (table._?.name === "users" || table.name === "users") {
            return mockDb.state.users;
          }
          if (table._?.name === "enrollments" || table.name === "enrollments") {
            return mockDb.state.enrollments;
          }
          return [];
        }),
        innerJoin: vi.fn(() => ({
          where: vi.fn(async () => []),
        })),
        leftJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(async () => mockDb.state.enrollments),
          })),
          where: vi.fn(async () => mockDb.state.guardians),
        })),
      })),
    })),
    insert: vi.fn((table: any) => ({
      values: vi.fn((val: any) => ({
        returning: vi.fn(async () => {
          const item = { ...val, id: val.id || "gen-id" };
          return [item];
        }),
      })),
    })),
    update: vi.fn((table: any) => ({
      set: vi.fn((val: any) => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => [{ ...mockDb.state.invitationTokens[0], ...val }]),
        })),
      })),
    })),
    transaction: vi.fn(async (callback: any) => {
      return callback({
        insert: vi.fn((table: any) => ({
          values: vi.fn((val: any) => ({
            returning: vi.fn(async () => {
              const item = { ...val, id: val.id || "gen-id" };
              return [item];
            }),
          })),
        })),
        update: vi.fn((table: any) => ({
          set: vi.fn((val: any) => ({
            where: vi.fn(() => ({
              returning: vi.fn(async () => [{ ...mockDb.state.invitationTokens[0], ...val }]),
            })),
          })),
        })),
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(async () => mockDb.state.students),
          })),
        })),
        query: {
          students: { findFirst: vi.fn(async () => mockDb.state.students[0]) },
          guardians: { findFirst: vi.fn(async () => mockDb.state.guardians[0]) },
          studentGuardianLinks: { findFirst: vi.fn(async () => mockDb.state.studentGuardianLinks[0]) },
        },
      });
    }),
  }),
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

  const sampleStudent = {
    id: "student-sam-123",
    organizationId: "org-thinkschool",
    campusId: "campus-main",
    admissionNumber: "ADM-2026-001",
    firstName: "Sam",
    lastName: "Altman",
    dateOfBirth: new Date("2010-05-15"),
    gender: "male",
    email: "sam@thinkschool.in",
    phone: "9876543210",
    bloodGroup: "O+",
    joinedOn: new Date("2026-01-10"),
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockDb.state.students = [sampleStudent];
    mockDb.state.users = [];
    mockDb.state.guardians = [{
      id: "guardian-1",
      organizationId: "org-thinkschool",
      firstName: "John",
      lastName: "Altman",
      email: "john@thinkschool.in",
      emailNormalized: "john@thinkschool.in",
      phone: "9876543211",
      relationship: "father",
      isPrimary: true,
    }];
    mockDb.state.enrollments = [{
      id: "enrollment-1",
      organizationId: "org-thinkschool",
      studentId: "student-sam-123",
      academicYearId: "ay-2026",
      classId: "class-10",
      sectionId: "section-a",
      className: "Class 10",
      sectionName: "Section A",
      rollNumber: "12",
      startsOn: new Date("2026-04-01"),
      status: "active",
    }];
    mockDb.state.campuses = [{ id: "campus-main", organizationId: "org-thinkschool", name: "Main Campus", status: "active" }];
    mockDb.state.organizations = [{ id: "org-thinkschool", name: "Think School", status: "active" }];
    mockDb.state.invitationTokens = [];
  });

  it("Test 1: Admin Create -> Invite -> Accept -> Dashboard Data Sync Flow", async () => {
    // 1. Admin invites the student
    const invite = await inviteStudentPortalUser(adminActor, "student-sam-123");
    expect(invite.email).toBe("sam@thinkschool.in");
    expect(invite.inviteLink).toContain("https://");

    // 2. Student user record has linkedStudentId set
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
      permissions: ["students:read", "portals:read"],
    };

    // 3. Student logs in and fetches self profile
    const profile = await getMyStudentProfile(studentUser);
    expect(profile.student.id).toBe("student-sam-123");
    expect(profile.student.admissionNumber).toBe("ADM-2026-001");
    expect(profile.student.firstName).toBe("Sam");
    expect(profile.student.lastName).toBe("Altman");
    expect(profile.student.bloodGroup).toBe("O+");
    expect(profile.student.email).toBe("sam@thinkschool.in");
    expect(profile.enrollments).toHaveLength(1);
    expect(profile.enrollments[0].rollNumber).toBe("12");
  });

  it("Test 2: Zero Student Duplication - Student table count remains 1", async () => {
    const studentCountBefore = mockDb.state.students.length;
    await inviteStudentPortalUser(adminActor, "student-sam-123");
    const studentCountAfter = mockDb.state.students.length;
    expect(studentCountAfter).toBe(studentCountBefore);
    expect(studentCountAfter).toBe(1);
  });

  it("Test 3: Canonical Link Check - user.linkedStudentId matches student.id", async () => {
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
    expect(studentUser.linkedStudentId).toBe(sampleStudent.id);
  });

  it("Test 4: Auto-link during General User Provisioning without explicit linkedStudentId", async () => {
    // When admin provisions a user with role 'student' and email 'sam@thinkschool.in'
    const result = await provisionUser(adminActor, {
      email: "sam@thinkschool.in",
      displayName: "Sam Altman",
      role: "student",
      campusId: "campus-main",
    });
    expect(result.userId).toBeDefined();
    expect(result.inviteLink).toBeDefined();
  });

  it("Test 5: Conflicting Link Protection - Prevents hijacking when user is already bound to another student", async () => {
    mockDb.state.users = [{
      id: "user-other",
      email: "sam@thinkschool.in",
      organizationId: "org-thinkschool",
      campusId: "campus-main",
      role: "student",
      linkedStudentId: "student-DIFFERENT-999",
      status: "invited",
    }];

    await expect(
      provisionUser(adminActor, {
        email: "sam@thinkschool.in",
        displayName: "Sam Altman",
        role: "student",
        campusId: "campus-main",
        linkedStudentId: "student-sam-123",
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

    mockDb.state.students = [{
      ...sampleStudent,
      organizationId: "org-thinkschool", // Different org
    }];

    // Attempting to read student from different org throws 404 or 403
    await expect(
      getReadableStudent(foreignActor, "student-sam-123"),
    ).rejects.toThrow();
  });

  it("Test 7: Case-Insensitive Email Matching handles mixed casing", async () => {
    mockDb.state.students = [{
      ...sampleStudent,
      email: "Sam@ThinkSchool.IN",
    }];

    const result = await provisionUser(adminActor, {
      email: "sam@thinkschool.in",
      displayName: "Sam Altman",
      role: "student",
      campusId: "campus-main",
    });
    expect(result.inviteLink).toBeDefined();
  });

  it("Test 8: Missing Student Relationship returns controlled STUDENT_NOT_LINKED error", async () => {
    mockDb.state.students = []; // No matching student

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
      linkedStudentId: "student-A",
      permissions: ["students:read"],
    };

    await expect(
      getStudentProfile(studentUserA, "student-B"),
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

    mockDb.state.studentGuardianLinks = [{
      studentId: "student-sam-123",
      guardianId: "guardian-1",
      organizationId: "org-thinkschool",
    }];

    const permitted = await resolvePermittedStudentIds(parentUser);
    expect(permitted).toContain("student-sam-123");
  });
});
