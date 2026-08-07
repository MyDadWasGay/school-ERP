"use client";

import { useState } from "react";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/auth/firebase-client";
import { isFirebaseClientConfigured } from "@/lib/env-public";

export function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    if (isFirebaseClientConfigured()) await signOut(getFirebaseAuth()).catch(() => undefined);
    window.location.assign("/login");
  }
  return <div className="relative">
    <button aria-label="Open user menu" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary" onClick={() => setOpen((value) => !value)}>{name.slice(0, 1).toUpperCase()}</button>
    {open ? <div className="absolute right-0 top-11 z-40 w-52 rounded-md border bg-card p-2 shadow-lg">
      <p className="truncate px-2 py-1 text-sm font-medium">{name}</p>
      <Button className="mt-1 w-full justify-start" variant="ghost" size="sm" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
    </div> : null}
  </div>;
}
