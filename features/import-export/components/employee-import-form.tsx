"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { browserApiFetch } from "@/lib/api-client/browser";

export function EmployeeImportForm() {
  const [file, setFile] = useState<File>();
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setWorking(true);
    try {
      const response = await browserApiFetch("/api/v1/imports/employees", {
        method: "POST",
        headers: { "Content-Type": "text/csv", "X-Idempotency-Key": idempotencyKey },
        body: await file.text(),
      });
      const payload = await response.json() as { data?: { importedRows?: number; errorRows?: number }; error?: { message?: string } };
      setMessage(response.ok ? `Imported ${payload.data?.importedRows ?? 0} row(s); ${payload.data?.errorRows ?? 0} error(s).` : payload.error?.message ?? "Import failed.");
      if (response.ok) setIdempotencyKey(crypto.randomUUID());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setWorking(false);
    }
  }

  return <form className="space-y-4" onSubmit={submit}>
    <div><Label htmlFor="employee-import-file">CSV file</Label><Input id="employee-import-file" type="file" accept=".csv,text/csv" onChange={(event) => { setFile(event.target.files?.[0]); setIdempotencyKey(crypto.randomUUID()); setMessage(""); }} /></div>
    <p className="text-xs text-muted-foreground">Headers: employeeNumber, firstName, lastName, email, jobTitle, salaryMinor, allowanceMinor, fixedDeductionMinor, deductionRateBps.</p>
    <Button disabled={!file || working}>{working ? "Importing..." : "Import employees"}</Button>
    {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
  </form>;
}
