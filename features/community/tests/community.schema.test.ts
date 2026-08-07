import { describe, expect, it } from "vitest";
import { alumniDonationSchema, cmsFieldsSchema } from "../schemas/community.schema";

describe("community and CMS contracts", () => {
  it("accepts bounded public form definitions and rejects invalid field names", () => {
    expect(cmsFieldsSchema.safeParse([{ name: "email", type: "email", required: true }]).success).toBe(true);
    expect(cmsFieldsSchema.safeParse([{ name: "bad field", type: "text" }]).success).toBe(false);
  });

  it("keeps donations positive and bounded", () => {
    expect(alumniDonationSchema.safeParse({ donorName: "Donor", amountMinor: 1000, purpose: "Library" }).success).toBe(true);
    expect(alumniDonationSchema.safeParse({ donorName: "Donor", amountMinor: 0, purpose: "Library" }).success).toBe(false);
  });
});

