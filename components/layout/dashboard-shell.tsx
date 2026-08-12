import type { ReactNode } from "react";
import type { CurrentUser } from "@/lib/auth/types";
import { AuthNavigationGuard } from "./auth-navigation-guard";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function DashboardShell({ user, children }: { user: CurrentUser; children: ReactNode }) { return <div className="flex min-h-screen bg-background"><AuthNavigationGuard /><Sidebar user={user} /><div className="flex min-w-0 flex-1 flex-col"><Header user={user} /><main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main></div></div>; }
