import { describe, expect, it } from "vitest";
import { buildAuditRecord } from "@/lib/audit/audit-record";
import type { CurrentUser } from "@/lib/auth/types";

const user: CurrentUser = {
  id: "user-1", firebaseUid: "firebase-1", email: "admin@example.com",
  displayName: "Admin", role: "management", organizationId: "org-1",
  campusId: "campus-1", permissions: ["students:create"],
};

describe("audit records", () => {
  it("derives actor and tenant scope and serializes before/after values", () => {
    const record = buildAuditRecord(user, {
      action: "update", module: "students", entityType: "student", entityId: "student-1",
      before: { status: "pending" }, after: { status: "active" },
    });
    expect(record).toMatchObject({ organizationId: "org-1", actorUserId: "user-1", entityId: "student-1" });
    expect(record.afterJson).toBe('{"status":"active"}');
  });
});
