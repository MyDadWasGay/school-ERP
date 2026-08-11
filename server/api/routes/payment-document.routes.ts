import type { FastifyPluginAsync } from "fastify";
import { paymentSchema } from "../../../features/finance/schemas/payment.schema";
import { collectPayment } from "../../../features/finance/services/payment.service";
import {
  refundSchema,
  type RefundInput,
} from "../../../features/finance/schemas/refund.schema";
import { refundPayment } from "../../../features/finance/services/refund.service";
import {
  createRazorpayOrder,
  createRazorpayOrderSchema,
  verifyRazorpayPayment,
  verifyRazorpayPaymentSchema,
  type CreateRazorpayOrderInput,
  type VerifyRazorpayPaymentInput,
} from "../../../features/finance/services/razorpay-payment.service";
import {
  createDocumentUploadSignature,
  documentMetadataSchema,
  listStudentDocuments,
  saveDocumentMetadata,
  uploadRequestSchema,
  type DocumentMetadataInput,
  type UploadRequestInput,
} from "../../../features/documents/services/document.service";
import { writeAuditLog } from "../../../lib/audit/audit-log";
import {
  authenticateApiRequest,
  requireApiCsrf,
  requireApiPermission,
} from "../auth/bearer-auth";
import {
  collectPaymentSchema,
  createRefundApiSchema,
  createRazorpayOrderApiSchema,
  saveDocumentSchema,
  studentDocumentsSchema,
  uploadSignatureSchema,
  verifyRazorpayPaymentApiSchema,
} from "../schemas/payment-document.schemas";

type StudentParams = { studentId: string };
type PaymentBody = {
  invoiceId: string;
  studentId: string;
  amountMinor: number;
  method: "cash" | "cheque" | "card" | "upi" | "bank_transfer";
  idempotencyKey: string;
  providerReference?: string;
};

export const paymentDocumentRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: RefundInput }>(
    "/payments/refunds",
    {
      preHandler: [authenticateApiRequest, requireApiCsrf],
      schema: createRefundApiSchema,
    },
    async (request, reply) => {
      const user = requireApiPermission(request, "fees:refund");
      const input = refundSchema.parse(request.body);
      const result = await refundPayment(user, input);
      await writeAuditLog(user, {
        action: "refund_payment",
        module: "finance",
        entityType: "fee_refund",
        entityId: result.refund.id,
        campusId: result.refund.campusId,
        after: {
          amountMinor: result.refund.amountMinor,
          provider: result.refund.provider,
          providerRefundId: result.refund.providerRefundId,
          providerStatus: result.refund.providerStatus,
          status: result.refund.status,
        },
      });
      return reply.code(201).send({
        data: {
          id: result.refund.id,
          paymentId: result.refund.paymentId,
          amountMinor: result.refund.amountMinor,
          provider: result.refund.provider,
          providerRefundId: result.refund.providerRefundId,
          providerStatus: result.refund.providerStatus,
          status: result.refund.status,
        },
        meta: { requestId: request.id },
      });
    },
  );

  app.post<{ Body: CreateRazorpayOrderInput }>(
    "/payments/razorpay/orders",
    {
      preHandler: [authenticateApiRequest, requireApiCsrf],
      schema: createRazorpayOrderApiSchema,
    },
    async (request, reply) => {
      const user = requireApiPermission(request, "fees:pay_online");
      const input = createRazorpayOrderSchema.parse(request.body);
      const order = await createRazorpayOrder(user, input);
      await writeAuditLog(user, {
        action: "create",
        module: "finance",
        entityType: "razorpay_order",
        entityId: order.paymentRequestId,
        campusId: user.campusId,
        after: {
          orderId: order.orderId,
          amountMinor: order.amountMinor,
          currency: order.currency,
          status: order.status,
        },
      });
      return reply
        .code(201)
        .send({ data: order, meta: { requestId: request.id } });
    },
  );

  app.post<{ Body: VerifyRazorpayPaymentInput }>(
    "/payments/razorpay/verify",
    {
      preHandler: [authenticateApiRequest, requireApiCsrf],
      schema: verifyRazorpayPaymentApiSchema,
    },
    async (request) => {
      const user = requireApiPermission(request, "fees:pay_online");
      const input = verifyRazorpayPaymentSchema.parse(request.body);
      const result = await verifyRazorpayPayment(user, input);
      await writeAuditLog(user, {
        action: "collect_payment",
        module: "finance",
        entityType: "fee_payment",
        entityId: result.payment.id,
        campusId: result.payment.campusId,
        after: {
          provider: "razorpay",
          providerReference: result.payment.providerReference,
          amountMinor: result.payment.amountMinor,
          status: result.payment.status,
        },
      });
      return {
        data: {
          id: result.payment.id,
          invoiceId: result.payment.invoiceId,
          studentId: result.payment.studentId,
          receiptNumber: result.payment.receiptNumber,
          amountMinor: result.payment.amountMinor,
          method: "online",
          providerReference: result.payment.providerReference,
          paidAt: result.payment.paidAt.toISOString(),
          status: result.payment.status,
        },
        meta: { requestId: request.id },
      };
    },
  );

  app.post<{ Body: PaymentBody }>(
    "/payments",
    { preHandler: [authenticateApiRequest, requireApiCsrf], schema: collectPaymentSchema },
    async (request, reply) => {
      const user = requireApiPermission(request, "fees:collect");
      const input = paymentSchema.parse(request.body);
      const payment = await collectPayment(user, input);
      await writeAuditLog(user, {
        action: "collect_payment",
        module: "finance",
        entityType: "fee_payment",
        entityId: payment.id,
        campusId: payment.campusId,
        after: payment,
      });
      return reply.code(201).send({
        data: {
          id: payment.id,
          invoiceId: payment.invoiceId,
          studentId: payment.studentId,
          receiptNumber: payment.receiptNumber,
          amountMinor: payment.amountMinor,
          method: payment.method,
          providerReference: payment.providerReference,
          paidAt: payment.paidAt.toISOString(),
          status: payment.status,
        },
        meta: { requestId: request.id },
      });
    },
  );

  app.post<{ Body: UploadRequestInput }>(
    "/uploads/signature",
    { preHandler: [authenticateApiRequest, requireApiCsrf], schema: uploadSignatureSchema },
    async (request) => {
      const user = requireApiPermission(request, "documents:create");
      const input = uploadRequestSchema.parse(request.body);
      const signature = await createDocumentUploadSignature(user, input);
      return { data: signature, meta: { requestId: request.id } };
    },
  );

  app.post<{ Body: DocumentMetadataInput }>(
    "/documents",
    { preHandler: [authenticateApiRequest, requireApiCsrf], schema: saveDocumentSchema },
    async (request, reply) => {
      const user = requireApiPermission(request, "documents:create");
      const input = documentMetadataSchema.parse(request.body);
      const row = await saveDocumentMetadata(user, input);
      await writeAuditLog(user, {
        action: "upload",
        module: "documents",
        entityType: row.entityType,
        entityId: row.id,
        campusId: row.campusId,
        after: row,
      });
      return reply.code(201).send({
        data: {
          id: row.id,
          entityType: row.entityType,
          entityId: row.entityId,
          category: row.category,
          status: row.status,
        },
        meta: { requestId: request.id },
      });
    },
  );

  app.get<{ Params: StudentParams }>(
    "/students/:studentId/documents",
    { preHandler: authenticateApiRequest, schema: studentDocumentsSchema },
    async (request) => {
      const user = requireApiPermission(request, "documents:read");
      const rows = await listStudentDocuments(user, request.params.studentId);
      return {
        data: {
          studentId: request.params.studentId,
          documents: rows.map((row) => ({
            ...row,
            createdAt: row.createdAt.toISOString(),
          })),
        },
        meta: { requestId: request.id },
      };
    },
  );
};
