import { describe, expect, it } from "vitest";
import { applicationReviewSchema } from "../schemas/admissions.schema";

describe("admission application decisions", () => {
  it("requires a reason when rejecting an application", () => {
    expect(applicationReviewSchema.safeParse({
      applicationId: "application-1",
      decision: "rejected",
    }).success).toBe(false);
    expect(applicationReviewSchema.safeParse({
      applicationId: "application-1",
      decision: "rejected",
      reason: "Required documents were not verified.",
    }).success).toBe(true);
  });
});
