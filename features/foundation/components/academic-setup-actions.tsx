"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import type { AcademicSetupKind } from "../schemas/academic-setup.schema";
import { archiveAcademicSetupAction, updateAcademicSetupAction } from "../actions/academic-setup.actions";
import type { AcademicSetupRow } from "../services/academic-setup.service";

export function AcademicSetupActions({ kind, row }: { kind: AcademicSetupKind; row: AcademicSetupRow }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  async function save(formData: FormData) {
    const common = { kind, id: row.id, name: String(formData.get("name") ?? "") };
    const input = kind === "academic_year"
      ? { ...common, startsOn: formData.get("startsOn"), endsOn: formData.get("endsOn"), isActive: formData.get("isActive") === "on" }
      : kind === "class"
        ? { ...common, code: formData.get("code"), sortOrder: formData.get("sortOrder") }
        : kind === "section"
          ? { ...common, capacity: formData.get("capacity") }
          : { ...common, code: formData.get("code"), isOptional: formData.get("isOptional") === "on" };
    const result = await updateAcademicSetupAction(input);
    setMessage(result.ok ? result.message ?? "Updated." : result.error);
    if (result.ok) setEditing(false);
  }
  async function archive() {
    const result = await archiveAcademicSetupAction({ kind, id: row.id });
    if (!result.ok) {
      setMessage(result.error);
      throw new Error(result.error);
    }
    setMessage(result.message ?? "Archived.");
  }
  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await save(new FormData(event.currentTarget));
  }
  if (editing) return <form onSubmit={handleSave} className="min-w-72 space-y-2 rounded-md border bg-background p-3">
    <Input name="name" defaultValue={row.name} aria-label="Name" required />
    {kind === "academic_year" ? <><Input name="startsOn" type="date" defaultValue={row.startsOn?.toISOString().slice(0, 10)} aria-label="Starts on" required /><Input name="endsOn" type="date" defaultValue={row.endsOn?.toISOString().slice(0, 10)} aria-label="Ends on" required /><label className="flex items-center gap-2 text-xs"><input name="isActive" type="checkbox" defaultChecked={row.isActive} /> Active year</label></> : null}
    {kind === "class" ? <><Input name="code" defaultValue={row.code} aria-label="Code" required /><Input name="sortOrder" type="number" defaultValue={row.sortOrder ?? 0} aria-label="Sort order" required /></> : null}
    {kind === "section" ? <Input name="capacity" type="number" min="1" defaultValue={row.capacity ?? 40} aria-label="Capacity" required /> : null}
    {kind === "subject" ? <><Input name="code" defaultValue={row.code} aria-label="Code" required /><label className="flex items-center gap-2 text-xs"><input name="isOptional" type="checkbox" defaultChecked={row.isOptional} /> Optional subject</label></> : null}
    <div className="flex gap-2"><Button size="sm">Save</Button><Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div>
    {message ? <p role="status" className="text-xs text-muted-foreground">{message}</p> : null}
  </form>;
  return <div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)} disabled={row.status === "archived"}>Edit</Button>{row.status !== "archived" ? <ConfirmDialog label="Archive" title={`Archive ${row.name}?`} description="This setup record will stop being available for new workflows. Existing dependent records must be closed first." triggerVariant="destructive" onConfirm={archive} /> : null}{message ? <span role="status" className="text-xs text-muted-foreground">{message}</span> : null}</div>;
}
