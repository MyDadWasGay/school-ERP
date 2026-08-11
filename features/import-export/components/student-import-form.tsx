"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { browserApiFetch } from "@/lib/api-client/browser";

export function StudentImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setMessage("Choose a CSV file first."); return; }
    const result = await browserApiFetch("/api/v1/imports/students", { method: "POST", headers: { "Content-Type": "text/csv" }, body: await file.text() });
    const payload = await result.json() as { data?: { queued?: boolean; jobId?: string; importedRows?: number; errorRows?: number }; error?: { message?: string } };
    const data = payload.data;
    setMessage(result.ok ? data?.queued ? `Import ${data.jobId} queued for background processing.` : `Import ${data?.jobId} completed: ${data?.importedRows ?? 0} rows imported, ${data?.errorRows ?? 0} errors.` : payload.error?.message ?? "Import failed.");
  }
  return <form onSubmit={submit} className="rounded-lg border p-4"><div className="space-y-2"><Label htmlFor="student-import-file">Student CSV</Label><input id="student-import-file" type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></div><p className="mt-2 text-xs text-muted-foreground">Required columns: admissionNumber, firstName, lastName, campusId, academicYearId, classId, sectionId. Maximum 1,000 rows.</p>{message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}<div className="mt-4 flex justify-end"><Button disabled={!file}>Validate and import</Button></div></form>;
}
