"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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

  return <div className="flex min-h-64 items-center justify-center rounded-xl border bg-card p-8 text-center" role="alert">
    <div className="max-w-md">
      <h1 className="text-xl font-semibold">This workspace could not load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The request failed before the workspace was ready. Retry, or sign in again if your session has expired.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" onClick={() => router.replace("/login")}>Sign in</Button>
      </div>
    </div>
  </div>;
}
