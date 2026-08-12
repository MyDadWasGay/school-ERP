"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CampusSwitcher({
  campusId,
  campuses,
}: {
  campusId?: string;
  campuses: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function selectCampus(nextCampusId: string) {
    setPending(true);
    setMessage("");
    setError("");
    try {
      const csrfCookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("school_erp_csrf="));
      const csrfToken = csrfCookie ? decodeURIComponent(csrfCookie.slice("school_erp_csrf=".length)) : "";
      const response = await fetch("/api/v1/auth/campus", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: JSON.stringify({ campusId: nextCampusId }),
      });
      if (!response.ok) {
        setError("We could not switch campus. Your current campus is still active; please retry.");
        return;
      }
      setMessage("Campus changed.");
      router.refresh();
    } catch {
      setError("Network error while switching campus. Your current campus is still active.");
    } finally {
      setPending(false);
    }
  }
  return <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
    <label className="flex items-center gap-2">
    Campus
    <select
      aria-label="Active campus"
      className="h-9 max-w-44 rounded-md border bg-background px-2 text-sm text-foreground"
      value={campusId ?? ""}
      disabled={pending || campuses.length < 2}
      onChange={(event) => selectCampus(event.target.value)}
    >
      {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
    </select>
    </label>
    {pending ? <span role="status" aria-live="polite">Switching…</span> : null}
    {message ? <span role="status" aria-live="polite" className="text-emerald-700">{message}</span> : null}
    {error ? <span role="alert" className="max-w-52 text-destructive">{error}</span> : null}
  </div>;
}
