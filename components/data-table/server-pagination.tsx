import Link from "next/link";
import type { PageInfo } from "@/lib/utils/pagination";

function pageHref(pathname: string, page: number, search?: string, extraParams?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(extraParams ?? {})) {
    if (value) params.set(key, value);
  }
  if (search) params.set("search", search);
  params.set("page", String(page));
  return `${pathname}?${params.toString()}`;
}

export function ServerPagination({ pageInfo, pathname, search, extraParams }: { pageInfo: PageInfo; pathname: string; search?: string; extraParams?: Record<string, string | undefined> }) {
  const hasPrevious = pageInfo.page > 1;
  const hasNext = pageInfo.page < pageInfo.pageCount;
  return <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
    <span>{pageInfo.total.toLocaleString()} records · Page {pageInfo.page} of {Math.max(pageInfo.pageCount, 1)}</span>
    <div className="flex gap-2">
      {hasPrevious ? <Link aria-label="Previous page" href={pageHref(pathname, pageInfo.page - 1, search, extraParams)} className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent">Previous</Link> : <span aria-disabled="true" className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium opacity-50">Previous</span>}
      {hasNext ? <Link aria-label="Next page" href={pageHref(pathname, pageInfo.page + 1, search, extraParams)} className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent">Next</Link> : <span aria-disabled="true" className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium opacity-50">Next</span>}
    </div>
  </nav>;
}
