"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCampusAction, createOrganizationAction } from "../actions/foundation.actions";

export function FoundationCreateForm({ kind }: { kind: "organization" | "campus" }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(formData: FormData) {
    const input = Object.fromEntries(formData);
    const result = kind === "organization" ? await createOrganizationAction(input) : await createCampusAction(input);
    setMessage(result.ok ? result.message ?? "Saved" : result.error);
    if (result.ok) setOpen(false);
  }
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(new FormData(event.currentTarget));
  }
  if (!open) return <Button className="mb-6" onClick={() => setOpen(true)}>New {kind}</Button>;
  return <form onSubmit={handleSubmit} className="mb-6 grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
    <div className="space-y-2"><Label htmlFor={`${kind}-name`}>Name</Label><Input id={`${kind}-name`} name="name" required /></div>
    <div className="space-y-2"><Label htmlFor={`${kind}-code`}>{kind === "organization" ? "Slug" : "Code"}</Label><Input id={`${kind}-code`} name={kind === "organization" ? "slug" : "code"} required /></div>
    {kind === "campus" ? <div className="space-y-2 sm:col-span-2"><Label htmlFor="campus-address">Address</Label><Input id="campus-address" name="address" /></div> : null}
    {message ? <p role="status" className="text-sm text-muted-foreground sm:col-span-2">{message}</p> : null}
    <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button>Save</Button></div>
  </form>;
}
