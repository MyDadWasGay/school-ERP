import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!database) {
    const url = process.env.TURSO_DATABASE_URL?.trim();
    if (!url) throw new Error("TURSO_DATABASE_URL is required before the application can access the database.");
    const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
    if (!url.startsWith("file:") && !authToken) throw new Error("TURSO_AUTH_TOKEN is required for a remote Turso database.");
    const client = createClient({
      url,
      authToken,
    });
    database = drizzle(client, { schema });
  }
  return database;
}
