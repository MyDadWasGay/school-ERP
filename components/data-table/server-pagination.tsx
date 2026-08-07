import Link from "next/link";
import type { PageInfo } from "@/lib/utils/pagination";
import { cn } from "@/lib/utils/cn";

function pageHref(pathname: string, page: number, search?: string, extraParams?: Record<string, string | undefined>) {
  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("search", search);
  for (const [key, value] of Object.entries(extraParams ?? {})) {
    if (value) params.set(key, value);
  }
  return `${pathname}?${params.toString()}`;
}

export function ServerPagination({
  pageInfo,
  pathname,
  search,
  extraParams,
}: {
  pageInfo: PageInfo;
  pathname: string;
  search?: string;
  extraParams?: Record<string, string | undefined>;
}) {
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
    <span>{pageInfo.total.toLocaleString()} records · Page {pageInfo.page} of {Math.max(pageInfo.pageCount, 1)}</span>
    <div className="flex gap-2">
      <Link aria-disabled={pageInfo.page <= 1} tabIndex={pageInfo.page <= 1 ? -1 : undefined} href={pageInfo.page > 1 ? pageHref(pathname, pageInfo.page - 1, search, extraParams) : "#"} className={cn("inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent", pageInfo.page <= 1 && "pointer-events-none opacity-50")}>Previous</Link>
      <Link aria-disabled={pageInfo.page >= pageInfo.pageCount} tabIndex={pageInfo.page >= pageInfo.pageCount ? -1 : undefined} href={pageInfo.page < pageInfo.pageCount ? pageHref(pathname, pageInfo.page + 1, search, extraParams) : "#"} className={cn("inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent", pageInfo.page >= pageInfo.pageCount && "pointer-events-none opacity-50")}>Next</Link>
    </div>
  </div>;
}
