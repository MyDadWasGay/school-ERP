"use client";

import Link from "next/link";
import { Bell, Moon, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CurrentUser } from "@/lib/auth/types";
import { CampusSwitcher } from "./campus-switcher";
import { MobileSidebar } from "./mobile-sidebar";
import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";

export function Header({ user }: { user: CurrentUser }) {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  function toggleTheme() {
    document.documentElement.classList.toggle("dark");
    setDark((value) => !value);
  }
  return <header className="flex min-h-16 items-center justify-between gap-3 border-b bg-card px-4 py-2 sm:px-6">
    <div className="flex min-w-0 items-center gap-3">
      <MobileSidebar user={user} />
      <OrgSwitcher organizationName={user.organizationName} />
      <CampusSwitcher campusId={user.campusId} campuses={user.availableCampuses ?? []} />
      <form action="/students" className="relative hidden md:block">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input name="search" className="h-9 w-56 pl-9" placeholder="Search students..." />
      </form>
      <span className="text-sm text-muted-foreground md:hidden">School ERP</span>
    </div>
    <div className="flex items-center gap-2">
      <Button aria-label="Toggle theme" variant="ghost" size="sm" onClick={toggleTheme}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
      <Link aria-label="Notifications" href="/communication/notices" className="inline-flex h-9 items-center justify-center rounded-md px-3 hover:bg-accent"><Bell className="h-4 w-4" /></Link>
      <div className="ml-2 hidden border-l pl-4 text-right sm:block"><p className="text-sm font-medium">{user.displayName}</p><p className="text-xs capitalize text-muted-foreground">{user.role.replaceAll("_", " ")}</p></div>
      <UserMenu name={user.displayName} />
    </div>
  </header>;
}
