import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeForm } from "@/features/hr/components/hr-workspace";
import { listEmployees } from "@/features/hr/services/hr.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const query = await searchParams;
  const user = await requirePermission("hr:read");
  const employees = await listEmployees(user, query.search);
  return <div className="space-y-6">
    <PageHeader title="Employees" description="Maintain scoped employee identity, portal links and payroll inputs." />
    {hasPermission(user, "hr:create") ? <Card><CardHeader><CardTitle>Add employee</CardTitle></CardHeader><CardContent><EmployeeForm /></CardContent></Card> : null}
    <Card><CardHeader><CardTitle>Employee register</CardTitle></CardHeader><CardContent>
      {employees.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Employee</th><th className="p-3">Role</th><th className="p-3">Email</th><th className="p-3 text-right">Monthly salary</th><th className="p-3">Status</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id} className="border-b last:border-0"><td className="p-3"><p className="font-medium">{employee.firstName} {employee.lastName}</p><p className="text-xs text-muted-foreground">{employee.employeeNumber}</p></td><td className="p-3">{employee.jobTitle ?? "—"}</td><td className="p-3">{employee.email ?? "—"}</td><td className="p-3 text-right">₹{(employee.salaryMinor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td><td className="p-3">{employee.status}</td></tr>)}</tbody></table></div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No employees found in the current scope.</p>}
    </CardContent></Card>
  </div>;
}
