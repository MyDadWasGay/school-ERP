"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LogIn, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Dashboard route failed", error);
  }, [error]);

  const errorMessage =
    error?.message || "An unexpected error occurred while loading this workspace.";

  return (
    <div
      className="flex min-h-72 items-center justify-center rounded-xl border border-border/80 bg-card p-8 text-center shadow-sm"
      role="alert"
    >
      <div className="max-w-md space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-foreground">
            This workspace could not load
          </h1>
          <p className="text-sm text-muted-foreground">
            {errorMessage}
          </p>
          {error?.digest && (
            <p className="font-mono text-[11px] text-muted-foreground/70">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => router.replace("/login")}
            className="gap-2"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
}
