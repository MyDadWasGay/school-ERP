"use client";

import Link from "next/link";
import { Bell, Moon, Search, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CurrentUser } from "@/lib/auth/types";
import { hasPermission } from "@/lib/rbac/permissions";
import { createBrowserApiClient } from "@/lib/api-client/browser";
import { routeLabelForPath } from "@/config/route-registry";
import { CampusSwitcher } from "./campus-switcher";
import { MobileSidebar } from "./mobile-sidebar";
import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";

export function Header({ user }: { user: CurrentUser }) {
  const [dark, setDark] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number>();
  const pathname = usePathname();
  const api = useMemo(() => createBrowserApiClient(user.campusId), [user.campusId]);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("school-erp-theme", next ? "dark" : "light");
    setDark(next);
  }
  useEffect(() => {
    const saved = localStorage.getItem("school-erp-theme");
    const next = saved === "dark" || (saved !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
  }, []);
  useEffect(() => {
    if (!hasPermission(user, "communication:read")) return;
    let active = true;
    void api.getNotifications({ page: 1, pageSize: 100 }).then((result) => {
      if (active) setUnreadNotifications(result.rows.filter((notification) => !notification.readAt).length);
    }).catch(() => {
      if (active) setUnreadNotifications(undefined);
    });
    return () => { active = false; };
  }, [api, user]);
  const notificationLabel = unreadNotifications === undefined ? "School notices and notifications" : unreadNotifications > 0 ? `${unreadNotifications} unread school notification${unreadNotifications === 1 ? "" : "s"}` : "School notices and notifications (no unread notifications)";
  return <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b bg-card px-4 py-2 sm:px-6">
    <div className="flex min-w-0 items-center gap-3">
      <MobileSidebar user={user} />
      <OrgSwitcher organizationName={user.organizationName} />
      <CampusSwitcher campusId={user.campusId} campuses={user.availableCampuses ?? []} />
      <form action="/students" role="search" className="relative hidden xl:block">
        <label htmlFor="header-student-search" className="sr-only">Find a student by name or admission number</label>
        <Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input id="header-student-search" aria-label="Find a student by name or admission number" name="search" className="h-9 w-56 pl-9" placeholder="Find a student..." />
      </form>
      <span aria-live="polite" className="max-w-40 truncate text-sm font-medium text-muted-foreground md:hidden">{routeLabelForPath(pathname)}</span>
    </div>
    <div className="flex items-center gap-2">
      <Button aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} aria-pressed={dark} variant="ghost" size="sm" onClick={toggleTheme}>{dark ? <Sun aria-hidden="true" className="h-4 w-4" /> : <Moon aria-hidden="true" className="h-4 w-4" />}</Button>
      <Link aria-label={notificationLabel} title={notificationLabel} href="/communication/notifications" className="relative inline-flex h-9 items-center justify-center rounded-md px-3 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Bell aria-hidden="true" className="h-4 w-4" />{unreadNotifications ? <span aria-hidden="true" className="absolute right-1 top-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] leading-4 text-destructive-foreground">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span> : null}<span className="sr-only">Open notifications</span></Link>
      <div className="ml-2 hidden border-l pl-4 text-right sm:block"><p className="text-sm font-medium">{user.displayName}</p><p className="text-xs capitalize text-muted-foreground">{user.role.replaceAll("_", " ")}</p></div>
      <UserMenu name={user.displayName} />
    </div>
  </header>;
}
