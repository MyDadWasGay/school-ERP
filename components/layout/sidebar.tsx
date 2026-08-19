"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { School } from "lucide-react";
import { isNavigationItemActive, navigationForPermissions, shouldPrefetchNavigation } from "@/config/nav";
import type { CurrentUser } from "@/lib/auth/types";
import { cn } from "@/lib/utils/cn";

export function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const visibleGroups = navigationForPermissions(user.role, user.permissions);

  return <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-card lg:block">
    <div className="flex h-16 items-center gap-2 border-b px-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><School className="h-5 w-5" /></div>
      <div><p className="font-semibold">School ERP</p><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Operations OS</p></div>
    </div>
    <nav aria-label="Main navigation" className="h-[calc(100vh-4rem)] space-y-5 overflow-y-auto p-3">
      {visibleGroups.map((group) => <section key={group.label}>
        <h2 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{group.label}</h2>
        <ul className="space-y-1">
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isNavigationItemActive(pathname, item);
            return <li key={item.href}><Link aria-current={active ? "page" : undefined} href={item.href} prefetch={shouldPrefetchNavigation(item.href)} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground", active && "bg-accent font-medium text-accent-foreground") }><Icon aria-hidden="true" className="h-4 w-4" />{item.label}</Link></li>;
          })}
        </ul>
      </section>)}
    </nav>
  </aside>;
}
