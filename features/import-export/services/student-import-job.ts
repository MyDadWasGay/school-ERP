import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getUserByFirebaseUid } from "@/lib/auth/guards";
import { decryptSecret } from "@/lib/security/secret-box";
import type { JobRecord } from "@/lib/jobs/job-store";
import { runStudentImport } from "./student-import.service";

type StudentImportJobPayload = {
  encryptedCsv: string;
  importJobId: string;
  firebaseUid: string;
  organizationId: string;
  campusId: string | null;
};

export async function runQueuedStudentImport(job: JobRecord) {
  const payload = JSON.parse(job.payloadJson) as Partial<StudentImportJobPayload>;
  if (!payload.encryptedCsv || !payload.importJobId || !payload.firebaseUid || !payload.organizationId) {
    throw new Error("Student import job payload is incomplete.");
  }
  if (payload.organizationId !== job.organizationId) {
    throw new Error("Student import job tenant does not match its payload.");
  }
  const userRow = await getDb().query.users.findFirst({ where: and(
    eq(users.firebaseUid, payload.firebaseUid),
    eq(users.organizationId, job.organizationId),
  ) });
  if (!userRow) throw new Error("The importing user no longer exists in this organization.");
  const user = await getUserByFirebaseUid(payload.firebaseUid, payload.campusId ?? undefined);
  if (!user || user.organizationId !== job.organizationId) throw new Error("The importing user is no longer active.");
  await runStudentImport(user, decryptSecret(payload.encryptedCsv), { queueLarge: false, existingImportJobId: payload.importJobId });
}
