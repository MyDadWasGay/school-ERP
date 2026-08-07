"use client";

import Link from "next/link";
import { useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFirebaseAuth } from "@/lib/auth/firebase-client";

export function SchoolSetupForm() {
  const [values, setValues] = useState({ name: "", email: "", password: "", schoolName: "", schoolSlug: "", campusName: "Main Campus", campusCode: "MAIN", campusAddress: "" });
  const [error, setError] = useState(""); const [success, setSuccess] = useState(false); const [pending, setPending] = useState(false);
  function update(key: keyof typeof values, value: string) { setValues((current) => ({ ...current, [key]: value })); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    try {
      const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), values.email, values.password);
      await updateProfile(credential.user, { displayName: values.name });
      await sendEmailVerification(credential.user);
      const idToken = await credential.user.getIdToken(true);
      const response = await fetch("/api/setup/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken, schoolName: values.schoolName, schoolSlug: values.schoolSlug, campusName: values.campusName, campusCode: values.campusCode, campusAddress: values.campusAddress }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "School setup failed. Check the server configuration.");
      setSuccess(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "School setup failed."); }
    finally { setPending(false); }
  }
  if (success) return <div className="space-y-5 rounded-lg border border-emerald-200 bg-emerald-50 p-5"><h2 className="text-lg font-semibold text-emerald-900">School created successfully</h2><p className="text-sm text-emerald-800">We sent a verification email to <strong>{values.email}</strong>. Verify it, then sign in. Your account is the school’s Super administrator.</p><Button className="w-full" onClick={() => window.location.assign("/login")}>Continue to sign in</Button></div>;
  return <form onSubmit={submit} className="space-y-6">
    <section className="space-y-4"><div><h2 className="font-semibold">Your administrator account</h2><p className="text-sm text-muted-foreground">This first account becomes the school Super administrator.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field id="name" label="Full name" value={values.name} onChange={(value) => update("name", value)} required /><Field id="email" label="Work email" type="email" value={values.email} onChange={(value) => update("email", value)} required /><Field id="password" label="Password (8+ characters)" type="password" value={values.password} onChange={(value) => update("password", value)} required minLength={8} /></div></section>
    <section className="space-y-4 border-t pt-5"><div><h2 className="font-semibold">Your school</h2><p className="text-sm text-muted-foreground">Use a short lowercase slug, for example <code>green-valley-school</code>.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field id="schoolName" label="School name" value={values.schoolName} onChange={(value) => update("schoolName", value)} required /><Field id="schoolSlug" label="School slug" value={values.schoolSlug} onChange={(value) => update("schoolSlug", value)} required /><Field id="campusName" label="First campus name" value={values.campusName} onChange={(value) => update("campusName", value)} required /><Field id="campusCode" label="Campus code" value={values.campusCode} onChange={(value) => update("campusCode", value)} required /></div><Field id="campusAddress" label="Campus address (optional)" value={values.campusAddress} onChange={(value) => update("campusAddress", value)} /></section>
    {error ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <Button className="w-full" type="submit" disabled={pending}>{pending ? "Creating your school…" : "Create school and administrator account"}</Button>
    <p className="text-center text-sm text-muted-foreground">Already have access? <Link href="/login" className="text-primary hover:underline">Sign in</Link></p>
  </form>;
}

function Field({ id, label, value, onChange, type = "text", required = false, minLength }: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; minLength?: number }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} name={id} type={type} required={required} minLength={minLength} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
