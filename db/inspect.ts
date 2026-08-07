import { createClient } from "@libsql/client";
import { loadDatabaseEnv } from "./load-env";

loadDatabaseEnv();

const url = process.env.TURSO_DATABASE_URL?.trim() ?? "";
if (!url) throw new Error("TURSO_DATABASE_URL is required before inspecting the database.");
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!url.startsWith("file:") && !authToken) throw new Error("TURSO_AUTH_TOKEN is required for a remote Turso database.");
const client = createClient({ url, authToken });

async function readRows(sql: string) {
  try {
    return (await client.execute(sql)).rows;
  } catch (error) {
    if (String(error).includes("no such table")) return [];
    throw error;
  }
}

async function main() {
  const tables = await readRows("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const migrations = await readRows("SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at");
  const organizations = await readRows("SELECT COUNT(*) AS count FROM organizations");
  const users = await readRows("SELECT COUNT(*) AS count FROM users");
  console.log(`Database target: ${url.startsWith("file:") ? "local SQLite" : "Turso/libSQL remote"}`);
  console.log(`Tables: ${tables.length}`);
  console.log(`Migrations applied: ${migrations.length}`);
  console.log(`Organizations: ${String(organizations[0]?.count ?? 0)}`);
  console.log(`Users: ${String(users[0]?.count ?? 0)}`);
  if (tables.length === 0) console.log("No application tables found. Run npm run db:migrate against this target.");
}

main().catch((error) => {
  console.error("Database inspection failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
