"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { browserApiFetch } from "@/lib/api-client/browser";

export function InviteAcceptForm({ token }: { token: string }) {
  const [details, setDetails] = useState<{ email: string; displayName: string; role: string }>();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("Checking invitation...");
  const [verificationLink, setVerificationLink] = useState("");
  useEffect(() => {
    if (!token) { setMessage("This invitation link is incomplete."); return; }
    browserApiFetch(`/api/v1/users/invite/validate?token=${encodeURIComponent(token)}`).then(async (response) => {
      const payload = await response.json() as { data?: { email?: string; displayName?: string; role?: string }; error?: { message?: string } };
      const data = payload.data;
      if (!response.ok || !data?.email || !data.displayName || !data.role) throw new Error(payload.error?.message ?? "This invitation is invalid, expired, or already used.");
      setDetails({ email: data.email, displayName: data.displayName, role: data.role });
      setMessage("");
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "This invitation could not be verified."));
  }, [token]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) { setMessage("Passwords do not match."); return; }
    setMessage("Activating account...");
    const response = await browserApiFetch("/api/v1/users/invite/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    const payload = await response.json() as { data?: { verificationLink?: string }; error?: { message?: string } };
    if (!response.ok) { setMessage(payload.error?.message ?? "Unable to activate account."); return; }
    setVerificationLink(payload.data?.verificationLink ?? "");
    setMessage("Account activated. Verify your email before signing in.");
  }
  if (!details) return <p role="status" className="rounded-md bg-muted p-3 text-sm">{message}</p>;
  if (verificationLink) return <div className="space-y-4"><p role="status" className="rounded-md bg-muted p-3 text-sm">{message}</p><a className="break-all text-sm text-primary underline" href={verificationLink}>Open verification link</a><p className="text-sm text-muted-foreground">After verification, sign in with {details.email} and the password you just created.</p></div>;
  return <form onSubmit={submit} className="space-y-4" noValidate><div><h1 className="text-2xl font-semibold">Activate your School ERP account</h1><p className="mt-2 text-sm text-muted-foreground">{details.displayName} · {details.role.replaceAll("_", " ")} · {details.email}</p></div><label className="block space-y-2 text-sm"><span className="font-medium">Create password</span><Input type="password" minLength={12} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><label className="block space-y-2 text-sm"><span className="font-medium">Confirm password</span><Input type="password" minLength={12} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>{message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}<Button disabled={!password || !confirmation}>Activate account</Button></form>;
}
