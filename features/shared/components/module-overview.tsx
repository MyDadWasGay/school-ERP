"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { ServerPagination } from "@/components/data-table/server-pagination";
import { SearchInput } from "@/components/common/search-input";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormSection } from "@/components/forms/form-section";
import { StatusBadge } from "@/components/common/status-badge";
import type { PageInfo } from "@/lib/utils/pagination";
import {
  archiveModuleRecordAction,
  createModuleRecordAction,
  updateModuleRecordAction,
} from "../actions/module.actions";

const quickRecordSchema = z.object({
  name: z.string().min(2, "Enter at least 2 characters"),
  note: z.string().max(500).optional(),
});
export type OverviewRow = { id: string; name: string; detail: string; status: string };

export function ModuleOverview({
  title,
  description,
  rows,
  route = "/settings",
  entityLabel = "record",
  metrics = [],
  pageInfo,
  search = "",
  canCreate = false,
  canUpdate = false,
  canDelete = false,
}: {
  title: string;
  description: string;
  rows: OverviewRow[];
  route?: string;
  entityLabel?: string;
  metrics?: string[];
  pageInfo?: PageInfo;
  search?: string;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [records, setRecords] = useState(rows);
  const [query, setQuery] = useState(search);
  const [editingId, setEditingId] = useState<string>();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("draft");
  const [error, setError] = useState("");

  function beginCreate() {
    setEditingId(undefined);
    setName("");
    setNote("");
    setStatus("draft");
    setError("");
    setShowForm(true);
  }
  function beginEdit(row: OverviewRow) {
    setEditingId(row.id);
    setName(row.name);
    setNote(row.detail);
    setStatus(["draft", "active", "pending", "completed"].includes(row.status.toLowerCase()) ? row.status.toLowerCase() : "draft");
    setError("");
    setShowForm(true);
  }
  async function saveRecord() {
    const parsed = quickRecordSchema.safeParse({ name, note });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    const result = editingId
      ? await updateModuleRecordAction({ id: editingId, route, entityType: entityLabel, name: parsed.data.name, note: parsed.data.note, status })
      : await createModuleRecordAction({ route, entityType: entityLabel, name: parsed.data.name, note: parsed.data.note });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (editingId) {
      setRecords((current) => current.map((row) => row.id === editingId ? { ...row, name: parsed.data.name, detail: parsed.data.note || "No notes", status } : row));
    } else {
      setRecords((current) => [{ id: result.data.id, name: parsed.data.name, detail: parsed.data.note || "No notes", status: "draft" }, ...current]);
    }
    setShowForm(false);
    router.refresh();
  }
  async function archiveRecord(row: OverviewRow) {
    const result = await archiveModuleRecordAction({ id: row.id, route, entityType: entityLabel });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRecords((current) => current.filter(({ id }) => id !== row.id));
    router.refresh();
  }
  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    router.push(params.size ? `${route}?${params.toString()}` : route);
  }

  function clearSearch() {
    setQuery("");
    router.push(route);
  }

  return <div>
    <PageHeader title={title} description={description} />
    {metrics.length ? <div className="mb-6 grid gap-4 sm:grid-cols-3">{metrics.map((metric) =>
      <Card key={metric}><CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{metric}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{metric === "Active records" ? records.length : metric === "Pending review" ? records.filter((row) => row.status.toLowerCase() === "pending").length : "—"}</p><p className="mt-1 text-xs text-muted-foreground">Scoped to your current campus</p></CardContent></Card>,
    )}</div> : null}
    <Card>
      <CardHeader>
        <DataTableToolbar>
          <form className="flex items-center gap-2" onSubmit={submitSearch}>
            <SearchInput value={query} onChange={setQuery} placeholder={`Search ${entityLabel}s`} />
            <Button variant="outline" size="sm" type="submit">Search</Button>
            {query ? <Button variant="ghost" size="sm" type="button" onClick={clearSearch}>Clear</Button> : null}
          </form>
          {canCreate ? <Button variant="outline" size="sm" onClick={beginCreate}><Plus className="mr-2 h-4 w-4" />Add {entityLabel}</Button> : null}
        </DataTableToolbar>
        {showForm ? <FormSection title={`${editingId ? "Edit" : "Create"} ${entityLabel}`}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label htmlFor="catalog-record-name" className="text-sm font-medium">Name</label><Input id="catalog-record-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
            <div><label htmlFor="catalog-record-note" className="text-sm font-medium">Notes</label><Input id="catalog-record-note" value={note} onChange={(event) => setNote(event.target.value)} /></div>
            <div><label htmlFor="catalog-record-status" className="text-sm font-medium">Status</label><select id="catalog-record-status" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)} disabled={!editingId}><option value="draft">Draft</option><option value="active">Active</option><option value="pending">Pending</option><option value="completed">Completed</option></select></div>
          </div>
          {error ? <p role="alert" className="mt-2 text-sm text-red-600">{error}</p> : null}
          <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={saveRecord}>Save {entityLabel}</Button></div>
        </FormSection> : null}
      </CardHeader>
      <CardContent><DataTable columns={[
        { key: "name", header: "Name", cell: (row) => <span className="font-medium">{row.name}</span> },
        { key: "detail", header: "Details", cell: (row) => <span className="text-muted-foreground">{row.detail}</span> },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
        { key: "actions", header: "Actions", cell: (row) => <div className="flex gap-1">
          {canUpdate ? <Button variant="ghost" size="sm" onClick={() => beginEdit(row)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button> : null}
          {canDelete ? <ConfirmDialog label="Archive" title={`Archive ${row.name}?`} description={`Archive ${row.name}? It will leave active catalog results while its audit history is retained.`} triggerVariant="outline" triggerSize="sm" onConfirm={() => archiveRecord(row)} /> : null}
        </div> },
      ]} rows={records} ariaLabel={`${entityLabel} records`} caption={`${entityLabel} records`} filtered={Boolean(query)} emptyTitle={query ? `No ${entityLabel}s match this search` : `No ${entityLabel}s found`} emptyDescription={query ? "No authorized records matched the current search." : `Create a ${entityLabel} when one is ready for this workflow.`} />
      {pageInfo ? <ServerPagination pageInfo={pageInfo} pathname={route} search={search} /> : null}
      </CardContent>
    </Card>
  </div>;
}
