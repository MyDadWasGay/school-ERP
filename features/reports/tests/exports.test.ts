import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/exports/csv";
import { renderPdf } from "@/lib/exports/pdf";
describe("exports", () => {
  it("serializes tabular data with escaped values", () => expect(toCsv([{ name: "Aarav", note: "Needs, follow-up" }])).toBe('"name","note"\n"Aarav","Needs, follow-up"'));
  it("neutralizes spreadsheet formulas", () => expect(toCsv([{ value: "=HYPERLINK(\"bad\")" }])).toContain(`"'=HYPERLINK(""bad"")"`));
  it("renders a binary PDF document for report downloads", () => {
    const pdf = renderPdf("Report", [{ Name: "Aarav", Status: "active" }]);
    expect(new TextDecoder().decode(pdf.slice(0, 8))).toBe("%PDF-1.4");
    expect(pdf.length).toBeGreaterThan(200);
  });
});
