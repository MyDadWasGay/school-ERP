import type { FastifyPluginAsync } from "fastify";
import { metaSchema } from "../schemas";

/**
 * CLIENT_API_CONTRACT:
 * This endpoint gives the web and Flutter clients a cheap compatibility check.
 * Add capabilities only when the corresponding authenticated endpoint and
 * tests are released.
 */
export const metaRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { schema: metaSchema }, async (request) => ({
    data: {
      name: "School ERP API",
      version: "v1",
      status: "released",
      capabilities: [
        "auth.me",
        "auth.campuses",
        "portal.summary",
        "students.profile",
        "attendance.student",
        "attendance.leave_request",
        "finance.student_invoices",
        "finance.collect_payment",
        "finance.razorpay_checkout",
        "finance.razorpay_refunds",
        "exams.student_results",
        "communication.notifications",
        "communication.notification_read",
        "documents.student",
        "documents.upload_signature",
        "documents.save_metadata",
        "academics.records",
        "identity.organizations_campuses_users",
        "identity.invitations_access_control",
        "students.admissions_health_certificates",
        "attendance.leave_staff_discipline",
        "academics.exams_marks_reports",
        "finance_fees_payments_accounting_payroll",
        "operations_library_transport_hostel_inventory",
        "community_cms_activities_alumni",
        "integrations_jobs_webhooks",
        "catalog.low_risk_records",
      ],
    },
    meta: { requestId: request.id },
  }));
};
