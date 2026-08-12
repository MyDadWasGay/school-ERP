"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/auth/firebase-client";
import { isFirebaseClientConfigured } from "@/lib/env-public";

export function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  async function logout() {
    if (pending) return;
    setPending(true);
    setError("");
    const csrfCookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("school_erp_csrf="));
    const csrfToken = csrfCookie ? decodeURIComponent(csrfCookie.slice("school_erp_csrf=".length)) : "";
    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include", headers: { "X-CSRF-Token": csrfToken } });
      if (!response.ok) {
        setError("We could not end the server session. Please try again.");
        return;
      }
      if (isFirebaseClientConfigured()) await signOut(getFirebaseAuth()).catch(() => undefined);
      window.location.replace("/login");
    } catch {
      setError("Network error while signing out. Your session is still active; please retry.");
    } finally {
      setPending(false);
    }
  }
  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) triggerRef.current?.focus();
      return;
    }
    wasOpenRef.current = true;
    const first = menuRef.current?.querySelector<HTMLElement>("button:not([disabled])");
    first?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.key === "Tab" && menuRef.current) {
        const items = Array.from(menuRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"));
        const firstItem = items[0];
        const lastItem = items.at(-1);
        if (!firstItem || !lastItem) return;
        if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
        if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
      }
    };
    const handlePointerDown = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => { document.removeEventListener("keydown", handleKeyDown); document.removeEventListener("pointerdown", handlePointerDown); };
  }, [open]);
  return <div className="relative">
    <button ref={triggerRef} type="button" aria-label="Open user menu" aria-haspopup="menu" aria-expanded={open} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setOpen((value) => !value)}>{name.slice(0, 1).toUpperCase()}</button>
    {open ? <div ref={menuRef} role="menu" aria-label="Account menu" className="absolute right-0 top-11 z-40 w-56 rounded-md border bg-card p-2 shadow-lg">
      <p className="truncate px-2 py-1 text-sm font-medium">{name}</p>
      <Button role="menuitem" className="mt-1 w-full justify-start" variant="ghost" size="sm" disabled={pending} aria-busy={pending} onClick={logout}><LogOut aria-hidden="true" className="mr-2 h-4 w-4" />{pending ? "Signing out..." : "Sign out"}</Button>
      {error ? <p className="px-2 pt-2 text-xs text-destructive" role="alert">{error}</p> : null}
    </div> : null}
  </div>;
}
