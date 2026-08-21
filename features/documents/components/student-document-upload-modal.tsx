"use client";

import React, { useState } from "react";
import { Upload, X, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiDocumentType } from "@/lib/api-client/contracts";

export function StudentDocumentUploadModal({
  studentId,
  documentTypes,
  selectedDocTypeId,
  isOpen,
  onClose,
  onSuccess,
}: {
  studentId: string;
  documentTypes: ApiDocumentType[];
  selectedDocTypeId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [docTypeId, setDocTypeId] = useState<string>(
    selectedDocTypeId || documentTypes[0]?.id || "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [changeReason, setChangeReason] = useState<string>("");
  const [issuedAt, setIssuedAt] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentType = documentTypes.find((t) => t.id === docTypeId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate size
    const maxBytes = currentType?.maxFileSizeBytes ?? 15_728_640;
    if (selected.size > maxBytes) {
      setError(
        `File size (${(selected.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum limit of ${(maxBytes / (1024 * 1024)).toFixed(1)} MB.`,
      );
      setFile(null);
      return;
    }

    // Validate extension
    const ext = selected.name.split(".").pop()?.toLowerCase() || "";
    const allowed = (currentType?.allowedFileTypes || "pdf,jpg,jpeg,png,webp")
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/^\./, ""));

    if (!allowed.includes(ext)) {
      setError(
        `File format .${ext.toUpperCase()} is not allowed. Supported formats: ${allowed.join(", ").toUpperCase()}`,
      );
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !docTypeId) {
      setError("Please select a file and document type.");
      return;
    }

    setLoading(true);
    setError(null);
    setProgressText("Reading file from device…");

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      setProgressText("Uploading, scanning for malware & persisting…");

      const res = await fetch(`/api/v1/students/${encodeURIComponent(studentId)}/documents/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentTypeId: docTypeId,
          fileBase64: base64,
          filename: file.name,
          claimedMimeType: file.type,
          changeReason: changeReason || undefined,
          issuedAt: issuedAt || undefined,
          expiresAt: expiresAt || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Document upload failed.");
      }

      setProgressText("Upload complete!");
      setTimeout(() => {
        setLoading(false);
        onSuccess();
        onClose();
      }, 400);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during upload.");
      setLoading(false);
      setProgressText("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Upload Student Document</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="docType">Document Type</Label>
            <select
              id="docType"
              value={docTypeId}
              onChange={(e) => {
                setDocTypeId(e.target.value);
                setFile(null);
                setError(null);
              }}
              disabled={loading}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {documentTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.requirementType.toUpperCase()})
                </option>
              ))}
            </select>
            {currentType?.description && (
              <p className="text-xs text-muted-foreground">{currentType.description}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Document File</Label>
            <div className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-lg p-5 text-center transition-colors">
              <input
                type="file"
                id="fileUpload"
                className="hidden"
                accept={currentType?.allowedFileTypes.split(",").map((t) => `.${t.trim()}`).join(",")}
                onChange={handleFileChange}
                disabled={loading}
              />
              <label
                htmlFor="fileUpload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {file ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <FileText className="h-5 w-5" />
                    <span>{file.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to select or drag document file</p>
                    <p className="text-xs text-muted-foreground">
                      Allowed: {currentType?.allowedFileTypes.toUpperCase() || "PDF, JPG, PNG, WEBP"} · Max{" "}
                      {((currentType?.maxFileSizeBytes ?? 15728640) / (1024 * 1024)).toFixed(0)} MB
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          {currentType?.expiryEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="issuedAt">Issue Date</Label>
                <Input
                  id="issuedAt"
                  type="date"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiresAt">Expiry Date</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="changeReason">Upload Reason / Note (Optional)</Label>
            <Input
              id="changeReason"
              placeholder="e.g. Updated renewal or corrected scan"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              disabled={loading}
            />
          </div>

          {loading && (
            <div className="space-y-2 py-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progressText}</span>
                <span className="animate-spin">⏳</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 animate-pulse bg-primary rounded-full" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !file}>
              {loading ? "Uploading…" : "Upload Document"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
