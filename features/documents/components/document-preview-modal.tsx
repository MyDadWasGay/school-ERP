"use client";

import React, { useEffect, useState } from "react";
import { X, Download, FileText, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiDetailedStudentDocument } from "@/lib/api-client/contracts";

export function DocumentPreviewModal({
  document,
  isOpen,
  onClose,
}: {
  document: ApiDetailedStudentDocument | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !document) {
      setStreamUrl(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadToken() {
      try {
        const res = await fetch(
          `/api/v1/documents/${encodeURIComponent(document!.id)}/token?disposition=inline`,
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || "Unable to generate preview access token.");
        }
        if (isMounted) {
          const token = json.data.accessToken;
          setStreamUrl(`/api/v1/documents/stream/${token}`);
          setMimeType(json.data.mimeType);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load document preview.");
          setLoading(false);
        }
      }
    }

    loadToken();

    return () => {
      isMounted = false;
    };
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const handleDownload = async () => {
    try {
      const res = await fetch(
        `/api/v1/documents/${encodeURIComponent(document.id)}/token?disposition=attachment`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to generate download link.");

      const downloadUrl = `/api/v1/documents/stream/${json.data.accessToken}`;
      const a = window.document.createElement("a");
      a.href = downloadUrl;
      a.download = json.data.filename || "document";
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || "Could not download document.");
    }
  };

  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative flex flex-col w-full max-w-4xl h-[85vh] rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <div className="truncate">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {document.docTypeName}
              </h3>
              <p className="text-xs text-muted-foreground truncate font-mono">
                {document.currentVersion?.originalFilename || "Document file"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="gap-1.5 h-8 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
            {streamUrl && (
              <a
                href={streamUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-muted/20 p-4 flex items-center justify-center overflow-auto">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span>Decrypting and generating secure preview…</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 text-center p-6 max-w-sm">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm font-medium text-foreground">{error}</p>
              <Button size="sm" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {!loading && !error && streamUrl && (
            <>
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={streamUrl}
                  alt={document.docTypeName}
                  className="max-h-full max-w-full rounded object-contain shadow-sm"
                />
              ) : isPdf ? (
                <iframe
                  src={streamUrl}
                  title={document.docTypeName}
                  className="w-full h-full rounded border border-border bg-white"
                />
              ) : (
                <div className="text-center space-y-3">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-foreground">
                    Preview not directly embeddable for this format.
                  </p>
                  <Button size="sm" onClick={handleDownload} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download File
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
