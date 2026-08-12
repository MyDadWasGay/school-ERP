"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, School, X } from "lucide-react";
import { isNavigationItemActive, navigationForRole, shouldPrefetchNavigation } from "@/config/nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { CurrentUser } from "@/lib/auth/types";

export function MobileSidebar({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const visibleGroups = navigationForRole(user.role)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || user.permissions.includes("*") || user.permissions.includes(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    const first = panel?.querySelector<HTMLElement>("button:not([disabled]), a[href]");
    first?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab" && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"));
        const firstItem = items[0];
        const lastItem = items.at(-1);
        if (!firstItem || !lastItem) return;
        if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
        if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [open]);

  return <>
    <Button ref={triggerRef} type="button" aria-label="Open navigation" aria-controls="mobile-navigation" aria-expanded={open} variant="ghost" size="sm" className="lg:hidden" onClick={() => setOpen(true)}><Menu aria-hidden="true" className="h-5 w-5" /></Button>
    {open ? <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Main navigation">
      <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <aside ref={panelRef} id="mobile-navigation" className="relative h-full w-[min(20rem,86vw)] bg-card shadow-xl">
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2"><School className="h-5 w-5 text-primary" /><span className="font-semibold">School ERP</span></div>
          <Button type="button" aria-label="Close navigation" variant="ghost" size="sm" onClick={() => setOpen(false)}><X aria-hidden="true" className="h-5 w-5" /></Button>
        </div>
        <nav aria-label="Main navigation" className="h-[calc(100vh-4rem)] space-y-5 overflow-y-auto p-3">
          {visibleGroups.map((group) => <section key={group.label}>
            <h2 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{group.label}</h2>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isNavigationItemActive(pathname, item);
                return <li key={item.href}><Link aria-current={active ? "page" : undefined} href={item.href} prefetch={shouldPrefetchNavigation(item.href)} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground", active && "bg-accent font-medium text-accent-foreground")}><Icon aria-hidden="true" className="h-4 w-4" />{item.label}</Link></li>;
              })}
            </ul>
          </section>)}
        </nav>
      </aside>
    </div> : null}
  </>;
}
