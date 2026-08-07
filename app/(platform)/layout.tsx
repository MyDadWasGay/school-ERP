import Link from "next/link";
import type { ReactNode } from "react";
import { UserMenu } from "@/components/layout/user-menu";
import { getCurrentPlatformAdmin } from "@/lib/auth/platform";
import { redirect } from "next/navigation";

export default async function PlatformLayout({ children }: Readonly<{ children: ReactNode }>) {
  const admin = await getCurrentPlatformAdmin();
  if (!admin) redirect("/login?next=/platform");
  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <header className="border-b border-slate-800 bg-slate-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8"><Link href="/platform" className="font-semibold tracking-tight">School ERP <span className="text-xs font-normal text-cyan-300">PLATFORM</span></Link><nav className="hidden gap-5 text-sm text-slate-400 md:flex"><Link href="/platform" className="hover:text-white">Overview</Link><Link href="/platform#schools" className="hover:text-white">Schools</Link><Link href="/platform/audit-logs" className="hover:text-white">Audit log</Link></nav></div>
        <div className="flex items-center gap-3"><span className="hidden text-sm text-slate-400 sm:inline">{admin.email}</span><UserMenu name={admin.displayName} /></div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
  </div>;
}
