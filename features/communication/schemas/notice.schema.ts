import { z } from "zod";
export const noticeSchema = z.object({ title: z.string().trim().min(2).max(180), body: z.string().trim().min(2).max(10_000), audience: z.enum(["all", "students", "parents", "teachers", "staff"]) });
export const noticeTransitionSchema = z.object({ id: z.string().min(1), status: z.enum(["published", "archived"]) });
export type NoticeInput = z.infer<typeof noticeSchema>;
