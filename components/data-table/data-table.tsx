import type { ReactNode } from "react";
import { EmptyState } from "@/components/common/empty-state";

export type DataTableColumn<T> = { key: string; header: string; cell: (row: T) => ReactNode };
export function DataTable<T extends { id?: string }>({ columns, rows, emptyTitle }: { columns: DataTableColumn<T>[]; rows: T[]; emptyTitle?: string }) { if (rows.length === 0) return <EmptyState title={emptyTitle} />; return <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><thead className="bg-muted/60 text-xs uppercase text-muted-foreground"><tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-4 py-3 font-medium">{column.header}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row, index) => <tr key={row.id ?? index} className="hover:bg-muted/30">{columns.map((column) => <td key={column.key} className="whitespace-nowrap px-4 py-3">{column.cell(row)}</td>)}</tr>)}</tbody></table></div>; }
