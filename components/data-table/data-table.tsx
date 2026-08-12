import type { ReactNode } from "react";
import { EmptyState } from "@/components/common/empty-state";

export type DataTableColumn<T> = { key: string; header: string; cell: (row: T) => ReactNode };
export function DataTable<T extends { id?: string }>({ columns, rows, emptyTitle, emptyDescription, emptyAction, ariaLabel, caption, filtered = false }: { columns: DataTableColumn<T>[]; rows: T[]; emptyTitle?: string; emptyDescription?: string; emptyAction?: ReactNode; ariaLabel?: string; caption?: string; filtered?: boolean }) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} filtered={filtered} />;
  const tableLabel = ariaLabel ?? "Data table";
  return <div role="region" aria-label={tableLabel} tabIndex={0} className="overflow-x-auto rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><table className="min-w-full text-left text-sm"><caption className="sr-only">{caption ?? tableLabel}</caption><thead className="bg-muted/60 text-xs uppercase text-muted-foreground"><tr>{columns.map((column) => <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{column.header}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row, index) => <tr key={row.id ?? index} className="hover:bg-muted/30">{columns.map((column) => <td key={column.key} className="whitespace-nowrap px-4 py-3">{column.cell(row)}</td>)}</tr>)}</tbody></table></div>;
}
