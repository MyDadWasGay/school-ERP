import { Button } from "@/components/ui/button";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: { label: string } }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">School ERP</p><h1 className="text-2xl font-bold tracking-tight">{title}</h1>{description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}</div>{action ? <Button>{action.label}</Button> : null}</div>;
}
