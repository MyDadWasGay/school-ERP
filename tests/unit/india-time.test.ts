import { describe, expect, it } from "vitest";
import { indiaDateKey, indiaDayRange, parseIndiaDateInput, parseIndiaDateTimeInput } from "@/lib/utils/india-time";

describe("Indian school timezone", () => {
  it("uses the Indian calendar date at the UTC boundary", () => {
    expect(indiaDateKey(new Date("2026-08-13T18:29:59.999Z"))).toBe("2026-08-13");
    expect(indiaDateKey(new Date("2026-08-13T18:30:00.000Z"))).toBe("2026-08-14");
  });

  it("parses date and datetime-local inputs as Asia/Kolkata", () => {
    expect(parseIndiaDateInput("2026-08-14").toISOString()).toBe("2026-08-13T18:30:00.000Z");
    expect(parseIndiaDateTimeInput("2026-08-14T09:15").toISOString()).toBe("2026-08-14T03:45:00.000Z");
  });

  it("returns a half-open Indian calendar day range", () => {
    const range = indiaDayRange("2026-08-14");
    expect(range.end.getTime() - range.start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("rejects impossible date and time fields instead of normalizing them", () => {
    expect(() => parseIndiaDateInput("2026-02-30")).toThrow("Invalid Indian date input.");
    expect(() => parseIndiaDateTimeInput("2026-02-30T09:15")).toThrow("Invalid Indian date-time input.");
    expect(() => parseIndiaDateTimeInput("2026-08-14T24:00")).toThrow("Invalid Indian date-time input.");
    expect(() => parseIndiaDateTimeInput("2026-08-14T09:60")).toThrow("Invalid Indian date-time input.");
  });
});
