import { describe, expect, it } from "vitest";
import { donationSchema } from "../schemas/accounting.schema";

describe("donation schema", () => {
  it("accepts bounded minor-unit donations", () => {
    expect(donationSchema.safeParse({ donorName: "Aarav Foundation", amountMinor: "250000", purpose: "Library books", receivedAt: "2026-08-09" }).success).toBe(true);
  });

  it("rejects zero or negative donations", () => {
    expect(donationSchema.safeParse({ donorName: "Aarav Foundation", amountMinor: 0, purpose: "Library books", receivedAt: "2026-08-09" }).success).toBe(false);
  });
});
