import type { ComponentProps } from "react";
import type { Badge } from "@/components/ui/badge";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

const labels: Record<string, string> = {
  active: "Active", archived: "Archived", approved: "Approved", absent: "Absent", cancelled: "Cancelled", closed: "Closed", completed: "Completed", configured: "Configured", creating: "Creating", damaged: "Damaged", directory: "Directory", disabled: "Disabled", dismissed: "Dismissed", draft: "Draft", expired: "Expired", failed: "Failed", inactive: "Inactive", in_progress: "In progress", late: "Late", lost: "Lost", manual_review: "Manual review", medical: "Medical", open: "Open", overdue: "Overdue", paid: "Paid", partial: "Partially paid", pending: "Pending", private: "Private", processing: "Processing", present: "Present", public: "Public", published: "Published", rejected: "Rejected", requested: "Requested", resolved: "Resolved", retired: "Retired", revoked: "Revoked", scheduled: "Scheduled", selected: "Selected", submitted: "Submitted", suspended: "Suspended", used: "Used", verified: "Verified", withdrawn: "Withdrawn",
};

export function statusLabelFor(status: string) {
  const normalized = status.trim().toLowerCase().replaceAll(" ", "_");
  return labels[normalized] ?? status.replaceAll("_", " ").replace(/\b\w/g, (value) => value.toUpperCase());
}

export function statusVariantFor(status: string): BadgeVariant {
  const normalized = status.trim().toLowerCase().replaceAll(" ", "_");
  if (["active", "approved", "completed", "configured", "directory", "paid", "present", "public", "published", "resolved", "verified"].includes(normalized)) return "success";
  if (["absent", "cancelled", "damaged", "disabled", "dismissed", "expired", "failed", "lost", "overdue", "rejected", "revoked", "retired", "suspended", "withdrawn"].includes(normalized)) return "warning";
  if (["creating", "draft", "in_progress", "manual_review", "partial", "pending", "processing", "requested", "selected", "submitted"].includes(normalized)) return "outline";
  return "secondary";
}
