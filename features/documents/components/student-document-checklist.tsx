"use client";

import React from "react";
import { CheckCircle2, Clock, XCircle, AlertCircle, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiStudentDocumentSummary } from "@/lib/api-client/contracts";

export function StudentDocumentChecklist({
  summary,
  onUploadClick,
}: {
  summary: ApiStudentDocumentSummary;
  onUploadClick?: (documentTypeId: string) => void;
}) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </span>
        );
      case "pending_verification":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <Clock className="h-3 w-3" />
            Pending Verification
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
            <AlertCircle className="h-3 w-3" />
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
            <HelpCircle className="h-3 w-3" />
            Missing
          </span>
        );
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Document Requirements Checklist</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border/50">
          {summary.requirements.map((req) => (
            <div
              key={req.documentTypeId}
              className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{req.name}</span>
                  <span className="text-[11px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                    {req.category}
                  </span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded font-medium ${
                      req.requirementType === "required"
                        ? "text-rose-600 bg-rose-500/10"
                        : req.requirementType === "conditional"
                          ? "text-blue-600 bg-blue-500/10"
                          : "text-muted-foreground bg-muted"
                    }`}
                  >
                    {req.requirementType === "conditional"
                      ? req.isApplicable
                        ? "Conditional (Required)"
                        : "Conditional (Not Applicable)"
                      : req.requirementType.toUpperCase()}
                  </span>
                </div>
                {req.conditionMetReason && (
                  <p className="text-xs text-muted-foreground">{req.conditionMetReason}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(req.status)}
                {req.status === "missing" && onUploadClick && (
                  <button
                    type="button"
                    onClick={() => onUploadClick(req.documentTypeId)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Upload Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
