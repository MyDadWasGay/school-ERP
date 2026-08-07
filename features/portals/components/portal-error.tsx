"use client";

import { Button } from "@/components/ui/button";

export function PortalError({ reset }: { reset: () => void }) {
  return <div className="rounded-lg border p-8 text-center"><h1 className="text-xl font-semibold">Portal data is temporarily unavailable</h1><p className="mt-2 text-sm text-muted-foreground">No write was assumed. Retry to load the latest authorized data.</p><Button className="mt-4" onClick={reset}>Retry</Button></div>;
}

