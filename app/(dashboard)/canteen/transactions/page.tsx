import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CanteenTransactionForm } from "@/features/canteen/components/canteen-workspace";
import { listCanteenStudents, listCanteenTransactions, listMenus } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function CanteenTransactionsPage() {
  const user = await requirePermission("canteen:read");
  const [menus, students, transactions] = await Promise.all([listMenus(user), listCanteenStudents(user), listCanteenTransactions(user)]);
  return <div className="space-y-6"><PageHeader title="Canteen transactions" description="Post student meal transactions against active menu items with tenant and campus reference checks." />{hasPermission(user, "canteen:update") ? <Card><CardHeader><CardTitle>Record transaction</CardTitle></CardHeader><CardContent><CanteenTransactionForm menus={menus} students={students} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Recent transactions</CardTitle></CardHeader><CardContent>{transactions.length ? <div className="space-y-2">{transactions.map((transaction) => <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><span className="font-medium">{transaction.name}</span><span className="text-sm text-muted-foreground">{transaction.createdAt.toLocaleString()}</span><span className="text-sm capitalize">{transaction.status}</span></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No canteen transactions found.</p>}</CardContent></Card></div>;
}
