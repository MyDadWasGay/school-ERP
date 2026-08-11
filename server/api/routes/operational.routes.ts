import { timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { bootstrapSchema } from "../../../features/foundation/schemas/bootstrap.schema";
import { bootstrapSchool } from "../../../features/foundation/services/bootstrap.service";
import { getCertificateByVerificationCode } from "../../../features/students/services/students.service";
import { listAuditLogs } from "../../../features/audit/services/audit.service";
import {
  getStudentImportErrors,
  listStudentImportJobs,
  runStudentImport,
} from "../../../features/import-export/services/student-import.service";
import { runEmployeeImport } from "../../../features/import-export/services/employee-import.service";
import { receiveWebhook } from "../../../features/integrations/services/integration.service";
import { receiveRazorpayWebhook } from "../../../features/integrations/services/razorpay-webhook.service";
import {
  getPublicCmsForm,
  getPublicCmsPage,
  submitPublicCmsForm,
} from "../../../features/community/services/community.service";
import { getTransportManifest } from "../../../features/transport/services/transport.service";
import { getDashboardMetrics, getDashboardTrends } from "../../../features/reports/services/dashboard.service";
import { reportExportSchema, reportQuerySchema } from "../../../features/reports/schemas/report.schema";
import { getReportRows } from "../../../features/reports/services/report.service";
import { toCsv } from "../../../lib/exports/csv";
import { exportWorkbook } from "../../../lib/exports/excel";
import { renderPdf } from "../../../lib/exports/pdf";
import { writeAuditLog } from "../../../lib/audit/audit-log";
import { AppError } from "../../../lib/errors/app-error";
import { createId } from "../../../lib/utils/ids";
import { runNextJob } from "../../../lib/jobs/job-runner";
import { getFirebaseAdminAuth } from "../../../lib/auth/firebase-admin-core";
import { invitationAcceptSchema } from "../../../features/users/schemas/invitation.schema";
import { provisionUserSchema } from "../../../features/users/schemas/provision.schema";
import {
  acceptInvitation,
  validateInvitation,
} from "../../../features/users/services/invitation.service";
import { provisionUser } from "../../../features/users/services/provision.service";
import {
  authenticateApiRequest,
  requireApiCsrf,
  requireApiPermission,
} from "../auth/bearer-auth";
import { apiSuccess } from "./route-utils";

const publicOperationSchema = {
  tags: ["operational"],
} as const;

const publicFormPayloadSchema = z.record(
  z.union([z.string().max(2_000), z.number(), z.boolean(), z.null()]),
);

function headerValue(request: FastifyRequest, name: string) {
  const value = request.headers[name];
  return Array.isArray(value) ? undefined : value?.trim();
}

function requestBodyText(request: FastifyRequest) {
  if (typeof request.body === "string") return request.body;
  return request.rawBody ?? "";
}

function sendDownload(
  reply: FastifyReply,
  body: string | Buffer | Uint8Array,
  contentType: string,
  filename: string,
) {
  return reply
    .type(contentType)
    .header("Content-Disposition", `attachment; filename="${filename}"`)
    .header("Cache-Control", "private, no-store")
    .send(body);
}

function requireInternalJobSecret(request: FastifyRequest) {
  const expected = process.env.INTERNAL_JOB_SECRET?.trim();
  const received = headerValue(request, "x-internal-job-secret");
  if (!expected || !received) {
    throw new AppError("UNAUTHENTICATED", "The internal job credential is required.", 401);
  }
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  if (
    expectedBytes.length !== receivedBytes.length ||
    !timingSafeEqual(expectedBytes, receivedBytes)
  ) {
    throw new AppError("UNAUTHENTICATED", "The internal job credential is invalid.", 401);
  }
}

export const operationalRoutes: FastifyPluginAsync = async (app) => {
  app.get("/audit-logs", { preHandler: authenticateApiRequest, schema: { ...publicOperationSchema, summary: "List tenant-scoped audit logs" } }, async (request) => {
    const user = requireApiPermission(request, "audit_logs:read");
    return apiSuccess(request, await listAuditLogs(user));
  });

  app.get("/dashboard", { preHandler: authenticateApiRequest, schema: { ...publicOperationSchema, summary: "Read the scoped management dashboard" } }, async (request) => {
    const user = requireApiPermission(request, "analytics:read");
    const [metrics, trends] = await Promise.all([getDashboardMetrics(user), getDashboardTrends(user)]);
    return { data: { metrics, trends }, meta: { requestId: request.id } };
  });

  app.get<{ Querystring: { report?: string; limit?: number } }>("/reports", { preHandler: authenticateApiRequest, schema: { ...publicOperationSchema, summary: "Read a scoped operational report" } }, async (request) => {
    const user = requireApiPermission(request, "reports:read");
    const parsed = reportQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "The report query is invalid.", 422, parsed.error.flatten().fieldErrors);
    return apiSuccess(request, await getReportRows(user, parsed.data));
  });

  app.get<{ Querystring: { code?: string } }>(
    "/certificates/verify",
    {
      schema: {
        ...publicOperationSchema,
        summary: "Verify a published certificate without exposing private student data",
        querystring: {
          type: "object",
          required: ["code"],
          additionalProperties: false,
          properties: { code: { type: "string", minLength: 10, maxLength: 120 } },
        },
      },
    },
    async (request) => {
      const code = request.query.code?.trim() ?? "";
      if (code.length < 10 || code.length > 120)
        throw new AppError("VALIDATION_ERROR", "Certificate code is invalid.", 422);
      const certificate = await getCertificateByVerificationCode(code);
      if (!certificate) throw new AppError("NOT_FOUND", "Certificate not found.", 404);
      const student = certificate.snapshot.student;
      const studentRecord = student && typeof student === "object"
        ? student as Record<string, unknown>
        : {};
      return {
        data: {
          valid: true,
          certificateNumber: certificate.certificateNumber,
          certificateType: certificate.certificateType,
          issuedAt: certificate.issuedAt.toISOString(),
          studentName: [studentRecord.firstName, studentRecord.lastName]
            .filter((value): value is string => typeof value === "string" && value.length > 0)
            .join(" "),
          admissionNumber: typeof studentRecord.admissionNumber === "string"
            ? studentRecord.admissionNumber
            : null,
        },
        meta: { requestId: request.id },
      };
    },
  );

  app.get<{ Querystring: Record<string, string | undefined> }>(
    "/exports",
    {
      preHandler: authenticateApiRequest,
      schema: {
        ...publicOperationSchema,
        summary: "Export a bounded authorized report",
        security: [{ firebaseBearer: [] }, { apiSessionCookie: [] }],
      },
    },
    async (request, reply) => {
      const user = requireApiPermission(request, "reports:export");
      const parsed = reportExportSchema.safeParse(request.query);
      if (!parsed.success)
        throw new AppError("VALIDATION_ERROR", "Unsupported report or export format.", 422, parsed.error.flatten().fieldErrors);
      const report = await getReportRows(user, parsed.data);
      const rows = report.rows as Record<string, unknown>[];
      await writeAuditLog(user, {
        action: "export",
        module: "reports",
        entityType: `${parsed.data.report}_report`,
        metadata: { report: parsed.data.report, format: parsed.data.format, rowCount: rows.length },
      });
      if (parsed.data.format === "csv")
        return sendDownload(reply, toCsv(rows), "text/csv; charset=utf-8", `${parsed.data.report}-report.csv`);
      if (parsed.data.format === "xlsx")
        return sendDownload(reply, exportWorkbook(rows, report.definition.label), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", `${parsed.data.report}-report.xlsx`);
      if (parsed.data.format === "pdf")
        return sendDownload(reply, Buffer.from(renderPdf(report.definition.label, rows)), "application/pdf", `${parsed.data.report}-report.pdf`);
      return sendDownload(reply, report.definition.label, "text/html; charset=utf-8", `${parsed.data.report}-report.html`);
    },
  );

  app.get(
    "/imports/students",
    {
      preHandler: authenticateApiRequest,
      schema: { ...publicOperationSchema, summary: "List scoped student import jobs", security: [{ firebaseBearer: [] }, { apiSessionCookie: [] }] },
    },
    async (request) => {
      const user = requireApiPermission(request, "students:read");
      return apiSuccess(request, await listStudentImportJobs(user));
    },
  );

  app.get<{ Querystring: { routeId?: string } }>(
    "/transport/manifest",
    {
      preHandler: authenticateApiRequest,
      schema: {
        ...publicOperationSchema,
        summary: "Export an authorized transport manifest",
        security: [{ firebaseBearer: [] }, { apiSessionCookie: [] }],
      },
    },
    async (request, reply) => {
      const user = requireApiPermission(request, "transport:export");
      const routeId = request.query.routeId?.trim();
      if (!routeId) throw new AppError("VALIDATION_ERROR", "routeId is required.", 422);
      const manifest = await getTransportManifest(user, routeId);
      const rows = manifest.rows.map((row) => ({
        route: row.route,
        student: row.student,
        admissionNumber: row.admissionNumber,
        stop: row.stop,
      }));
      await writeAuditLog(user, {
        action: "export",
        module: "transport",
        entityType: "route_manifest",
        entityId: routeId,
        campusId: user.campusId,
        metadata: { rowCount: rows.length },
      });
      return sendDownload(reply, toCsv(rows), "text/csv; charset=utf-8", `transport-manifest-${routeId}.csv`);
    },
  );

  app.post(
    "/imports/students",
    {
      preHandler: [authenticateApiRequest, requireApiCsrf],
      schema: { ...publicOperationSchema, summary: "Queue or run a bounded student CSV import", security: [{ firebaseBearer: [] }, { apiSessionCookie: [] }] },
    },
    async (request, reply) => {
      const user = requireApiPermission(request, "students:import");
      const csv = requestBodyText(request);
      if (!csv.trim() || csv.length > 5_000_000)
        throw new AppError("VALIDATION_ERROR", "A CSV body between 1 byte and 5 MB is required.", 422);
      const result = await runStudentImport(user, csv, {
        idempotencyKey: headerValue(request, "x-idempotency-key"),
      });
      return reply.code(result.queued ? 202 : 201).send({
        data: {
          queued: result.queued,
          jobId: result.job.id,
          importJobId: result.importJobId,
          importedRows: result.importedRows,
          errorRows: result.errors.length,
          errors: result.errors.slice(0, 50),
        },
        meta: { requestId: request.id },
      });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/imports/students/:id/errors",
    {
      preHandler: authenticateApiRequest,
      schema: { ...publicOperationSchema, summary: "Export scoped student import errors", security: [{ firebaseBearer: [] }, { apiSessionCookie: [] }] },
    },
    async (request, reply) => {
      const user = requireApiPermission(request, "students:import");
      const job = await getStudentImportErrors(user, request.params.id);
      const rows = job.errors.map((error) => ({
        row: error.row,
        fields: Object.entries(error.fields)
          .map(([field, messages]) => `${field}: ${messages.join("; ")}`)
          .join(" | "),
      }));
      await writeAuditLog(user, {
        action: "export",
        module: "students",
        entityType: "student_import_errors",
        entityId: job.id,
        campusId: job.campusId,
        metadata: { rowCount: rows.length },
      });
      return sendDownload(reply, toCsv(rows), "text/csv; charset=utf-8", `student-import-${job.id}-errors.csv`);
    },
  );

  app.post(
    "/imports/employees",
    {
      preHandler: [authenticateApiRequest, requireApiCsrf],
      schema: { ...publicOperationSchema, summary: "Run a bounded employee CSV import", security: [{ firebaseBearer: [] }, { apiSessionCookie: [] }] },
    },
    async (request, reply) => {
      const user = requireApiPermission(request, "hr:import");
      const csv = requestBodyText(request);
      if (!csv.trim() || csv.length > 5_000_000)
        throw new AppError("VALIDATION_ERROR", "A CSV body between 1 byte and 5 MB is required.", 422);
      const result = await runEmployeeImport(user, csv, headerValue(request, "x-idempotency-key"));
      return reply.code(201).send({
        data: {
          jobId: result.job.id,
          importedRows: result.importedRows,
          errorRows: result.errors.length,
          errors: result.errors.slice(0, 50),
          idempotent: result.idempotent,
        },
        meta: { requestId: request.id },
      });
    },
  );

  app.post(
    "/internal/jobs/run",
    { schema: { ...publicOperationSchema, summary: "Run a bounded internal job batch" } },
    async (request) => {
      requireInternalJobSecret(request);
      const body = request.body && typeof request.body === "object"
        ? request.body as { limit?: unknown }
        : {};
      const limit = typeof body.limit === "number" && Number.isFinite(body.limit)
        ? Math.min(10, Math.max(1, Math.floor(body.limit)))
        : 1;
      const workerId = createId("worker");
      const results = [];
      for (let index = 0; index < limit; index += 1) {
        const result = await runNextJob(workerId);
        results.push(result);
        if (result.status === "idle") break;
      }
      return { data: { workerId, results }, meta: { requestId: request.id } };
    },
  );

  app.post<{ Params: { provider: string } }>(
    "/integrations/webhooks/:provider",
    { schema: { ...publicOperationSchema, summary: "Receive a signed integration webhook" } },
    async (request) => {
      const provider = request.params.provider.trim();
      if (provider.toLowerCase() === "razorpay")
        throw new AppError("NOT_FOUND", "Use the dedicated Razorpay webhook endpoint.", 404);
      const organizationId = headerValue(request, "x-organization-id");
      const eventId = headerValue(request, "x-webhook-event-id");
      const signature = headerValue(request, "x-webhook-signature");
      if (!organizationId || !eventId || !signature || !/^[a-z0-9_.-]{2,80}$/i.test(provider))
        throw new AppError("VALIDATION_ERROR", "Webhook identity headers are required.", 422);
      const body = requestBodyText(request);
      if (!body || body.length > 1_000_000)
        throw new AppError("VALIDATION_ERROR", "Webhook payload is empty or too large.", 422);
      const result = await receiveWebhook({
        organizationId,
        campusId: headerValue(request, "x-campus-id"),
        provider,
        eventId,
        eventType: headerValue(request, "x-webhook-event-type")?.slice(0, 120) || "unknown",
        signature,
        body,
      });
      return {
        data: { duplicate: result.duplicate, accepted: result.accepted, eventId: result.id },
        meta: { requestId: request.id },
      };
    },
  );

  app.post(
    "/attendance/webhooks/hardware",
    { schema: { ...publicOperationSchema, summary: "Receive a signed generic hardware-attendance webhook" } },
    async (request) => {
      const organizationId = headerValue(request, "x-organization-id");
      const eventId = headerValue(request, "x-webhook-event-id");
      const signature = headerValue(request, "x-webhook-signature");
      if (!organizationId || !eventId || !signature)
        throw new AppError("VALIDATION_ERROR", "Hardware webhook identity headers are required.", 422);
      const body = requestBodyText(request);
      if (!body || body.length > 1_000_000)
        throw new AppError("VALIDATION_ERROR", "Hardware webhook payload is empty or too large.", 422);
      const result = await receiveWebhook({
        organizationId,
        campusId: headerValue(request, "x-campus-id"),
        provider: "hardware-attendance",
        eventId,
        eventType: headerValue(request, "x-webhook-event-type")?.slice(0, 120) || "attendance",
        signature,
        body,
      });
      return { data: { duplicate: result.duplicate, accepted: result.accepted, eventId: result.id }, meta: { requestId: request.id } };
    },
  );

  app.post<{ Params: { organizationId: string } }>(
    "/integrations/webhooks/razorpay/:organizationId",
    { schema: { ...publicOperationSchema, summary: "Receive a verified Razorpay webhook" } },
    async (request) => {
      const organizationId = request.params.organizationId.trim();
      const eventId = headerValue(request, "x-razorpay-event-id");
      const signature = headerValue(request, "x-razorpay-signature");
      if (!/^[A-Za-z0-9_-]{3,160}$/.test(organizationId) || !eventId || eventId.length > 160 || !signature || !/^[a-fA-F0-9]{64}$/.test(signature))
        throw new AppError("VALIDATION_ERROR", "Razorpay webhook identity headers are invalid.", 422);
      const rawBody = requestBodyText(request);
      if (!rawBody || rawBody.length > 1_000_000)
        throw new AppError("VALIDATION_ERROR", "Webhook payload is empty or too large.", 422);
      const result = await receiveRazorpayWebhook({ organizationId, eventId, signature, rawBody });
      return {
        data: { duplicate: result.duplicate, accepted: true, eventId: result.id },
        meta: { requestId: request.id },
      };
    },
  );

  app.get<{ Params: { slug: string }; Querystring: { organization?: string } }>(
    "/public/cms/pages/:slug",
    { schema: { ...publicOperationSchema, summary: "Read a published public CMS page" } },
    async (request) => {
      const organization = request.query.organization?.trim();
      const slug = request.params.slug.trim();
      if (!organization || !/^[a-z0-9-]{2,120}$/i.test(organization))
        throw new AppError("VALIDATION_ERROR", "An organization slug is required.", 422);
      const result = await getPublicCmsPage(organization, slug);
      if (!result) throw new AppError("NOT_FOUND", "Published page not found.", 404);
      let seo: unknown = null;
      try { seo = result.page.seoJson ? JSON.parse(result.page.seoJson) : null; } catch { seo = null; }
      return {
        data: { slug: result.page.slug, title: result.page.title, body: result.page.body, seo, organization: result.organizationName, timezone: result.timezone },
        meta: { requestId: request.id },
      };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/public/cms/forms/:id",
    { schema: { ...publicOperationSchema, summary: "Read a published public CMS form" } },
    async (request) => {
      const form = await getPublicCmsForm(request.params.id.trim());
      if (!form) throw new AppError("NOT_FOUND", "Published form not found.", 404);
      return { data: { id: form.id, name: form.name, fields: form.fields }, meta: { requestId: request.id } };
    },
  );

  app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/public/cms/forms/:id/submissions",
    { schema: { ...publicOperationSchema, summary: "Submit a published public CMS form" } },
    async (request, reply) => {
      if (request.body && "website" in request.body)
        throw new AppError("VALIDATION_ERROR", "Form submission rejected.", 422);
      const payload = publicFormPayloadSchema.safeParse(request.body);
      if (!payload.success)
        throw new AppError("VALIDATION_ERROR", "Form submission fields are invalid.", 422, payload.error.flatten().fieldErrors);
      const result = await submitPublicCmsForm(request.params.id.trim(), payload.data);
      return reply.code(201).send({ data: result, meta: { requestId: request.id } });
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/setup/bootstrap",
    { schema: { ...publicOperationSchema, summary: "Bootstrap a new school from a verified Firebase identity" } },
    async (request, reply) => {
      const auth = getFirebaseAdminAuth();
      if (!auth) throw new AppError("CONFIGURATION_ERROR", "Firebase Admin is not configured on the server.", 503);
      const body = request.body ?? {};
      const idToken = typeof body === "object" && typeof body.idToken === "string" ? body.idToken : "";
      if (!idToken) throw new AppError("VALIDATION_ERROR", "Missing Firebase token. Please try again.", 422);
      const parsed = bootstrapSchema.safeParse(body);
      if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Check your school details.", 422);
      let decoded;
      try { decoded = await auth.verifyIdToken(idToken, true); } catch { throw new AppError("UNAUTHENTICATED", "Invalid or expired Firebase token.", 401); }
      if (!decoded.email) throw new AppError("VALIDATION_ERROR", "Your Firebase account does not have an email address.", 422);
      const result = await bootstrapSchool(parsed.data, { uid: decoded.uid, email: decoded.email, displayName: decoded.name ?? decoded.email, emailVerified: decoded.email_verified === true });
      return reply.code(201).send({ data: result, meta: { requestId: request.id } });
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/users/invite",
    { preHandler: [authenticateApiRequest, requireApiCsrf], schema: { ...publicOperationSchema, summary: "Invite a scoped ERP user", security: [{ firebaseBearer: [] }, { apiSessionCookie: [] }] } },
    async (request, reply) => {
      const actor = requireApiPermission(request, "users:create");
      const parsed = provisionUserSchema.safeParse(request.body);
      if (!parsed.success) throw new AppError("VALIDATION_ERROR", "The user invitation is invalid.", 422, parsed.error.flatten().fieldErrors);
      const result = await provisionUser(actor, parsed.data);
      await writeAuditLog(actor, { action: "create", module: "users", entityType: "user", entityId: result.userId, after: { email: parsed.data.email, displayName: parsed.data.displayName, role: parsed.data.role, campusId: parsed.data.campusId } });
      return reply.code(201).send({ data: result, meta: { requestId: request.id } });
    },
  );

  app.get<{ Querystring: { token?: string } }>(
    "/users/invite/validate",
    { schema: { ...publicOperationSchema, summary: "Validate an invitation token" } },
    async (request) => {
      const token = request.query.token?.trim() ?? "";
      if (token.length < 40 || token.length > 160) throw new AppError("VALIDATION_ERROR", "Invitation token is invalid.", 422);
      const invitation = await validateInvitation(token);
      if (!invitation) throw new AppError("NOT_FOUND", "Invitation not found.", 404);
      return { data: { ...invitation, expiresAt: invitation.expiresAt.toISOString() }, meta: { requestId: request.id } };
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/users/invite/accept",
    { schema: { ...publicOperationSchema, summary: "Accept an invitation" } },
    async (request) => {
      const parsed = invitationAcceptSchema.safeParse(request.body);
      if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Invitation details are invalid.", 422, parsed.error.flatten().fieldErrors);
      const result = await acceptInvitation(parsed.data);
      return { data: result, meta: { requestId: request.id } };
    },
  );
};
