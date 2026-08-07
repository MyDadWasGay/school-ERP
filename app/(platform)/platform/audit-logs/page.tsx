import Link from "next/link";
import { DataTable } from "@/components/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPlatformAuditLogs } from "@/features/platform/services/platform.service";

export default async function PlatformAuditLogsPage() {
  const rows = await listPlatformAuditLogs();
  return <div className="space-y-6"><div><Link href="/platform" className="text-sm text-cyan-300 hover:underline">Back to platform overview</Link><h1 className="mt-3 text-3xl font-semibold tracking-tight">Platform audit log</h1><p className="mt-2 text-sm text-slate-400">Immutable platform-level actions are displayed without exposing before/after secrets.</p></div><Card className="border-slate-800 bg-slate-900 text-slate-100"><CardHeader><CardTitle>Recent events</CardTitle></CardHeader><CardContent><DataTable rows={rows} columns={[{ key: "createdAt", header: "Time", cell: (row) => row.createdAt }, { key: "action", header: "Action", cell: (row) => row.action }, { key: "module", header: "Module", cell: (row) => row.module }, { key: "entityType", header: "Entity", cell: (row) => `${row.entityType}${row.entityId ? ` · ${row.entityId}` : ""}` }, { key: "actorRole", header: "Actor", cell: (row) => row.actorRole }]} emptyTitle="No platform audit events found" /></CardContent></Card></div>;
}
