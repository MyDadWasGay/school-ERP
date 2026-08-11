/**
 * Tenant-configured payroll inputs. This is intentionally policy-neutral: it
 * does not encode statutory tax, provident-fund or leave law.
 */
export function calculatePayrollAmounts(input: {
  salaryMinor: number;
  allowanceMinor: number;
  fixedDeductionMinor: number;
  deductionRateBps: number;
}) {
  const grossMinor = Math.max(0, input.salaryMinor) + Math.max(0, input.allowanceMinor);
  const percentageDeduction = Math.floor(grossMinor * Math.min(10_000, Math.max(0, input.deductionRateBps)) / 10_000);
  const requestedDeductions = Math.max(0, input.fixedDeductionMinor) + percentageDeduction;
  const deductionsMinor = Math.min(grossMinor, requestedDeductions);
  return { grossMinor, deductionsMinor, netMinor: grossMinor - deductionsMinor, percentageDeduction };
}
