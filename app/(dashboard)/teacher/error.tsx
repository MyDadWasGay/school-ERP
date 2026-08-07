"use client";
import { PortalError } from "@/features/portals/components/portal-error";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <PortalError reset={reset} />; }
