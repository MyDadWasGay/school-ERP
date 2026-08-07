import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/config/constants";

export function normalizePagination(input?: { page?: number; pageSize?: number }) {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input?.pageSize ?? DEFAULT_PAGE_SIZE));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export type PageInfo = { page: number; pageSize: number; total: number; pageCount: number };
