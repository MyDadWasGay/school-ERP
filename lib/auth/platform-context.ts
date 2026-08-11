import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { platformAdmins } from "@/db/schema";
import { PLATFORM_ADMIN_ROLE } from "@/config/constants";

/**
 * Framework-neutral platform identity lookup shared by Fastify and the
 * transitional Next.js platform session adapter.
 */
export type PlatformAdmin = {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  role: typeof PLATFORM_ADMIN_ROLE;
};

export async function getPlatformAdminByFirebaseUid(
  uid: string,
): Promise<PlatformAdmin | null> {
  const row = await getDb().query.platformAdmins.findFirst({
    where: eq(platformAdmins.firebaseUid, uid),
  });
  if (!row || row.status !== "active") return null;
  return {
    id: row.id,
    firebaseUid: row.firebaseUid,
    email: row.email,
    displayName: row.displayName,
    emailVerified: row.emailVerified,
    role: PLATFORM_ADMIN_ROLE,
  };
}
