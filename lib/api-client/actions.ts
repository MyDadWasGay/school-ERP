"use client";

import type { ActionResult } from "../errors/result";
import { SchoolErpApiError } from "./client";
import { createBrowserApiClient } from "./browser";

function fieldsFrom(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const fields: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(value)) {
    if (Array.isArray(messages)) fields[key] = messages.map(String);
  }
  return Object.keys(fields).length ? fields : undefined;
}

export async function callApiAction<T>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  message?: string,
  options?: { idempotencyKey?: string; campusId?: string },
): Promise<ActionResult<T>> {
  try {
    const api = createBrowserApiClient(options?.campusId);
    const result = await api.call<T>(method, path, body, { idempotencyKey: options?.idempotencyKey });
    return { ok: true, data: result.data, ...(message ? { message } : {}) };
  } catch (error) {
    if (error instanceof SchoolErpApiError) return { ok: false, error: error.message, code: error.code, fieldErrors: fieldsFrom(error.fields) };
    return { ok: false, error: error instanceof Error ? error.message : "The API request failed." };
  }
}

function textId(input: unknown, key: string) {
  if (!input || typeof input !== "object") return "";
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export const createAcademicRecordAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/academics/${encodeURIComponent(textId(input, "kind"))}`, input, "Academic record created.");
export const archiveAcademicRecordAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/academics/${encodeURIComponent(textId(input, "kind"))}/${encodeURIComponent(textId(input, "id"))}/archive`, undefined, "Academic record archived.");

export const createStudentAction = (input: unknown) => callApiAction<{ id: string; invitations?: { student?: { email: string; inviteLink: string }; guardian?: { email: string; inviteLink: string } } }>("POST", "/api/v1/students", input, "Student created.");
export const inviteStudentAction = (studentId: string) => callApiAction<{ email: string; inviteLink: string; expiresAt: string }>("POST", `/api/v1/students/${encodeURIComponent(studentId)}/invite`, undefined, "Student invitation generated.");
export const inviteGuardianAction = (studentId: string, guardianId: string) => callApiAction<{ email: string; inviteLink: string; expiresAt: string }>("POST", `/api/v1/students/${encodeURIComponent(studentId)}/guardians/${encodeURIComponent(guardianId)}/invite`, undefined, "Guardian invitation generated.");
export const updateStudentAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/students/${encodeURIComponent(textId(input, "id"))}`, input, "Student updated.");
export const createGuardianAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/students/${encodeURIComponent(textId(input, "studentId"))}/guardians`, input, "Guardian linked.");
export const updateGuardianAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/students/${encodeURIComponent(textId(input, "studentId"))}/guardians/${encodeURIComponent(textId(input, "id"))}`, input, "Guardian updated.");
export const unlinkGuardianAction = (input: unknown) => callApiAction<{ id: string }>("DELETE", `/api/v1/students/${encodeURIComponent(textId(input, "studentId"))}/guardians/${encodeURIComponent(textId(input, "guardianId"))}`, undefined, "Guardian unlinked.");
export const transferEnrollmentAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/students/${encodeURIComponent(textId(input, "studentId"))}/enrollment`, input, "Enrollment transferred.");
export const updateMedicalProfileAction = (input: unknown) => callApiAction<{ id: string }>("PUT", `/api/v1/students/${encodeURIComponent(textId(input, "studentId"))}/medical`, input, "Medical profile saved.");
export const issueCertificateAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/students/${encodeURIComponent(textId(input, "studentId"))}/certificates`, input, "Certificate issued.");

export const createEnquiryAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/admissions/enquiries", input, "Enquiry created.");
export const createApplicationAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/admissions/applications", input, "Application created.");
export const reviewApplicationAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/admissions/applications/${encodeURIComponent(textId(input, "applicationId"))}/review`, input, "Application reviewed.");
export const updateEnquiryAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/admissions/enquiries/${encodeURIComponent(textId(input, "id"))}`, input, "Enquiry updated.");
export const createFollowUpAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/admissions/enquiries/${encodeURIComponent(textId(input, "enquiryId"))}/follow-ups`, input, "Follow-up scheduled.");
export const completeFollowUpAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/admissions/follow-ups/${encodeURIComponent(textId(input, "id"))}/complete`, input, "Follow-up completed.");
export const scheduleAssessmentAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/admissions/applications/${encodeURIComponent(textId(input, "applicationId"))}/assessments`, input, "Assessment scheduled.");
export const recordAssessmentAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/admissions/assessments/${encodeURIComponent(textId(input, "id"))}`, input, "Assessment result saved.");
export const approveAdmissionAction = (input: unknown) => callApiAction<{ studentId: string }>("POST", `/api/v1/admissions/applications/${encodeURIComponent(textId(input, "applicationId"))}/approve`, input, "Admission approved and student enrolled.");

export const markAttendanceAction = (input: unknown) => callApiAction<{ id: string; correctionRequested: boolean }>("POST", "/api/v1/attendance/records", input, "Attendance marked.");
export const reviewAttendanceCorrectionAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/attendance/corrections/${encodeURIComponent(textId(input, "correctionId"))}/review`, input, "Attendance correction reviewed.");
export const createLeaveRequestAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/leave-requests", input, "Leave request submitted for review.");
export const reviewLeaveRequestAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/leave-requests/${encodeURIComponent(textId(input, "leaveId"))}/review`, input, "Leave request reviewed.");
export const createDisciplineIncidentAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/attendance/discipline", input, "Discipline incident recorded.");
export const updateDisciplineStatusAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/attendance/discipline/${encodeURIComponent(textId(input, "incidentId"))}`, input, "Incident status updated.");
export const recordStaffAttendanceAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/attendance/staff", input, "Staff attendance recorded.");

export const upsertHealthProfileAction = (input: unknown) => callApiAction<{ id: string }>("PUT", `/api/v1/health/students/${encodeURIComponent(textId(input, "studentId"))}/profile`, input, "Health profile saved.");
export const createClinicVisitAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/health/clinic-visits", input, "Clinic visit recorded.");

export const createExamAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/exams", input, "Exam created in draft status.");
export const scheduleExamAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/exams/schedules", input, "Exam schedule saved.");
export const enterMarksAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/exams/marks", input, "Marks saved for moderation.");
export const publishResultAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/exams/${encodeURIComponent(textId(input, "examId"))}/publish`, input, "Results published.");
export const transitionExamStatusAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/exams/${encodeURIComponent(textId(input, "examId"))}/status`, input, "Exam status updated.");
export const createQuestionBankItemAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/exams/question-bank", input, "Question added to the bank.");
export const generateReportCardAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/exams/report-cards", input, "Report card generated.");

export const collectPaymentAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/payments", input, "Payment collected and ledger posted.", { idempotencyKey: textId(input, "idempotencyKey") });
export const refundPaymentAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/payments/refunds", input, "Refund submitted.", { idempotencyKey: textId(input, "idempotencyKey") });
export const createInvoiceAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/fees/invoices", input, "Invoice created.");
export const createFeeHeadAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/fees/configuration/heads", input, "Fee head created.");
export const createFeeStructureAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/fees/configuration/structures", input, "Fee structure created as draft.");
export const createFeeInstallmentAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/fees/configuration/installments", input, "Installment created.");
export const createDonationAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/accounts/donations", input, "Donation recorded.");
export const createChartAccountAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/accounts/chart-of-accounts", input, "Account created.");
export const createExpenseAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/accounts/expenses", input, "Expense saved as draft.");

export const createMessageAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/communication/messages", input, "Message saved as a draft.");
export const publishMessageAction = (input: unknown) => callApiAction<{ id: string; recipientCount: number }>("POST", `/api/v1/communication/messages/${encodeURIComponent(textId(input, "messageId"))}/publish`, input, "Message published.");
export const markNotificationReadAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/notifications/${encodeURIComponent(textId(input, "notificationId"))}/read`, undefined, "Notification marked read.");
export const createNoticeAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/communication/notices", input, "Notice saved as a draft.");
export const transitionNoticeAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/communication/notices/${encodeURIComponent(textId(input, "id"))}`, input, "Notice updated.");

export const createLibraryItemAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/library/items", input, "Library item created.");
export const addLibraryCopyAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/library/copies", input, "Library copy added.");
export const issueLibraryCopyAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/library/issues", input, "Library copy issued.");
export const returnLibraryCopyAction = (input: unknown) => callApiAction<{ id: string; fineMinor: number }>("POST", "/api/v1/library/issues/return", input, "Library copy returned.");
export const renewLibraryCopyAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/library/issues/renew", input, "Library copy renewed.");
export const reserveLibraryItemAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/library/reservations", input, "Library reservation created.");
export const createDigitalResourceAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/library/digital-resources", input, "Digital resource created.");

export const createTransportVehicleAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/transport/vehicles", input, "Transport vehicle created.");
export const createVehicleDocumentAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/transport/vehicle-documents", input, "Vehicle document recorded.");
export const createTransportRouteAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/transport/routes", input, "Transport route created.");
export const createTransportStopAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/transport/stops", input, "Transport stop created.");
export const allocateStudentToRouteAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/transport/allocations", input, "Student allocated to route.");

export const createHostelRoomAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/hostel/rooms", input, "Hostel room created.");
export const createHostelBedAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/hostel/beds", input, "Hostel bed created.");
export const allocateHostelBedAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/hostel/allotments", input, "Bed allotted.");
export const checkoutHostelAllotmentAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/hostel/allotments/${encodeURIComponent(textId(input, "allotmentId"))}/checkout`, input, "Student checked out.");
export const createMenuAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/canteen/menu", input, "Menu item created.");
export const createCanteenTransactionAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/canteen/transactions", input, "Canteen transaction recorded.");

export const createAssetAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/assets", input, "Asset registered.");
export const transitionAssetAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/assets/${encodeURIComponent(textId(input, "id"))}/status`, input, "Asset status updated.");
export const assignAssetAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/assets/assignments", input, "Asset assigned.");
export const transitionAssetAssignmentAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/assets/assignments/${encodeURIComponent(textId(input, "id"))}/status`, input, "Assignment status updated.");
export const createAssetMaintenanceAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/assets/maintenance", input, "Maintenance ticket created.");
export const transitionAssetMaintenanceAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/assets/maintenance/${encodeURIComponent(textId(input, "id"))}/status`, input, "Maintenance status updated.");
export const postAssetDepreciationAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/assets/depreciation", input, "Depreciation posted.");

export const createSupplierAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/inventory/suppliers", input, "Supplier created.");
export const updateSupplierAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/inventory/suppliers/${encodeURIComponent(textId(input, "id"))}`, input, "Supplier updated.");
export const archiveSupplierAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/inventory/suppliers/${encodeURIComponent(textId(input, "id"))}/archive`, input, "Supplier archived.");
export const createInventoryItemAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/inventory/items", input, "Inventory item created.");
export const postStockMovementAction = (input: unknown) => callApiAction<{ id: string; quantity: number }>("POST", "/api/v1/inventory/stock-movements", input, "Stock movement posted.");
export const createVendorAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/inventory/suppliers", input, "Vendor created.");
export const createRequisitionAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/procurement/requisitions", input, "Requisition created as draft.");
export const transitionRequisitionAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/procurement/requisitions/${encodeURIComponent(textId(input, "id"))}/status`, input, "Requisition updated.");
export const createPurchaseOrderAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/procurement/purchase-orders", input, "Purchase order created as draft.");
export const transitionPurchaseOrderAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/procurement/purchase-orders/${encodeURIComponent(textId(input, "id"))}/status`, input, "Purchase order updated.");
export const postGoodsReceiptAction = (input: unknown) => callApiAction<{ id: string; quantity: number }>("POST", "/api/v1/procurement/goods-receipts", input, "Goods receipt posted.");

export const createFacilityBookingAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/facilities/bookings", input, "Facility booking requested.");
export const transitionFacilityBookingAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/facilities/bookings/${encodeURIComponent(textId(input, "id"))}/status`, input, "Facility booking updated.");
export const createFacilityMaintenanceAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/facilities/maintenance", input, "Maintenance ticket created.");
export const transitionFacilityMaintenanceAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/facilities/maintenance/${encodeURIComponent(textId(input, "id"))}/status`, input, "Maintenance status updated.");
export const createFacilityComplaintAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/facilities/complaints", input, "Complaint submitted.");
export const transitionFacilityComplaintAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/facilities/complaints/${encodeURIComponent(textId(input, "id"))}/status`, input, "Complaint updated.");

export const createVisitorAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/safety/visitors", input, "Visitor registered.");
export const createGatePassAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/safety/gate-passes", input, "Gate pass requested.");
export const transitionGatePassAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/safety/gate-passes/${encodeURIComponent(textId(input, "id"))}/status`, input, "Gate pass updated.");
export const createSecurityIncidentAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/safety/incidents", input, "Security incident recorded.");
export const transitionSecurityIncidentAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/safety/incidents/${encodeURIComponent(textId(input, "id"))}/status`, input, "Incident updated.");
export const createEvacuationAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/safety/evacuation", input, "Evacuation roll call opened.");
export const closeEvacuationAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/safety/evacuation/${encodeURIComponent(textId(input, "id"))}/status`, input, "Evacuation roll call closed.");

export const createEmployeeAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/hr/employees", input, "Employee created.");
export const createPayrollRunAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/payroll/runs", input, "Payroll run created as draft.");
export const processPayrollRunAction = (input: unknown) => callApiAction<{ id: string; payslipCount: number; totalMinor: number }>("POST", `/api/v1/payroll/runs/${encodeURIComponent(textId(input, "runId"))}/process`, input, "Payroll processed.");

export const createOrganizationAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/organizations", input, "Organization created.");
export const createCampusAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/campuses", input, "Campus created.");
export const updateCampusAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/campuses/${encodeURIComponent(textId(input, "id"))}`, input, "Campus updated.");
export const archiveCampusAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/campuses/${encodeURIComponent(textId(input, "id"))}/archive`, input, "Campus archived.");
export const createAcademicSetupAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/settings", input, "Academic setup record created.");
export const updateAcademicSetupAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/settings/${encodeURIComponent(textId(input, "kind"))}/${encodeURIComponent(textId(input, "id"))}`, input, "Academic setup record updated.");
export const archiveAcademicSetupAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/settings/${encodeURIComponent(textId(input, "kind"))}/${encodeURIComponent(textId(input, "id"))}/archive`, input, "Academic setup record archived.");

export const createPlatformSchoolAction = (input: unknown) => callApiAction<{ organizationId: string; adminEmail: string; inviteLink: string }>("POST", "/api/v1/platform/schools", input, "School created and administrator invite prepared.");
export const updatePlatformSchoolStatusAction = (input: unknown) => callApiAction<{ id: string; status: string }>("PATCH", `/api/v1/platform/schools/${encodeURIComponent(textId(input, "organizationId"))}/status`, input, "School status updated.");
export const updateUserAccessAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/users/${encodeURIComponent(textId(input, "id"))}/access`, input, "User access updated.");
export const createDelegationAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/users/${encodeURIComponent(textId(input, "userId"))}/delegations`, input, "Delegated access granted.");
export const revokeDelegationAction = (input: unknown) => callApiAction<{ id: string }>("POST", `/api/v1/users/${encodeURIComponent(textId(input, "userId"))}/delegations/${encodeURIComponent(textId(input, "id"))}/revoke`, input, "Delegated access revoked.");

export const saveDocumentMetadataAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/documents", input, "Document metadata stored.");

export const saveRazorpayConfigurationAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/integrations/razorpay/config", input, "Razorpay configuration saved securely.");
export const saveIntegrationConfigAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/integrations/configs", input, "Integration configuration saved securely.");
export const setIntegrationStatusAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/integrations/configs/${encodeURIComponent(textId(input, "id"))}/status`, input, "Integration status updated.");
export const createApiKeyAction = (input: unknown) => callApiAction<{ id: string; secret: string }>("POST", "/api/v1/integrations/api-keys", input, "API key created. Copy the secret now.");
export const setApiKeyStatusAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/integrations/api-keys/${encodeURIComponent(textId(input, "id"))}/status`, input, "API key status updated.");

export const createClubAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/activities/clubs", input, "Club created.");
export const createAchievementAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/activities/achievements", input, "Achievement recorded.");
export const createClubMembershipAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/activities/clubs/memberships", input, "Student added to club.");
export const createSportsTeamAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/activities/sports/teams", input, "Sports team created.");
export const createSportsFixtureAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/activities/sports/fixtures", input, "Sports fixture scheduled.");
export const createAlumniProfileAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/alumni/profiles", input, "Alumni profile created.");
export const createAlumniEventAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/alumni/events", input, "Alumni event created.");
export const createAlumniEventRegistrationAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/alumni/events/registrations", input, "Attendee registered.");
export const createMentorshipAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/alumni/mentorship", input, "Mentorship request created.");
export const createJobBoardPostAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/alumni/jobs", input, "Job post saved as draft.");
export const createAlumniDonationAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/alumni/donations", input, "Donation recorded.");
export const createCmsPageAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/cms/pages", input, "CMS page created as draft.");
export const transitionCmsPageAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/cms/pages/${encodeURIComponent(textId(input, "id"))}/status`, input, "CMS page updated.");
export const createCmsMediaAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/cms/media", input, "CMS media registered.");
export const transitionCmsMediaAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/cms/media/${encodeURIComponent(textId(input, "id"))}/status`, input, "CMS media updated.");
export const createCmsFormAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/cms/forms", input, "CMS form created as draft.");
export const transitionCmsFormAction = (input: unknown) => callApiAction<{ id: string }>("PATCH", `/api/v1/cms/forms/${encodeURIComponent(textId(input, "id"))}/status`, input, "CMS form updated.");
export const createFormSubmissionAction = (input: unknown) => callApiAction<{ id: string }>("POST", "/api/v1/cms/submissions", input, "Form submission recorded.");
