"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiDetailedStudentDocument } from "@/lib/api-client/contracts";

export function DocumentVerificationModal({
  document,
  action,
  isOpen,
  onClose,
  onSuccess,
}: {
  document: ApiDetailedStudentDocument | null;
  action: "verify" | "reject";
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !document) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (action === "reject" && (!reason || reason.trim().length < 3)) {
      setError("A detailed rejection reason is mandatory.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint =
        action === "verify"
          ? `/api/v1/documents/${encodeURIComponent(document.id)}/verify`
          : `/api/v1/documents/${encodeURIComponent(document.id)}/reject`;

      const body =
        action === "verify"
          ? { notes: notes || undefined }
          : { reason: reason.trim(), notes: notes || undefined };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || `Failed to ${action} document.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {action === "verify" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <h3 className="text-lg font-semibold text-foreground">
              {action === "verify" ? "Verify Document" : "Reject Document"}
            </h3>
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

        <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1">
          <div className="font-medium text-foreground">{document.docTypeName}</div>
          <div className="text-muted-foreground">
            File: {document.currentVersion?.originalFilename || "Document file"}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {action === "reject" ? (
            <div className="space-y-1.5">
              <Label htmlFor="rejectReason">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Input
                id="rejectReason"
                placeholder="e.g. Blurry scan, details do not match student records"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Verification Notes (Optional)</Label>
            <Input
              id="notes"
              placeholder="e.g. Verified against original registry document"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={
                action === "verify"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {loading
                ? "Processing…"
                : action === "verify"
                  ? "Approve & Mark Verified"
                  : "Reject Document"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
