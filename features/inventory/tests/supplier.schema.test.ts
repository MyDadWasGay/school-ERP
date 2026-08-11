import { describe, expect, it } from "vitest";
import { supplierSchema } from "../schemas/inventory.schema";

describe("supplier schema", () => {
  it("accepts optional contact details", () => {
    expect(supplierSchema.safeParse({ name: "Campus Books", contactEmail: "orders@example.test", phone: "9876543210" }).success).toBe(true);
  });

  it("rejects malformed contact email", () => {
    expect(supplierSchema.safeParse({ name: "Campus Books", contactEmail: "not-an-email" }).success).toBe(false);
  });
});
