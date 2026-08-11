import { describe, expect, it } from "vitest";
import { calculatePayrollAmounts } from "@/features/hr/services/payroll-calculation";

describe("configured payroll inputs", () => {
  it("adds allowances and applies fixed plus percentage deductions", () => {
    expect(calculatePayrollAmounts({ salaryMinor: 100_000, allowanceMinor: 20_000, fixedDeductionMinor: 5_000, deductionRateBps: 1_000 })).toEqual({
      grossMinor: 120_000,
      deductionsMinor: 17_000,
      netMinor: 103_000,
      percentageDeduction: 12_000,
    });
  });

  it("caps deductions at gross pay", () => {
    expect(calculatePayrollAmounts({ salaryMinor: 10_000, allowanceMinor: 0, fixedDeductionMinor: 20_000, deductionRateBps: 10_000 })).toEqual({
      grossMinor: 10_000,
      deductionsMinor: 10_000,
      netMinor: 0,
      percentageDeduction: 10_000,
    });
  });
});
