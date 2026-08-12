import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";

export function EntityHeader({
  name,
  identifier,
  description,
  status,
  meta,
  backHref,
  backLabel = "Back to list",
  action,
}: {
  name: string;
  identifier?: string;
  description?: string;
  status?: string;
  meta?: ReactNode;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 space-y-3">
      {backHref ? <ButtonLink href={backHref} variant="ghost" size="sm" className="-ml-3">← {backLabel}</ButtonLink> : null}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-words text-2xl font-bold tracking-tight">{name}</h1>
            {status ? <StatusBadge status={status} /> : null}
          </div>
          {identifier ? <p className="mt-1 font-mono text-xs text-muted-foreground">{identifier}</p> : null}
          {description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
          {meta ? <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">{meta}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

export function EntityTabs({
  tabs,
  activeTab,
}: {
  tabs: Array<{ label: string; href: string; key?: string; visible?: boolean }>;
  activeTab: string;
}) {
  return (
    <nav aria-label="Record sections" className="mb-6 overflow-x-auto border-b">
      <div className="flex min-w-max gap-1">
        {tabs.filter((tab) => tab.visible !== false).map((tab) => {
          const active = activeTab === (tab.key ?? tab.label);
          return <a key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={`rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"}`}>
            {tab.label}
          </a>;
        })}
      </div>
    </nav>
  );
}
