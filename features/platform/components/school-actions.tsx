"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { OrganizationStatus } from "@/config/organization-status";
import { updatePlatformSchoolStatusAction } from "../actions/platform.actions";

type ActionVariant = "secondary" | "outline" | "ghost";
type LifecycleAction = { targetStatus: OrganizationStatus; label: string; variant: ActionVariant };

const lifecycleActions: Record<OrganizationStatus, readonly LifecycleAction[]> = {
  provisioning: [],
  active: [
    { targetStatus: "suspended", label: "Suspend", variant: "outline" },
    { targetStatus: "archived", label: "Archive", variant: "ghost" },
  ],
  suspended: [
    { targetStatus: "active", label: "Activate", variant: "secondary" },
    { targetStatus: "archived", label: "Archive", variant: "ghost" },
  ],
  archived: [{ targetStatus: "active", label: "Restore", variant: "secondary" }],
  deletion_scheduled: [{ targetStatus: "archived", label: "Cancel deletion", variant: "secondary" }],
};

export function SchoolActions({ organizationId, status }: { organizationId: string; status: OrganizationStatus }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function changeStatus(action: LifecycleAction) {
    setPending(true);
    setMessage("");
    const result = await updatePlatformSchoolStatusAction({ organizationId, status: action.targetStatus });
    if (!result.ok) {
      setMessage(result.error);
      setPending(false);
      throw new Error(result.error);
    }
    setMessage(result.message ?? "Updated");
    setPending(false);
  }

  const actions = lifecycleActions[status];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => action.targetStatus === "archived" ? (
        <ConfirmDialog
          key={action.targetStatus}
          label={action.label}
          title="Archive this school?"
          description="School access will remain disabled until the school is restored. Existing records and audit history are retained."
          triggerVariant={action.variant}
          disabled={pending}
          onConfirm={() => changeStatus(action)}
        />
      ) : (
        <Button key={action.targetStatus} type="button" size="sm" variant={action.variant} onClick={() => changeStatus(action)} disabled={pending}>
          {pending ? "Saving..." : action.label}
        </Button>
      ))}
      {message ? <span className="sr-only" role="status">{message}</span> : null}
    </div>
  );
}
