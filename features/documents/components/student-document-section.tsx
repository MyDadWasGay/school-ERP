"use client";

import React, { useState } from "react";
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  Trash2,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentDocumentSummaryCard } from "./student-document-summary-card";
import { StudentDocumentChecklist } from "./student-document-checklist";
import { StudentDocumentUploadModal } from "./student-document-upload-modal";
import { DocumentVerificationModal } from "./document-verification-modal";
import { DocumentPreviewModal } from "./document-preview-modal";
import type {
  ApiDetailedStudentDocument,
  ApiDocumentType,
  ApiStudentDocumentSummary,
} from "@/lib/api-client/contracts";
import { formatIndiaDateTime, formatIndiaDate } from "@/lib/utils/india-time";

export function StudentDocumentSection({
  studentId,
  summary: initialSummary,
  documents: initialDocuments,
  documentTypes,
  canUpload = false,
  canVerify = false,
  canDelete = false,
}: {
  studentId: string;
  summary: ApiStudentDocumentSummary;
  documents: ApiDetailedStudentDocument[];
  documentTypes: ApiDocumentType[];
  canUpload?: boolean;
  canVerify?: boolean;
  canDelete?: boolean;
}) {
  const [summary, setSummary] = useState<ApiStudentDocumentSummary>(initialSummary);
  const [documents, setDocuments] =
    useState<ApiDetailedStudentDocument[]>(initialDocuments);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string | undefined>();
  const [previewDoc, setPreviewDoc] = useState<ApiDetailedStudentDocument | null>(null);
  const [verifyModalState, setVerifyModalState] = useState<{
    doc: ApiDetailedStudentDocument | null;
    action: "verify" | "reject";
  }>({ doc: null, action: "verify" });

  const refreshData = async () => {
    try {
      const [sumRes, docsRes] = await Promise.all([
        fetch(`/api/v1/students/${encodeURIComponent(studentId)}/documents/summary`),
        fetch(`/api/v1/students/${encodeURIComponent(studentId)}/documents/detailed`),
      ]);
      if (sumRes.ok && docsRes.ok) {
        const sumJson = await sumRes.json();
        const docsJson = await docsRes.json();
        setSummary(sumJson.data);
        setDocuments(docsJson.data.documents);
      }
    } catch {
      // Ignored
    }
  };

  const handleOpenUpload = (docTypeId?: string) => {
    setSelectedDocTypeId(docTypeId);
    setIsUploadOpen(true);
  };

  const handleDownload = async (documentId: string) => {
    try {
      const res = await fetch(
        `/api/v1/documents/${encodeURIComponent(documentId)}/token?disposition=attachment`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Download failed.");

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

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document? It can be restored by an administrator.")) return;
    try {
      const res = await fetch(`/api/v1/documents/${encodeURIComponent(documentId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "User requested deletion" }),
      });
      if (res.ok) {
        await refreshData();
      }
    } catch {
      alert("Failed to delete document.");
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Summary Card */}
      <StudentDocumentSummaryCard summary={summary} />

      {/* 2. Requirements Checklist */}
      <StudentDocumentChecklist
        summary={summary}
        onUploadClick={canUpload ? handleOpenUpload : undefined}
      />

      {/* 3. Upload Action Banner */}
      {canUpload && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-foreground">Upload Student Documents</h4>
            <p className="text-xs text-muted-foreground">
              Submit birth certificates, identity proofs, transfer records, or parent ID documents.
            </p>
          </div>
          <Button onClick={() => handleOpenUpload()} className="gap-2 shrink-0">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        </div>
      )}

      {/* 4. Active Documents Table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Uploaded Student Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">No documents uploaded yet</p>
                <p className="text-xs text-muted-foreground">
                  Uploaded identity, academic, and legal documents will be safely stored and listed here.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {documents.map((doc) => {
                const currentVer = doc.currentVersion;
                return (
                  <div
                    key={doc.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {doc.docTypeName}
                        </span>
                        <span className="text-[11px] font-mono uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {doc.docTypeCategory}
                        </span>
                        {currentVer && (
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                            v{currentVer.versionNumber}
                          </span>
                        )}

                        {/* Status / Verification Badge */}
                        {doc.verificationStatus === "verified" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </span>
                        ) : doc.verificationStatus === "rejected" ? (
                          <span
                            title={doc.rejectionReason || "Rejected"}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20"
                          >
                            <XCircle className="h-3 w-3" />
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            Pending Verification
                          </span>
                        )}

                        {doc.expiryStatus === "expired" && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                            <AlertCircle className="h-3 w-3" />
                            Expired
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {currentVer?.originalFilename && (
                          <span className="font-mono text-foreground/80">
                            {currentVer.originalFilename}
                          </span>
                        )}
                        <span>{formatFileSize(currentVer?.fileSizeBytes)}</span>
                        <span>Uploaded: {formatIndiaDateTime(new Date(doc.createdAt))}</span>
                        {doc.expiresAt && (
                          <span>Expires: {formatIndiaDate(new Date(doc.expiresAt))}</span>
                        )}
                      </div>

                      {doc.rejectionReason && (
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                          Rejection Reason: {doc.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewDoc(doc)}
                        className="gap-1.5 h-8 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(doc.id)}
                        className="gap-1.5 h-8 text-xs"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>

                      {canUpload && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenUpload(doc.documentTypeId)}
                          className="gap-1.5 h-8 text-xs"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          New Version
                        </Button>
                      )}

                      {canVerify && doc.verificationStatus === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() =>
                              setVerifyModalState({ doc, action: "verify" })
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-8 text-xs"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              setVerifyModalState({ doc, action: "reject" })
                            }
                            className="gap-1 h-8 text-xs"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </>
                      )}

                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(doc.id)}
                          className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <StudentDocumentUploadModal
        studentId={studentId}
        documentTypes={documentTypes}
        selectedDocTypeId={selectedDocTypeId}
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={refreshData}
      />

      {/* Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
      />

      {/* Verification Modal */}
      <DocumentVerificationModal
        document={verifyModalState.doc}
        action={verifyModalState.action}
        isOpen={Boolean(verifyModalState.doc)}
        onClose={() => setVerifyModalState({ doc: null, action: "verify" })}
        onSuccess={refreshData}
      />
    </div>
  );
}
