import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

export async function registerOpenApi(app: FastifyInstance) {
  const publicUrl = process.env.API_PUBLIC_URL?.trim();
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "School ERP Shared API",
        description:
          "The versioned backend contract shared by the Next.js web frontend and Flutter.",
        version: "1.0.0",
      },
      ...(publicUrl ? { servers: [{ url: publicUrl }] } : {}),
      tags: [
        { name: "health", description: "Render and operational health probes" },
        { name: "authentication", description: "Firebase and API web-session authentication" },
        {
          name: "identity",
          description: "Authenticated user and campus context",
        },
        { name: "meta", description: "API compatibility metadata" },
        { name: "domain", description: "Tenant-scoped ERP workflows" },
        { name: "operational", description: "Imports, exports, jobs, webhooks and public CMS operations" },
      ],
      components: {
        securitySchemes: {
          firebaseBearer: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "Firebase ID token",
            description:
              "A fresh Firebase ID token. Never send a Firebase UID or tenant ID as authority.",
          },
          apiSessionCookie: {
            type: "apiKey",
            in: "cookie",
            name: "school_erp_session",
            description:
              "Secure API-owned web session cookie; state-changing requests also require X-CSRF-Token.",
          },
        },
      },
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/documentation",
    staticCSP: true,
    uiConfig: { docExpansion: "list", deepLinking: true },
  });
}
