import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { notices } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type { NoticeInput } from "../schemas/notice.schema";

export async function listNotices(user: CurrentUser) { return getDb().select().from(notices).where(and(eq(notices.organizationId, user.organizationId), user.campusId ? eq(notices.campusId, user.campusId) : undefined, ne(notices.status, "archived"))).orderBy(desc(notices.createdAt)).limit(300); }
export async function createNotice(user: CurrentUser, input: NoticeInput) { const [row] = await getDb().insert(notices).values({ id: createId("notice"), organizationId: user.organizationId, campusId: user.campusId, title: input.title, body: input.body, audience: input.audience, status: "draft", createdBy: user.id, updatedBy: user.id }).returning(); if (!row) throw new AppError("DATABASE_ERROR", "Unable to create notice.", 500); return row; }
export async function transitionNotice(user: CurrentUser, id: string, status: "published" | "archived") { const existing = await getDb().query.notices.findFirst({ where: and(eq(notices.id, id), eq(notices.organizationId, user.organizationId), user.campusId ? eq(notices.campusId, user.campusId) : undefined, ne(notices.status, "archived")) }); if (!existing) throw new AppError("NOT_FOUND", "Notice not found in your scope.", 404); if (status === "published" && existing.status !== "draft") throw new AppError("CONFLICT", "Only draft notices can be published.", 409); const [row] = await getDb().update(notices).set({ status, publishedAt: status === "published" ? new Date() : existing.publishedAt, updatedAt: new Date(), updatedBy: user.id }).where(and(eq(notices.id, id), eq(notices.organizationId, user.organizationId), eq(notices.status, existing.status))).returning(); if (!row) throw new AppError("CONFLICT", "Notice changed before transition.", 409); return row; }
