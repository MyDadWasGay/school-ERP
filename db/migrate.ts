import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { loadDatabaseEnv } from "./load-env";

loadDatabaseEnv();

const url = process.env.TURSO_DATABASE_URL?.trim();
if (!url) throw new Error("TURSO_DATABASE_URL is required before applying migrations.");
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!url.startsWith("file:") && !authToken) throw new Error("TURSO_AUTH_TOKEN is required for a remote Turso database.");
const client = createClient({ url, authToken });

const target = url;

async function main() {
  console.log(`Applying migrations to ${target.startsWith("file:") ? "local SQLite" : "Turso/libSQL remote"} (${target.replace(/\/\/([^/@]+)(?=@)/, "//***@")}).`);
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
