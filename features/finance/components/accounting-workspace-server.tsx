import { PageHeader } from "@/components/common/page-header";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";
import { listChartOfAccounts, listExpenses, listLedgerEntries } from "../services/accounting.service";
import { AccountingWorkspace } from "./accounting-workspace";

export async function AccountingWorkspacePage({ kind, title, description }: { kind: "chart" | "expenses" | "ledger" | "reports"; title: string; description: string }) {
  const user = await requirePermission("accounts:read");
  const [accounts, expenses, ledger] = await Promise.all([
    kind === "chart" || kind === "expenses" ? listChartOfAccounts(user) : Promise.resolve([]),
    kind === "expenses" ? listExpenses(user) : Promise.resolve([]),
    kind === "ledger" || kind === "reports" ? listLedgerEntries(user) : Promise.resolve([]),
  ]);
  return <div className="space-y-6"><PageHeader title={title} description={description} /><AccountingWorkspace kind={kind} accounts={accounts} expenses={expenses} ledger={ledger} canCreate={hasPermission(user, "accounts:create")} /></div>;
}
