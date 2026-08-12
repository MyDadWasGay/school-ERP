import type { ReactNode } from "react";

export type MutationState = "idle" | "submitting" | "success" | "error" | "auth-error";

export function MutationFeedback({
  state,
  message,
  className = "",
}: {
  state: MutationState;
  message?: ReactNode;
  className?: string;
}) {
  if (state === "idle" || !message) return null;
  const role = state === "error" || state === "auth-error" ? "alert" : "status";
  return <p role={role} aria-live={role === "status" ? "polite" : undefined} aria-busy={state === "submitting" || undefined} className={`rounded-md p-3 text-sm ${state === "error" || state === "auth-error" ? "border border-destructive/30 bg-destructive/10 text-destructive" : state === "success" ? "border border-success/30 bg-success-muted text-success-muted-foreground" : "bg-muted text-muted-foreground"} ${className}`}>{message}</p>;
}
