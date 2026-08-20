"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/status-badge";
import { inviteGuardianAction, inviteStudentAction } from "../actions/student.actions";

export function PortalInviteButton({
  studentId,
  guardianId,
  email,
  portalStatus,
  targetName,
}: {
  studentId: string;
  guardianId?: string;
  email?: string | null;
  portalStatus?: "active" | "invited" | string | null;
  targetName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");

  if (portalStatus === "active") {
    return <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium"><StatusBadge status="active" /> Active</span>;
  }

  if (!email) {
    return <span className="text-xs text-muted-foreground italic">Add email to invite</span>;
  }

  async function handleInvite() {
    setError("");
    setInviteLink("");
    setCopyFeedback("");
    setLoading(true);
    setOpen(true);
    try {
      const response = guardianId
        ? await inviteGuardianAction(studentId, guardianId)
        : await inviteStudentAction(studentId);
      if (!response.ok) {
        setError(response.error ?? "Unable to generate invitation link.");
        return;
      }
      setInviteLink(response.data.inviteLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate invitation link.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard && inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopyFeedback("Copied to clipboard!");
      setTimeout(() => setCopyFeedback(""), 3000);
    }
  }

  const isReissue = portalStatus === "invited";
  const buttonLabel = isReissue ? "Re-issue Invite" : "Invite to Portal";

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        {portalStatus === "invited" ? <StatusBadge status="invited" /> : null}
        <Button
          type="button"
          size="sm"
          variant={isReissue ? "outline" : "default"}
          className="h-8 text-xs"
          onClick={handleInvite}
        >
          {buttonLabel}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isReissue ? "Re-issue Portal Invitation" : "Portal Invitation Generated"}</DialogTitle>
            <DialogDescription>
              {targetName ? `Share this activation link with ${targetName} (${email}).` : `Share this activation link with ${email}.`} This one-time link expires in 48 hours.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Generating activation link...</div>
          ) : error ? (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          ) : inviteLink ? (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2">
                <Input readOnly value={inviteLink} className="font-mono text-xs" />
                <Button type="button" size="sm" onClick={handleCopy}>
                  {copyFeedback || "Copy Link"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The recipient will use this link to set their password and activate their account.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
