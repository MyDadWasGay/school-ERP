export function OrgSwitcher({ organizationName = "School organization" }: { organizationName?: string }) {
  return <div className="hidden min-w-0 lg:block">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Organization</p>
    <p className="max-w-48 truncate text-sm font-medium">{organizationName}</p>
  </div>;
}
