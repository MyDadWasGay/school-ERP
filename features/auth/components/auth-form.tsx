"use client";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFirebaseAuth } from "@/lib/auth/firebase-client";

export function AuthForm() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  const searchParams = useSearchParams();
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); setError(""); try { const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password); const token = await credential.user.getIdToken(true); const response = await fetch("/api/v1/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ idToken: token }) }); const payload = await response.json() as { data?: { redirectTo?: string }; error?: { message?: string } }; if (!response.ok) throw new Error(payload.error?.message ?? "Your account could not be connected to a school profile."); window.location.assign(searchParams.get("next") || payload.data?.redirectTo || "/dashboard"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Sign in failed."); } finally { setPending(false); } }
  return <form onSubmit={submit} className="space-y-4">{searchParams.get("setup") === "complete" ? <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">School created. Verify your email before signing in.</p> : null}<div className="space-y-2"><Label htmlFor="email">Work email</Label><Input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@school.edu" /></div><div className="space-y-2"><div className="flex justify-between"><Label htmlFor="password">Password</Label><Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link></div><Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>{error ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<Button className="w-full" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button><p className="text-center text-sm text-muted-foreground">First time setting up a school? <Link href="/setup" className="text-primary hover:underline">Create your school</Link></p></form>;
}
