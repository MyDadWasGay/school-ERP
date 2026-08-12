import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  message = "We could not load this data.",
  retry,
}: {
  message?: string;
  retry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <div className="flex items-center gap-3">
        <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span>{message}</span>
      </div>
      {retry ? <Button type="button" variant="outline" size="sm" onClick={retry}>Try again</Button> : null}
    </div>
  );
}
