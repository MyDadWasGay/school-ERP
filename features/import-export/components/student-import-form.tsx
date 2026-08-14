"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { browserApiFetch } from "@/lib/api-client/browser";
import { parseStudentCsv, parseStudentWorkbook, type ImportRowError, type StudentImportParseResult } from "../services/student-import-parser";
import { studentImportColumns, studentImportHeaderNames } from "../schemas/student-import.schema";

type ImportResponse = {
  data?: { queued?: boolean; jobId?: string; importJobId?: string; importedRows?: number; errorRows?: number; errors?: ImportRowError[] };
  error?: { message?: string };
};

function formatErrors(errors: ImportRowError[]) {
  return errors.map((error) => `${error.row === 1 ? "Header" : `Row ${error.row}`}: ${Object.values(error.fields).flat().join(" ")}`);
}

async function readFile(file: File): Promise<{ parsed: StudentImportParseResult; csv: string }> {
  if (file.name.toLowerCase().endsWith(".csv")) {
    const csv = await file.text();
    return { parsed: parseStudentCsv(csv), csv };
  }
  const buffer = await file.arrayBuffer();
  const parsed = parseStudentWorkbook(buffer);
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames.find((name) => name.trim().toLocaleLowerCase() === "students") ?? workbook.SheetNames[0];
  return { parsed, csv: sheetName ? XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]) : "" };
}

async function validateOnServer(csv: string, local: StudentImportParseResult) {
  try {
    const response = await browserApiFetch("/api/v1/imports/students/preview", {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: csv,
    });
    const payload = await response.json() as ImportResponse & { data?: ImportResponse["data"] & { readyRows?: number; totalRows?: number } };
    const errors = payload.data?.errors;
    if (!response.ok || !errors) return local;
    const errorRows = new Set(errors.filter((error) => error.row > 1).map((error) => error.row));
    return { ...local, errors, validRows: local.validRows.filter((row) => !errorRows.has(row.rowNumber)) };
  } catch {
    return local;
  }
}

function downloadTemplate() {
  const workbook = XLSX.utils.book_new();
  const example = Object.fromEntries(studentImportColumns.map((column) => [column.key, column.example]));
  const instructions = studentImportColumns.map((column) => ({
    Column: column.key,
    Required: column.required ? "Yes" : "No",
    Format: column.format,
    Description: column.description,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([example]), "Students");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(instructions), "Instructions");
  XLSX.writeFile(workbook, "student-import-template.xlsx");
}

export function StudentImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StudentImportParseResult | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [result, setResult] = useState<ImportResponse["data"]>();

  const previewErrors = useMemo(() => preview ? formatErrors(preview.errors.slice(0, 8)) : [], [preview]);

  async function prepare(nextFile: File | null) {
    setFile(nextFile);
    setPreview(null);
    setResult(undefined);
    setMessage("");
    setIdempotencyKey(crypto.randomUUID());
    if (!nextFile) return;
    try {
      const prepared = await readFile(nextFile);
      setPreview(prepared.parsed);
      setMessage("Checking the file against your school and campus scope…");
      const validated = await validateOnServer(prepared.csv, prepared.parsed);
      setPreview(validated);
      setMessage(validated.errors.length ? "Review the highlighted rows before importing." : `${validated.totalRows} rows are ready to review.`);
    } catch {
      setMessage("The selected file could not be read. Use a valid CSV, XLSX, or XLS file.");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setMessage("Choose a CSV, XLSX, or XLS file first."); return; }
    setPending(true);
    try {
      const prepared = await readFile(file);
      const validated = await validateOnServer(prepared.csv, prepared.parsed);
      setPreview(validated);
      if (!prepared.csv.trim()) { setMessage("The selected file does not contain importable rows."); return; }
      if (validated.errors.length) { setMessage("Fix the preview errors before importing."); return; }
      const response = await browserApiFetch("/api/v1/imports/students", {
        method: "POST",
        headers: { "Content-Type": "text/csv", "X-Idempotency-Key": idempotencyKey },
        body: prepared.csv,
      });
      const payload = await response.json() as ImportResponse;
      const data = payload.data;
      setResult(data);
      setMessage(response.ok
        ? data?.queued ? `Import ${data.jobId} is queued for background processing.` : `Import ${data?.jobId} completed.`
        : payload.error?.message ?? "Import failed.");
    } catch {
      setMessage("The import request could not be completed. Try again.");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="space-y-5 rounded-lg border p-4" noValidate>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-medium">Upload and review</h2>
        <p className="text-sm text-muted-foreground">Upload a file, inspect row-level validation, then confirm the import.</p>
      </div>
      <Button type="button" variant="outline" onClick={downloadTemplate}>Download XLSX template</Button>
    </div>
    <div className="space-y-2">
      <Label htmlFor="student-import-file">Student file</Label>
      <input id="student-import-file" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => void prepare(event.target.files?.[0] ?? null)} />
      <p className="text-xs text-muted-foreground">Up to 1,000 rows. Use campus, academic year, class, and section names or codes; technical ID columns remain accepted for older exports.</p>
    </div>
    {preview ? <div className="space-y-3" aria-live="polite">
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-md bg-muted p-3"><span className="block text-muted-foreground">Rows found</span><span className="text-lg font-semibold">{preview.totalRows}</span></div>
        <div className="rounded-md bg-muted p-3"><span className="block text-muted-foreground">Ready to validate</span><span className="text-lg font-semibold">{preview.validRows.length}</span></div>
        <div className="rounded-md bg-muted p-3"><span className="block text-muted-foreground">Preview errors</span><span className="text-lg font-semibold">{preview.errors.length}</span></div>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm"><caption className="sr-only">Student import preview</caption><thead><tr className="border-b bg-muted/50">{studentImportHeaderNames.map((header) => <th key={header} className="whitespace-nowrap px-3 py-2 font-medium">{header}</th>)}</tr></thead><tbody>
          {preview.validRows.slice(0, 10).map(({ rowNumber, data }) => <tr key={rowNumber} className="border-b last:border-0"><td className="px-3 py-2">{data.admissionNumber}</td><td className="px-3 py-2">{data.firstName}</td><td className="px-3 py-2">{data.lastName}</td><td className="px-3 py-2">{data.campus ?? "Reference provided"}</td><td className="px-3 py-2">{data.academicYear ?? "Reference provided"}</td><td className="px-3 py-2">{data.class ?? "Reference provided"}</td><td className="px-3 py-2">{data.section ?? "Reference provided"}</td><td className="px-3 py-2">{data.rollNumber ?? "—"}</td></tr>)}
        </tbody></table>
      </div>
      {preview.totalRows > 10 ? <p className="text-xs text-muted-foreground">Showing the first 10 valid rows. The server validates the complete file again before writing.</p> : null}
      {previewErrors.length ? <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" role="alert"><p className="font-medium">Fix these preview errors:</p><ul className="mt-1 list-inside list-disc">{previewErrors.map((error) => <li key={error}>{error}</li>)}</ul>{preview.errors.length > previewErrors.length ? <p className="mt-1 text-xs">{preview.errors.length - previewErrors.length} more error(s) are included in the downloadable job report.</p> : null}</div> : null}
    </div> : null}
    {result && !result.queued ? <div className="grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-md border p-3"><span className="block text-muted-foreground">Imported</span><span className="text-lg font-semibold">{result.importedRows ?? 0}</span></div><div className="rounded-md border p-3"><span className="block text-muted-foreground">Failed</span><span className="text-lg font-semibold">{result.errorRows ?? 0}</span>{result.errorRows ? <a className="mt-1 block text-primary underline" href={`/api/v1/imports/students/${result.importJobId ?? result.jobId}/errors`}>Download failed rows</a> : null}</div><div className="rounded-md border p-3"><span className="block text-muted-foreground">Job</span><span className="break-all font-semibold">{result.importJobId ?? result.jobId ?? "—"}</span></div></div> : null}
    {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
    <div className="flex justify-end"><Button disabled={!file || pending || Boolean(preview?.errors.length)}>{pending ? "Checking…" : "Confirm and import"}</Button></div>
  </form>;
}
