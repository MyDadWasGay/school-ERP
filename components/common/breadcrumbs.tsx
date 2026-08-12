"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { breadcrumbsForPath } from "@/config/route-registry";

export function Breadcrumbs() {
  const pathname = usePathname();
  const items = breadcrumbsForPath(pathname);
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-4 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 text-xs text-muted-foreground">
        <li><Link className="rounded px-1 py-0.5 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/dashboard">Overview</Link></li>
        {items.map((item) => (
          <li key={`${item.label}-${item.href ?? "current"}`} className="flex items-center gap-1">
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            {item.href ? <Link className="rounded px-1 py-0.5 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={item.href}>{item.label}</Link> : <span aria-current="page" className="max-w-56 truncate font-medium text-foreground">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
