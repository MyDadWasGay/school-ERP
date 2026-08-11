import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeImportForm } from "@/features/import-export/components/employee-import-form";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function EmployeeImportPage() { const user = await requirePermission("hr:read"); return <div className="space-y-6"><PageHeader title="Employee import" description="Import bounded employee and payroll-input CSV data with row-level errors and idempotency." />{hasPermission(user, "hr:import") ? <Card><CardHeader><CardTitle>Upload CSV</CardTitle></CardHeader><CardContent><EmployeeImportForm /></CardContent></Card> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Import permission is required.</p>}</div>; }
