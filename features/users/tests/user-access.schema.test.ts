import { describe, expect, it } from "vitest";
import {
  delegationCreateSchema,
  userAccessUpdateSchema,
} from "../schemas/user-access.schema";

describe("user access validation", () => {
  it("requires the primary campus to remain in the assigned campus scope", () => {
    const result = userAccessUpdateSchema.safeParse({
      id: "user-1",
      displayName: "Maya Teacher",
      role: "teacher",
      status: "active",
      primaryCampusId: "campus-b",
      campusIds: ["campus-a"],
      classSectionScopes: [],
    });
    expect(result.success).toBe(false);
  });

  it("requires a bounded delegation and a known permission", () => {
    const result = delegationCreateSchema.safeParse({
      userId: "user-1",
      permissionKey: "students:view_the_moon",
      startsAt: "2026-07-25T10:00:00.000Z",
      endsAt: "2026-07-25T09:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});
