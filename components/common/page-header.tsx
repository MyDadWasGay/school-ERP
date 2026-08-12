import { ButtonLink } from "@/components/ui/button";

export function PageHeader({ title, description, action, eyebrow }: { title: string; description?: string; action?: { label: string; href: string }; eyebrow?: string }) {
  return <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p> : null}
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
    </div>
    {action ? <ButtonLink href={action.href}>{action.label}</ButtonLink> : null}
  </header>;
}
