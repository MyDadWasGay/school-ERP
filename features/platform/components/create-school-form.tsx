"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPlatformSchoolAction } from "../actions/platform.actions";

const initialValues = {
  name: "",
  slug: "",
  timezone: "Asia/Kolkata",
  currency: "INR",
  campusName: "Main Campus",
  campusCode: "MAIN",
  campusAddress: "",
  adminName: "",
  adminEmail: "",
};

export function CreateSchoolForm() {
  const [values, setValues] = useState(initialValues);
  const [message, setMessage] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [pending, setPending] = useState(false);

  function update(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setInviteLink("");
    const result = await createPlatformSchoolAction(values);
    setMessage(result.ok ? result.message ?? "School created." : result.error);
    if (result.ok) {
      setInviteLink(result.data.inviteLink);
      setValues(initialValues);
    }
    setPending(false);
  }

  return <form onSubmit={submit} className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="school-name" label="School name" value={values.name} onChange={(value) => update("name", value)} required />
      <Field id="school-slug" label="School slug" value={values.slug} onChange={(value) => update("slug", value)} required />
      <Field id="campus-name" label="First campus" value={values.campusName} onChange={(value) => update("campusName", value)} required />
      <Field id="campus-code" label="Campus code" value={values.campusCode} onChange={(value) => update("campusCode", value)} required />
      <Field id="campus-address" label="Campus address" value={values.campusAddress} onChange={(value) => update("campusAddress", value)} />
      <Field id="timezone" label="Time zone" value={values.timezone} onChange={(value) => update("timezone", value)} required readOnly />
    </div>
    <div className="border-t pt-5">
      <p className="mb-3 text-sm font-semibold">Initial school administrator</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="admin-name" label="Full name" value={values.adminName} onChange={(value) => update("adminName", value)} required />
        <Field id="admin-email" label="Work email" type="email" value={values.adminEmail} onChange={(value) => update("adminEmail", value)} required />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">The server creates the Firebase identity and returns a one-time password setup link. Do not store the link in source control.</p>
    </div>
    {message ? <p role="status" className="rounded-md bg-muted p-3 text-sm">{message}</p> : null}
    {inviteLink ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><p className="font-medium">Copy this administrator invite now</p><p className="mt-1 break-all text-xs">{inviteLink}</p></div> : null}
    <Button type="submit" disabled={pending}>{pending ? "Creating school…" : "Create school"}</Button>
  </form>;
}

function Field({ id, label, value, onChange, type = "text", required = false, readOnly = false }: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; readOnly?: boolean }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} readOnly={readOnly} aria-readonly={readOnly} />{readOnly ? <p className="text-xs text-muted-foreground">School dates and attendance use Indian Standard Time.</p> : null}</div>;
}
