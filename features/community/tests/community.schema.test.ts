import { describe, expect, it } from "vitest";
import {
  alumniDonationSchema,
  cmsFieldsSchema,
  cmsMediaSchema,
} from "../schemas/community.schema";

describe("community and CMS contracts", () => {
  it("requires CMS media to carry Cloudinary identity metadata", () => {
    expect(
      cmsMediaSchema.safeParse({
        name: "Logo",
        mediaType: "image",
        secureUrl: "https://example.com/logo.png",
        publicId: "",
      }).success,
    ).toBe(false);
    expect(
      cmsMediaSchema.safeParse({
        name: "Logo",
        mediaType: "image",
        secureUrl:
          "https://res.cloudinary.com/demo/image/authenticated/v1/school-erp/org/cms_media/logo.png",
        publicId: "school-erp/org/cms_media/logo",
      }).success,
    ).toBe(true);
  });

  it("accepts bounded public form definitions and rejects invalid field names", () => {
    expect(
      cmsFieldsSchema.safeParse([
        { name: "email", type: "email", required: true },
      ]).success,
    ).toBe(true);
    expect(
      cmsFieldsSchema.safeParse([{ name: "bad field", type: "text" }]).success,
    ).toBe(false);
  });

  it("keeps donations positive and bounded", () => {
    expect(
      alumniDonationSchema.safeParse({
        donorName: "Donor",
        amountMinor: 1000,
        purpose: "Library",
      }).success,
    ).toBe(true);
    expect(
      alumniDonationSchema.safeParse({
        donorName: "Donor",
        amountMinor: 0,
        purpose: "Library",
      }).success,
    ).toBe(false);
  });
});
