import type { CurrentUser } from "../../lib/auth/types";
import type { PlatformAdmin } from "../../lib/auth/platform-context";

declare module "fastify" {
  interface FastifyRequest {
    /** Resolved only by the API Bearer-auth hook; never accept this from a client payload. */
    apiUser?: CurrentUser;
    /** Resolved only for platform-admin routes; never accepted from a client payload. */
    apiPlatformAdmin?: PlatformAdmin;
    /** True when the request authenticated through the API-owned cookie. */
    apiCookieAuthenticated?: boolean;
    /** Captured before JSON parsing so signed provider webhooks can verify the exact payload. */
    rawBody?: string;
  }
}
