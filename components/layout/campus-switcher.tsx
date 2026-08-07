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
  async function selectCampus(nextCampusId: string) {
    setPending(true);
    try {
      const response = await fetch("/api/auth/campus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campusId: nextCampusId }),
      });
      if (response.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }
  return <label className="hidden items-center gap-2 text-xs text-muted-foreground xl:flex">
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
  </label>;
}
