"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { provisionRoles } from "../schemas/provision.schema";

export function InviteUserForm({ campuses }: { campuses: Array<{ id: string; name: string }> }) {
  const [form, setForm] = useState({ email: "", displayName: "", role: "teacher", campusId: campuses[0]?.id ?? "" });
  const [message, setMessage] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [pending, setPending] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setInviteLink("");
    try {
      const response = await fetch("/api/users/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json() as { error?: string; inviteLink?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to invite user.");
      setMessage("Invitation created. Send this one-time activation link to the person.");
      setInviteLink(payload.inviteLink ?? "");
      setForm((current) => ({ ...current, email: "", displayName: "" }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to invite user.");
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    if (inviteLink) await navigator.clipboard.writeText(inviteLink);
    setMessage("Activation link copied to clipboard.");
  }

  return <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5">
    <div><h2 className="font-semibold">Invite a school user</h2><p className="text-sm text-muted-foreground">The server creates the Firebase identity, role and a one-time 48-hour activation token together.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="invite-name">Full name</Label><Input id="invite-name" required value={form.displayName} onChange={(event) => update("displayName", event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="invite-email">Email</Label><Input id="invite-email" type="email" required value={form.email} onChange={(event) => update("email", event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="invite-role">Role</Label><select id="invite-role" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.role} onChange={(event) => update("role", event.target.value)}>{provisionRoles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="invite-campus">Campus</Label><select id="invite-campus" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required value={form.campusId} onChange={(event) => update("campusId", event.target.value)}>{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></div>
    </div>
    {message ? <p role="status" className="rounded-md bg-muted p-3 text-sm">{message}</p> : null}
    {inviteLink ? <div className="flex gap-2"><Input readOnly value={inviteLink} aria-label="Account activation link" /><Button type="button" variant="outline" onClick={copyLink}>Copy link</Button></div> : null}
    <Button type="submit" disabled={pending || campuses.length === 0}>{pending ? "Creating invite..." : "Create invite"}</Button>
  </form>;
}
