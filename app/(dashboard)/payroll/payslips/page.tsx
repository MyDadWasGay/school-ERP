import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPayslips } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";

export default async function PayslipsPage() {
  const user = await requirePermission("payroll:read");
  const payslips = await listPayslips(user);
  return <div className="space-y-6">
    <PageHeader title="Payslips" description="Payroll snapshots remain tied to the run and the employee scope in which they were issued." />
    <Card><CardHeader><CardTitle>Issued payslips</CardTitle></CardHeader><CardContent>
      {payslips.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Period</th><th className="p-3">Employee</th><th className="p-3 text-right">Gross</th><th className="p-3 text-right">Deductions</th><th className="p-3 text-right">Net</th></tr></thead><tbody>{payslips.map((payslip) => <tr key={payslip.id} className="border-b last:border-0"><td className="p-3">{payslip.period}</td><td className="p-3"><p className="font-medium">{payslip.employeeName}</p><p className="text-xs text-muted-foreground">{payslip.employeeNumber}</p></td><td className="p-3 text-right">{payslip.gross}</td><td className="p-3 text-right">{payslip.deductions}</td><td className="p-3 text-right font-medium">{payslip.net}</td></tr>)}</tbody></table></div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No payslips have been issued.</p>}
    </CardContent></Card>
  </div>;
}
