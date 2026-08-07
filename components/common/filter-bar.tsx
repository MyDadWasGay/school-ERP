import type { ReactNode } from "react";
export function FilterBar({ children }: { children: ReactNode }) { return <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">{children}</div>; }
