import { describe, expect, it } from "vitest";
import { REPORT_TYPES, reportQuerySchema } from "../schemas/report.schema";

describe("report contracts", () => {
  it("accepts every published report type with a bounded default limit", () => {
    const parsed = reportQuerySchema.parse({ report: "finance" });
    expect(parsed).toEqual({ report: "finance", limit: 500 });
    expect(REPORT_TYPES).toContain("finance");
  });

  it("rejects unbounded report requests", () => {
    expect(reportQuerySchema.safeParse({ report: "students", limit: 2_001 }).success).toBe(false);
    expect(reportQuerySchema.safeParse({ report: "unknown" }).success).toBe(false);
  });
});
