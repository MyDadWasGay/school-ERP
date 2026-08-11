import { and, count, desc, eq, like, ne, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { moduleRecords } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import { normalizePagination } from "@/lib/utils/pagination";
import { listCatalogRecordsPage } from "./catalog-records.service";

export async function listModuleRecordsPage(
  user: CurrentUser,
  route: string,
  input?: { search?: string; page?: number; pageSize?: number },
) {
  const catalogResult = await listCatalogRecordsPage(user, route, input);
  if (catalogResult) return catalogResult;
  const pagination = normalizePagination(input);
  const search = input?.search?.trim();
  const searchCondition = search
    ? or(like(moduleRecords.name, `%${search}%`), like(moduleRecords.note, `%${search}%`))
    : undefined;
  const where = and(
    eq(moduleRecords.organizationId, user.organizationId),
    user.campusId ? eq(moduleRecords.campusId, user.campusId) : undefined,
    eq(moduleRecords.route, route),
    ne(moduleRecords.status, "archived"),
    ["parent", "student", "teacher", "alumni"].includes(user.role) ? eq(moduleRecords.ownerUserId, user.id) : undefined,
    searchCondition,
  );
  const [rows, totals] = await Promise.all([
    getDb().select().from(moduleRecords).where(where).orderBy(desc(moduleRecords.createdAt))
      .limit(pagination.pageSize).offset(pagination.offset),
    getDb().select({ value: count() }).from(moduleRecords).where(where),
  ]);
  const total = totals[0]?.value ?? 0;
  return {
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      detail: row.note ?? `${row.entityType.replaceAll("_", " ")} record`,
      status: row.status,
    })),
    pageInfo: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      pageCount: Math.ceil(total / pagination.pageSize),
    },
  };
}
