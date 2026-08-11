import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { academicArchiveSchema, academicRecordSchema } from "../../../features/academics/schemas/academic.schema";
import { archiveAcademicRecord, createAcademicRecord } from "../../../features/academics/services/academic.service";
import { examSchema, examScheduleSchema, examStatusSchema } from "../../../features/exams/schemas/planning.schema";
import { marksSchema } from "../../../features/exams/schemas/marks.schema";
import { questionBankSchema, reportCardSchema } from "../../../features/exams/schemas/deep-feature.schema";
import { createExam, publishExamResults, saveMarksEntry, scheduleExam, transitionExamStatus } from "../../../features/exams/services/exams.service";
import { createQuestionBankItem, generateReportCard, getDeepExamOptions, listQuestionBank, listReportCards } from "../../../features/exams/services/deep-feature.service";
import { getExamPlanningOptions, getExamWorkspaceOptions, listExamPlanning, listExamResults } from "../../../features/exams/services/exam-workspace.service";
import { invoiceSchema } from "../../../features/finance/schemas/invoice.schema";
import { feeHeadSchema, feeInstallmentSchema, feeStructureSchema } from "../../../features/finance/schemas/fee-configuration.schema";
import { accountSchema, donationSchema, expenseSchema } from "../../../features/finance/schemas/accounting.schema";
import { createInvoice, getInvoiceStudentOptions, getPaymentOptions, getRefundOptions, listInvoicesPage, listPayments } from "../../../features/finance/services/finance-workspace.service";
import { createFeeHead, createFeeInstallment, createFeeStructure, listFeeConfiguration } from "../../../features/finance/services/fee-configuration.service";
import { createChartAccount, createDonation, createExpense, listChartOfAccounts, listDonations, listExpenses, listLedgerEntries } from "../../../features/finance/services/accounting.service";
import { authenticateApiRequest, requireApiCsrf, requireApiPermission } from "../auth/bearer-auth";
import { apiCreated, apiSuccess, auditCommand, parseApiBody, pageQuery, routeSchema } from "./route-utils";

type IdParams = { id: string };
type KindParams = { kind: "curriculum" | "lesson-plans" | "teacher-allocation" | "timetable" | "substitutions" | "assignments" | "resources" };
type ExamParams = { id: string };
type PageQuery = { page?: number; pageSize?: number };

const authenticated = { preHandler: authenticateApiRequest };
const mutation = { preHandler: [authenticateApiRequest, requireApiCsrf] };
const examPublishSchema = z.object({ examId: z.string().min(1) });

export const academicFinanceRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Params: KindParams; Body: unknown }>("/academics/:kind/records", { ...mutation, schema: routeSchema("Create an academic workflow record") }, async (request, reply) => {
    const user = requireApiPermission(request, "academics:create");
    const input = parseApiBody(academicRecordSchema, { ...(request.body as Record<string, unknown>), kind: request.params.kind });
    const row = await createAcademicRecord(user, input);
    await auditCommand(user, { action: "create", module: "academics", entityType: input.kind, entityId: row.id, campusId: row.campusId, after: { name: input.name, code: input.code, referenceId: input.referenceId } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.post<{ Params: KindParams & IdParams }>("/academics/:kind/records/:id/archive", mutation, async (request) => {
    const user = requireApiPermission(request, "academics:delete");
    const input = parseApiBody(academicArchiveSchema, { kind: request.params.kind, id: request.params.id });
    const row = await archiveAcademicRecord(user, input.kind, input.id);
    await auditCommand(user, { action: "delete", module: "academics", entityType: input.kind, entityId: row.id, after: { status: "archived" } });
    return apiSuccess(request, { id: row.id });
  });

  app.get("/exams/workspace/options", authenticated, async (request) => {
    const user = requireApiPermission(request, "exams:read");
    return apiSuccess(request, await getExamWorkspaceOptions(user));
  });

  app.get("/exams/planning/options", authenticated, async (request) => {
    const user = requireApiPermission(request, "exams:read");
    return apiSuccess(request, await getExamPlanningOptions(user));
  });

  app.get("/exams/planning", authenticated, async (request) => {
    const user = requireApiPermission(request, "exams:read");
    return apiSuccess(request, await listExamPlanning(user));
  });

  app.get("/exams/results", authenticated, async (request) => {
    const user = requireApiPermission(request, "exams:read");
    return apiSuccess(request, await listExamResults(user));
  });

  app.post<{ Body: unknown }>("/exams", { ...mutation, schema: routeSchema("Create an exam") }, async (request, reply) => {
    const user = requireApiPermission(request, "exams:create");
    const input = parseApiBody(examSchema, request.body);
    const row = await createExam(user, input);
    await auditCommand(user, { action: "create", module: "exams", entityType: "exam", entityId: row.id, campusId: row.campusId, after: row });
    return apiCreated(reply, request, { id: row.id });
  });

  app.post<{ Body: unknown }>("/exams/schedules", { ...mutation, schema: routeSchema("Schedule an exam") }, async (request, reply) => {
    const user = requireApiPermission(request, "exams:update");
    const input = parseApiBody(examScheduleSchema, request.body);
    const row = await scheduleExam(user, input);
    await auditCommand(user, { action: "create", module: "exams", entityType: "exam_schedule", entityId: row.id, campusId: row.campusId, after: row });
    return apiCreated(reply, request, { id: row.id });
  });

  app.patch<{ Params: ExamParams; Body: unknown }>("/exams/:id/status", { ...mutation, schema: routeSchema("Transition an exam workflow") }, async (request) => {
    const input = parseApiBody(examStatusSchema, { ...(request.body as Record<string, unknown>), examId: request.params.id });
    const user = requireApiPermission(request, input.status === "published" ? "exams:publish_result" : "exams:update");
    const result = await transitionExamStatus(user, input.examId, input.status);
    await auditCommand(user, { action: "update", module: "exams", entityType: "exam", entityId: result.row.id, campusId: result.row.campusId, before: result.before, after: result.row });
    return apiSuccess(request, { id: result.row.id });
  });

  app.post<{ Body: unknown }>("/exams/marks", { ...mutation, schema: routeSchema("Save exam marks") }, async (request) => {
    const user = requireApiPermission(request, "exams:enter_marks");
    const input = parseApiBody(marksSchema, request.body);
    const row = await saveMarksEntry(user, input);
    await auditCommand(user, { action: "update", module: "exams", entityType: "marks_entry", entityId: row.id, after: row });
    return apiSuccess(request, { id: row.id });
  });

  app.post<{ Params: ExamParams; Body: unknown }>("/exams/:id/publish", { ...mutation, schema: routeSchema("Publish exam results") }, async (request) => {
    const user = requireApiPermission(request, "exams:publish_result");
    const publication = await publishExamResults(user, parseApiBody(examPublishSchema, { examId: request.params.id }).examId);
    await auditCommand(user, { action: "publish_result", module: "exams", entityType: "result_publication", entityId: publication.id, after: publication });
    return apiSuccess(request, { id: publication.id });
  });

  app.get("/exams/question-bank", authenticated, async (request) => {
    const user = requireApiPermission(request, "exams:read");
    return apiSuccess(request, await listQuestionBank(user));
  });

  app.get("/exams/deep/options", authenticated, async (request) => {
    const user = requireApiPermission(request, "exams:read");
    return apiSuccess(request, await getDeepExamOptions(user));
  });

  app.post<{ Body: unknown }>("/exams/question-bank", { ...mutation, schema: routeSchema("Create a question bank item") }, async (request, reply) => {
    const user = requireApiPermission(request, "exams:create");
    const input = parseApiBody(questionBankSchema, request.body);
    const row = await createQuestionBankItem(user, input);
    await auditCommand(user, { action: "create", module: "exams", entityType: "question_bank_item", entityId: row.id, campusId: row.campusId, after: { subjectId: row.subjectId, questionType: row.questionType, maximumMarks: row.maximumMarks } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.get("/exams/report-cards", authenticated, async (request) => {
    const user = requireApiPermission(request, "exams:read");
    return apiSuccess(request, await listReportCards(user));
  });

  app.post<{ Body: unknown }>("/exams/report-cards", { ...mutation, schema: routeSchema("Generate an exam report card") }, async (request, reply) => {
    const user = requireApiPermission(request, "exams:update");
    const row = await generateReportCard(user, parseApiBody(reportCardSchema, request.body));
    if (!row) return apiSuccess(request, { id: null });
    await auditCommand(user, { action: "create", module: "exams", entityType: "report_card", entityId: row.id, campusId: row.campusId, after: { examId: row.examId, studentId: row.studentId } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.get<{ Querystring: PageQuery }>("/fees/invoices", authenticated, async (request) => {
    const user = requireApiPermission(request, "fees:read");
    return apiSuccess(request, await listInvoicesPage(user, pageQuery(request.query)));
  });

  app.get("/fees/invoices/options", authenticated, async (request) => {
    const user = requireApiPermission(request, "fees:read");
    return apiSuccess(request, await getInvoiceStudentOptions(user));
  });

  app.post<{ Body: unknown }>("/fees/invoices", { ...mutation, schema: routeSchema("Create a fee invoice") }, async (request, reply) => {
    const user = requireApiPermission(request, "fees:create");
    const row = await createInvoice(user, parseApiBody(invoiceSchema, request.body));
    await auditCommand(user, { action: "create", module: "fees", entityType: "fee_invoice", entityId: row.id, after: row });
    return apiCreated(reply, request, { id: row.id, invoiceNumber: row.invoiceNumber });
  });

  app.get("/fees/configuration", authenticated, async (request) => {
    const user = requireApiPermission(request, "fees:read");
    return apiSuccess(request, await listFeeConfiguration(user));
  });

  app.post<{ Body: unknown }>("/fees/configuration/heads", { ...mutation, schema: routeSchema("Create a fee head") }, async (request, reply) => {
    const user = requireApiPermission(request, "fees:create");
    const row = await createFeeHead(user, parseApiBody(feeHeadSchema, request.body));
    await auditCommand(user, { action: "create", module: "fees", entityType: "fee_head", entityId: row.id, after: { name: row.name, code: row.code } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.post<{ Body: unknown }>("/fees/configuration/structures", { ...mutation, schema: routeSchema("Create a fee structure") }, async (request, reply) => {
    const user = requireApiPermission(request, "fees:create");
    const row = await createFeeStructure(user, parseApiBody(feeStructureSchema, request.body));
    await auditCommand(user, { action: "create", module: "fees", entityType: "fee_structure", entityId: row.id, after: { name: row.name, academicYearId: row.academicYearId, classId: row.classId, effectiveFrom: row.effectiveFrom } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.post<{ Body: unknown }>("/fees/configuration/installments", { ...mutation, schema: routeSchema("Create a fee installment") }, async (request, reply) => {
    const user = requireApiPermission(request, "fees:create");
    const row = await createFeeInstallment(user, parseApiBody(feeInstallmentSchema, request.body));
    await auditCommand(user, { action: "create", module: "fees", entityType: "fee_installment", entityId: row.id, after: { name: row.name, amountMinor: row.amountMinor, dueOn: row.dueOn } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.get("/fees/payments/options", authenticated, async (request) => {
    const user = requireApiPermission(request, "fees:read");
    return apiSuccess(request, await getPaymentOptions(user));
  });

  app.get("/fees/payments", authenticated, async (request) => {
    const user = requireApiPermission(request, "fees:read");
    return apiSuccess(request, await listPayments(user));
  });

  app.get("/fees/refunds/options", authenticated, async (request) => {
    const user = requireApiPermission(request, "fees:read");
    return apiSuccess(request, await getRefundOptions(user));
  });

  app.get("/accounts/chart-of-accounts", authenticated, async (request) => {
    const user = requireApiPermission(request, "accounts:read");
    return apiSuccess(request, await listChartOfAccounts(user));
  });

  app.get("/accounts/expenses", authenticated, async (request) => {
    const user = requireApiPermission(request, "accounts:read");
    return apiSuccess(request, await listExpenses(user));
  });

  app.get("/accounts/ledger", authenticated, async (request) => {
    const user = requireApiPermission(request, "accounts:read");
    return apiSuccess(request, await listLedgerEntries(user));
  });

  app.get("/accounts/donations", authenticated, async (request) => {
    const user = requireApiPermission(request, "accounts:read");
    return apiSuccess(request, await listDonations(user));
  });

  app.post<{ Body: unknown }>("/accounts/donations", { ...mutation, schema: routeSchema("Record a donation") }, async (request, reply) => {
    const user = requireApiPermission(request, "accounts:create");
    const row = await createDonation(user, parseApiBody(donationSchema, request.body));
    await auditCommand(user, { action: "create", module: "accounts", entityType: "donation", entityId: row.id, campusId: row.campusId, after: { donorName: row.donorName, amountMinor: row.amountMinor, purpose: row.purpose } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.post<{ Body: unknown }>("/accounts/chart-of-accounts", { ...mutation, schema: routeSchema("Create a chart of accounts entry") }, async (request, reply) => {
    const user = requireApiPermission(request, "accounts:create");
    const row = await createChartAccount(user, parseApiBody(accountSchema, request.body));
    await auditCommand(user, { action: "create", module: "accounts", entityType: "chart_of_account", entityId: row.id, after: { code: row.code, name: row.name, accountType: row.accountType } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.post<{ Body: unknown }>("/accounts/expenses", { ...mutation, schema: routeSchema("Create an expense") }, async (request, reply) => {
    const user = requireApiPermission(request, "accounts:create");
    const row = await createExpense(user, parseApiBody(expenseSchema, request.body));
    await auditCommand(user, { action: "create", module: "accounts", entityType: "expense", entityId: row.id, after: { accountId: row.accountId, amountMinor: row.amountMinor, incurredOn: row.incurredOn } });
    return apiCreated(reply, request, { id: row.id });
  });
};
