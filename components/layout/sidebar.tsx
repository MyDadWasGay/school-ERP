"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { School } from "lucide-react";
import { navigationForRole } from "@/config/nav";
import type { CurrentUser } from "@/lib/auth/types";
import { cn } from "@/lib/utils/cn";

export function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const visibleItems = navigationForRole(user.role).filter((item) => !item.permission || user.permissions.includes("*") || user.permissions.includes(item.permission));
  return <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-card lg:block"><div className="flex h-16 items-center gap-2 border-b px-5"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><School className="h-5 w-5" /></div><div><p className="font-semibold">School ERP</p><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Operations OS</p></div></div><nav className="h-[calc(100vh-4rem)] space-y-1 overflow-y-auto p-3">{visibleItems.map((item) => { const Icon = item.icon; const active = pathname === item.href || pathname.startsWith(`${item.href}/`); return <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground", active && "bg-accent font-medium text-accent-foreground") }><Icon className="h-4 w-4" />{item.label}</Link>; })}</nav></aside>;
}
