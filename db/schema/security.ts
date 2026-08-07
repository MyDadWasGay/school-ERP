import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn } from "./shared";

/** Global operational throttling state; keys are one-way hashes of route/client identifiers. */
export const rateLimitBuckets = sqliteTable("rate_limit_buckets", {
  id: idColumn("rate_limit"),
  keyHash: text("key_hash").notNull(),
  windowStart: integer("window_start", { mode: "timestamp" }).notNull(),
  requestCount: integer("request_count").notNull().default(0),
  ...auditColumns(),
}, (table) => [uniqueIndex("rate_limit_key_unique").on(table.keyHash), index("rate_limit_window_idx").on(table.windowStart)]);
