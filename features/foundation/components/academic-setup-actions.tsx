"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import type { AcademicSetupKind } from "../schemas/academic-setup.schema";
import { archiveAcademicSetupAction, updateAcademicSetupAction } from "../actions/academic-setup.actions";
import type { AcademicSetupRow } from "../services/academic-setup.service";
import { indiaDateKey } from "@/lib/utils/india-time";

export function AcademicSetupActions({ kind, row }: { kind: AcademicSetupKind; row: AcademicSetupRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageRole, setMessageRole] = useState<"status" | "alert">("status");
  const [pending, setPending] = useState(false);
  async function save(formData: FormData) {
    if (pending) return;
    setPending(true);
    const common = { kind, id: row.id, name: String(formData.get("name") ?? "") };
    const input = kind === "academic_year"
      ? { ...common, startsOn: formData.get("startsOn"), endsOn: formData.get("endsOn"), isActive: formData.get("isActive") === "on" }
      : kind === "class"
        ? { ...common, code: formData.get("code"), sortOrder: formData.get("sortOrder") }
        : kind === "section"
          ? { ...common, capacity: formData.get("capacity") }
          : { ...common, code: formData.get("code"), isOptional: formData.get("isOptional") === "on" };
    try {
      const result = await updateAcademicSetupAction(input);
      setMessageRole(result.ok ? "status" : "alert");
      setMessage(result.ok ? result.message ?? "Updated." : result.error);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }
  async function archive() {
    const result = await archiveAcademicSetupAction({ kind, id: row.id });
    if (!result.ok) {
      setMessageRole("alert");
      setMessage(result.error);
      throw new Error(result.error);
    }
    setMessageRole("status");
    setMessage(result.message ?? "Archived.");
    router.refresh();
  }
  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await save(new FormData(event.currentTarget));
  }
  if (editing) return <form onSubmit={handleSave} className="min-w-72 space-y-2 rounded-md border bg-background p-3">
    <Input name="name" defaultValue={row.name} aria-label="Name" required />
    {kind === "academic_year" ? <><Input name="startsOn" type="date" defaultValue={row.startsOn ? indiaDateKey(row.startsOn) : undefined} aria-label="Starts on" required /><Input name="endsOn" type="date" defaultValue={row.endsOn ? indiaDateKey(row.endsOn) : undefined} aria-label="Ends on" required /><label className="flex items-center gap-2 text-xs"><input name="isActive" type="checkbox" defaultChecked={row.isActive} /> Active year</label></> : null}
    {kind === "class" ? <><Input name="code" defaultValue={row.code} aria-label="Code" required /><Input name="sortOrder" type="number" defaultValue={row.sortOrder ?? 0} aria-label="Sort order" required /></> : null}
    {kind === "section" ? <Input name="capacity" type="number" min="1" defaultValue={row.capacity ?? 40} aria-label="Capacity" required /> : null}
    {kind === "subject" ? <><Input name="code" defaultValue={row.code} aria-label="Code" required /><label className="flex items-center gap-2 text-xs"><input name="isOptional" type="checkbox" defaultChecked={row.isOptional} /> Optional subject</label></> : null}
    <div className="flex gap-2"><Button size="sm" disabled={pending}>{pending ? "Saving..." : "Save"}</Button><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setEditing(false)}>Cancel</Button></div>
    {message ? <p role={messageRole} className="text-xs text-muted-foreground">{message}</p> : null}
  </form>;
  return <div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)} disabled={row.status === "archived"}>Edit</Button>{row.status !== "archived" ? <ConfirmDialog label="Archive" title={`Archive ${row.name}?`} description="This setup record will stop being available for new workflows. Existing dependent records must be closed first." triggerVariant="destructive" onConfirm={archive} /> : null}{message ? <span role={messageRole} className="text-xs text-muted-foreground">{message}</span> : null}</div>;
}
