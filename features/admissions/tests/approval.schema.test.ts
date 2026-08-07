import { describe, expect, it } from "vitest";
import { admissionApprovalSchema } from "../schemas/approval.schema";

describe("admission approval", () => {
  it("requires an application id", () => expect(admissionApprovalSchema.safeParse({ applicationId: "application-1" }).success).toBe(true));
  it("rejects missing application context", () => expect(admissionApprovalSchema.safeParse({ rollNumber: "12" }).success).toBe(false));
});
