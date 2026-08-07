"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, School, X } from "lucide-react";
import { navigationForRole } from "@/config/nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { CurrentUser } from "@/lib/auth/types";

export function MobileSidebar({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const visibleItems = navigationForRole(user.role).filter((item) =>
    !item.permission || user.permissions.includes("*") || user.permissions.includes(item.permission),
  );
  return <>
    <Button aria-label="Open navigation" variant="ghost" size="sm" className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
    {open ? <div className="fixed inset-0 z-50 lg:hidden">
      <button aria-label="Close navigation" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <aside className="relative h-full w-[min(20rem,86vw)] bg-card shadow-xl">
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2"><School className="h-5 w-5 text-primary" /><span className="font-semibold">School ERP</span></div>
          <Button aria-label="Close navigation" variant="ghost" size="sm" onClick={() => setOpen(false)}><X className="h-5 w-5" /></Button>
        </div>
        <nav className="h-[calc(100vh-4rem)] space-y-1 overflow-y-auto p-3">{visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground", active && "bg-accent font-medium text-accent-foreground")}><Icon className="h-4 w-4" />{item.label}</Link>;
        })}</nav>
      </aside>
    </div> : null}
  </>;
}
