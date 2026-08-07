"use client";

import { useState } from "react";
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
    if (action.targetStatus === "archived" && !window.confirm("Archive this school? School access will remain disabled until it is restored.")) return;
    setPending(true);
    setMessage("");
    const result = await updatePlatformSchoolStatusAction({ organizationId, status: action.targetStatus });
    setMessage(result.ok ? result.message ?? "Updated" : result.error);
    setPending(false);
  }

  const actions = lifecycleActions[status];
  return <div className="flex items-center gap-2">{actions.map((action) => <Button key={action.targetStatus} type="button" size="sm" variant={action.variant} onClick={() => changeStatus(action)} disabled={pending}>{pending ? "Saving…" : action.label}</Button>)}{message ? <span className="sr-only" role="status">{message}</span> : null}</div>;
}
