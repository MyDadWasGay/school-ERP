import type { ReactNode } from "react";
import type { CurrentUser } from "@/lib/auth/types";
import { AuthNavigationGuard } from "./auth-navigation-guard";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Breadcrumbs } from "@/components/common/breadcrumbs";

export function DashboardShell({ user, children }: { user: CurrentUser; children: ReactNode }) { return <div className="flex min-h-screen bg-background"><AuthNavigationGuard /><a href="#main-content" className="fixed left-3 top-3 z-[60] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Skip to main content</a><Sidebar user={user} /><div className="flex min-w-0 flex-1 flex-col"><Header user={user} /><main id="main-content" aria-label="Main content" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><Breadcrumbs />{children}</main></div></div>; }
