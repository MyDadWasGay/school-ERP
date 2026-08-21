"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Clock, FileCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiStudentDocumentSummary } from "@/lib/api-client/contracts";

export function StudentDocumentSummaryCard({
  summary,
}: {
  summary: ApiStudentDocumentSummary;
}) {
  const percentage = summary.completionPercentage;
  const isComplete = summary.isComplete;

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-gradient-to-br from-card via-card to-muted/20">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Document Completion</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isComplete
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                }`}
              >
                {isComplete ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    All Required Complete
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5" />
                    Action Required
                  </>
                )}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Verified & Valid Required Documents
              </span>
              <span className="font-semibold">
                {summary.completedRequired} / {summary.totalRequired} ({percentage}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isComplete
                    ? "bg-emerald-500"
                    : percentage > 50
                      ? "bg-primary"
                      : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            </div>
          </div>

          {summary.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Attention Required:</span>
              </div>
              <ul className="space-y-1 pl-6 list-disc text-xs text-amber-800 dark:text-amber-300">
                {summary.warnings.map((warning, idx) => (
                  <li key={idx}>{warning.replace(/^[⚠\s]+/, "")}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
