import { describe, expect, it } from "vitest";
import { allowedFormatsFor, isAllowedUpload } from "@/lib/cloudinary/policy";

describe("Cloudinary upload policy", () => {
  it("allows bounded school documents", () => {
    expect(isAllowedUpload({ resourceType: "raw", format: "pdf", bytes: 2_000_000 })).toBe(true);
    expect(allowedFormatsFor("image")).toContain("webp");
  });
  it("rejects executable formats and oversized uploads", () => {
    expect(isAllowedUpload({ resourceType: "raw", format: "exe", bytes: 1000 })).toBe(false);
    expect(isAllowedUpload({ resourceType: "image", format: "png", bytes: 6_000_000 })).toBe(false);
  });
});
