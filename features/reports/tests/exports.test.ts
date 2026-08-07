import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/exports/csv";
describe("exports", () => {
  it("serializes tabular data with escaped values", () => expect(toCsv([{ name: "Aarav", note: "Needs, follow-up" }])).toBe('"name","note"\n"Aarav","Needs, follow-up"'));
  it("neutralizes spreadsheet formulas", () => expect(toCsv([{ value: "=HYPERLINK(\"bad\")" }])).toContain(`"'=HYPERLINK(""bad"")"`));
});
