"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <div className="flex min-h-screen items-center justify-center p-6 text-center"><div><h1 className="text-2xl font-bold">Something went wrong</h1><p className="mt-2 text-sm text-muted-foreground">The error was isolated. Try the request again.</p><Button className="mt-6" onClick={() => reset()}>Try again</Button></div></div>; }
