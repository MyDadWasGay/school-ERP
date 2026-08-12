"use client";

import { useState } from "react";

const formats = [
  { key: "csv", label: "CSV" },
  { key: "xlsx", label: "Excel" },
  { key: "pdf", label: "PDF" },
] as const;

export function ExportActions({ report }: { report: string }) {
  const [pending, setPending] = useState<string>();
  return <div className="flex flex-wrap gap-2" aria-label="Export report">
    {formats.map((format) => <a key={format.key} aria-busy={pending === format.key} aria-disabled={Boolean(pending)} onClick={(event) => { if (pending) { event.preventDefault(); return; } setPending(format.key); window.setTimeout(() => setPending(undefined), 1500); }} className="inline-flex h-10 items-center justify-center rounded-md border bg-transparent px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`/api/v1/exports?report=${encodeURIComponent(report)}&format=${format.key}&limit=500`}>{pending === format.key ? `Preparing ${format.label}...` : format.label}</a>)}
  </div>;
}
