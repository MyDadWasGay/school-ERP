"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { archiveCampusAction, updateCampusAction } from "../actions/foundation.actions";

export function CampusActions({ row }: { row: { id: string; name: string; detail: string; status: string } }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  async function save(formData: FormData) {
    const result = await updateCampusAction({ id: row.id, name: formData.get("name"), code: formData.get("code"), address: formData.get("address") });
    setMessage(result.ok ? result.message ?? "Updated." : result.error);
    if (result.ok) setEditing(false);
  }
  async function archive() {
    if (!window.confirm("Archive this campus? Active dependencies must be closed first.")) return;
    const result = await archiveCampusAction({ id: row.id });
    setMessage(result.ok ? result.message ?? "Archived." : result.error);
  }
  if (editing) return <form action={save} className="min-w-64 space-y-2 rounded-md border bg-background p-3"><Input name="name" defaultValue={row.name} aria-label="Campus name" required /><Input name="code" defaultValue={row.detail} aria-label="Campus code" required /><Input name="address" aria-label="Campus address" placeholder="Address" /><div className="flex gap-2"><Button size="sm">Save</Button><Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div>{message ? <p role="status" className="text-xs text-muted-foreground">{message}</p> : null}</form>;
  return <div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)} disabled={row.status === "archived"}>Edit</Button>{row.status !== "archived" ? <Button type="button" size="sm" variant="destructive" onClick={archive}>Archive</Button> : null}{message ? <span role="status" className="text-xs text-muted-foreground">{message}</span> : null}</div>;
}
