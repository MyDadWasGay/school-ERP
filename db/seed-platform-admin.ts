import { loadDatabaseEnv } from "./load-env";
import { getDb } from "./client";
import { platformAdmins } from "./schema";
import { getFirebaseAdminAuth } from "@/lib/auth/firebase-admin-core";
import { createId } from "@/lib/utils/ids";

loadDatabaseEnv();

async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  const displayName = process.env.PLATFORM_ADMIN_NAME?.trim() || "Platform Administrator";
  if (!email || !password) throw new Error("Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD before running this command.");
  if (password.length < 12) throw new Error("PLATFORM_ADMIN_PASSWORD must be at least 12 characters.");
  if (!process.env.TURSO_DATABASE_URL?.trim()) throw new Error("TURSO_DATABASE_URL is required before creating a platform administrator.");
  const auth = getFirebaseAdminAuth();
  if (!auth) throw new Error("Firebase Admin is not configured.");
  const db = getDb();
  const existing = await db.query.platformAdmins.findFirst({ where: (table, { eq }) => eq(table.email, email) });
  if (existing) {
    console.log(`Platform administrator already exists for ${email}. No changes were made.`);
    return;
  }
  const firebaseUser = await auth.createUser({ email, password, displayName, emailVerified: true });
  try {
    await db.insert(platformAdmins).values({
      id: createId("platform_admin"),
      firebaseUid: firebaseUser.uid,
      email,
      displayName,
      emailVerified: true,
      createdBy: "platform-setup",
      updatedBy: "platform-setup",
    });
  } catch (error) {
    await auth.deleteUser(firebaseUser.uid).catch(() => undefined);
    throw error;
  }
  console.log(`Platform administrator created for ${email}. The password was not stored in the ERP database.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
