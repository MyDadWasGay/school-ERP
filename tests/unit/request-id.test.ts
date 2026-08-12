import { describe, expect, it } from "vitest";
import { isSafeRequestId } from "@/config/request-id";

describe("request ID validation", () => {
  it("accepts bounded correlation IDs used by the API", () => {
    expect(isSafeRequestId("mobile-request-123")).toBe(true);
    expect(isSafeRequestId("12345678")).toBe(true);
    expect(isSafeRequestId("a".repeat(128))).toBe(true);
  });

  it("rejects malformed, short, oversized, and non-string values", () => {
    expect(isSafeRequestId("bad id with spaces")).toBe(false);
    expect(isSafeRequestId("short")).toBe(false);
    expect(isSafeRequestId("a".repeat(129))).toBe(false);
    expect(isSafeRequestId(undefined)).toBe(false);
    expect(isSafeRequestId(null)).toBe(false);
  });
});
