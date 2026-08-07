"use client";
import Link from "next/link";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFirebaseAuth } from "@/lib/auth/firebase-client";

export const PASSWORD_RECOVERY_MESSAGE = "If an eligible account exists, reset instructions have been sent.";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
    } catch {
      // Keep the same user-visible response for unknown accounts and provider failures.
    } finally {
      setMessage(PASSWORD_RECOVERY_MESSAGE);
    }
  }

  return <form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">Work email</Label><Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>{message ? <p role="status" className="text-sm text-emerald-600">{message}</p> : null}<Button className="w-full" type="submit">Send reset link</Button><p className="text-center text-sm"><Link href="/login" className="text-primary">Back to sign in</Link></p></form>;
}
