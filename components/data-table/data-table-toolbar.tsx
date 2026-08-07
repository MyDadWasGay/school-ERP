import type { ReactNode } from "react";
export function DataTableToolbar({ children }: { children: ReactNode }) { return <div className="mb-4 flex flex-wrap items-center justify-between gap-3">{children}</div>; }
