import "server-only";
import { SchoolErpApiError } from "@/lib/api-client/client";
import { createServerApiClient } from "@/lib/api-client/server";
import { AppError } from "@/lib/errors/app-error";
export {
  type PlatformAdmin,
} from "./platform-context";

export async function getCurrentPlatformAdmin() {
  try {
    const api = await createServerApiClient();
    const result = await api.call<{
      id: string;
      email: string;
      displayName: string;
      emailVerified: boolean;
      role: "platform_admin";
    }>("GET", "/api/v1/platform/me");
    return { ...result.data, firebaseUid: "" };
  } catch (error) {
    if (error instanceof SchoolErpApiError && [401, 403].includes(error.status)) return null;
    return null;
  }
}

export async function requirePlatformAdmin() {
  const admin = await getCurrentPlatformAdmin();
  if (!admin) throw new AppError("FORBIDDEN", "Platform administrator access is required.", 403);
  return admin;
}
