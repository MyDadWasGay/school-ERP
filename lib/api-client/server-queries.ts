import "server-only";

import type { CurrentUser } from "@/lib/auth/types";
import { memoizeRequest } from "@/lib/server/request-memo";
import { SchoolErpApiError } from "./client";
import {
  createPublicServerApiClient,
  createServerApiClient,
} from "./server";

type AsyncResult<T> = T extends (...args: infer _Args) => infer Result
  ? Awaited<Result>
  : never;
type QueryValue = string | number | boolean | undefined;
type QueryInput = Record<string, QueryValue>;
type PageInput = { page?: number; pageSize?: number; search?: string };

type AccessService = typeof import("@/features/users/services/access.service");
type AttendanceWorkspaceService = typeof import("@/features/attendance/services/attendance-workspace.service");
type AttendanceExtensionService = typeof import("@/features/attendance/services/attendance-extension.service");
type LeaveService = typeof import("@/features/attendance/services/leave.service");
type DisciplineService = typeof import("@/features/attendance/services/discipline.service");
type StudentService = typeof import("@/features/students/services/students.service");
type StudentImportService = typeof import("@/features/import-export/services/student-import.service");
type FoundationService = typeof import("@/features/foundation/services/foundation.service");
type TransportService = typeof import("@/features/transport/services/transport.service");
type CommunicationService = typeof import("@/features/communication/services/communication.service");
type NoticeService = typeof import("@/features/communication/services/notice.service");
type LibraryService = typeof import("@/features/library/services/library.service");
type CanteenService = typeof import("@/features/canteen/services/canteen.service");
type HostelService = typeof import("@/features/hostel/services/hostel.service");
type AssetService = typeof import("@/features/assets/services/asset.service");
type InventoryService = typeof import("@/features/inventory/services/inventory.service");
type ProcurementService = typeof import("@/features/procurement/services/procurement.service");
type FacilitiesService = typeof import("@/features/facilities/services/facilities.service");
type SafetyService = typeof import("@/features/safety/services/safety.service");
type HrService = typeof import("@/features/hr/services/hr.service");
type AdmissionsService = typeof import("@/features/admissions/services/admissions.service");
type CommunityService = typeof import("@/features/community/services/community.service");
type HealthService = typeof import("@/features/health/services/health.service");
type FinanceWorkspaceService = typeof import("@/features/finance/services/finance-workspace.service");
type FeeConfigurationService = typeof import("@/features/finance/services/fee-configuration.service");
type AccountingService = typeof import("@/features/finance/services/accounting.service");
type IntegrationService = typeof import("@/features/integrations/services/integration.service");
type ExamWorkspaceService = typeof import("@/features/exams/services/exam-workspace.service");
type DeepExamService = typeof import("@/features/exams/services/deep-feature.service");

function withQuery(path: string, values: QueryInput) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `${path}?${encoded}` : path;
}

const dateKey = /(?:At|On|Date|Time|Birth)$/i;
const isoDate = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

function revive(value: unknown, key?: string): unknown {
  if (value instanceof Date) return value;
  if (typeof value === "string" && key && dateKey.test(key) && isoDate.test(value)) {
    return new Date(value);
  }
  if (Array.isArray(value)) return value.map((item) => revive(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
        childKey,
        revive(childValue, childKey),
      ]),
    );
  }
  return value;
}

function reviveApiDates<T>(value: unknown) {
  return revive(value) as T;
}

async function apiGet<T>(user: CurrentUser, path: string): Promise<T> {
  void user;
  const client = await createServerApiClient();
  const response = await client.call<T>("GET", path);
  return reviveApiDates<T>(response.data);
}

async function publicApiGet<T>(path: string): Promise<T> {
  const client = await createPublicServerApiClient();
  const response = await client.call<T>("GET", path);
  return reviveApiDates<T>(response.data);
}

function requestUserKey(user: CurrentUser) {
  return `${user.id}:${user.organizationId}:${user.campusId ?? "all"}`;
}

type LibraryIssuesPayload = {
  active: AsyncResult<LibraryService["listActiveLibraryIssues"]>;
  borrowers: AsyncResult<LibraryService["listLibraryBorrowers"]>;
};

function getLibraryIssues(user: CurrentUser) {
  return memoizeRequest(
    `api.library.issues:${requestUserKey(user)}`,
    () => apiGet<LibraryIssuesPayload>(user, "/api/v1/library/issues"),
  );
}

type AlumniEventsPayload = {
  events: AsyncResult<CommunityService["listAlumniEvents"]>;
  registrations: AsyncResult<CommunityService["listAlumniEventRegistrations"]>;
};

function getAlumniEvents(user: CurrentUser) {
  return memoizeRequest(
    `api.alumni.events:${requestUserKey(user)}`,
    () => apiGet<AlumniEventsPayload>(user, "/api/v1/alumni/events"),
  );
}

export async function getPublicCmsPage(
  organization: string,
  slug: string,
): Promise<AsyncResult<CommunityService["getPublicCmsPage"]> | null> {
  try {
    const data = await publicApiGet<{
      slug: string;
      title: string;
      body: string;
      seo: unknown;
      organization: string;
      timezone: string;
    }>(withQuery(`/api/v1/public/cms/pages/${encodeURIComponent(slug)}`, { organization }));
    return {
      page: {
        slug: data.slug,
        title: data.title,
        body: data.body,
        seoJson: data.seo ? JSON.stringify(data.seo) : null,
      },
      organizationName: data.organization,
      timezone: data.timezone,
    } as AsyncResult<CommunityService["getPublicCmsPage"]>;
  } catch (error) {
    if (error instanceof SchoolErpApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getUserAccessDetail(user: CurrentUser, id: string): Promise<AsyncResult<AccessService["getUserAccessDetail"]>> {
  return apiGet(user, `/api/v1/users/${encodeURIComponent(id)}/access`);
}

export async function listUsersPage(user: CurrentUser, input: PageInput): Promise<AsyncResult<AccessService["listUsersPage"]>> {
  return apiGet(user, withQuery("/api/v1/users", input));
}

export async function listCampuses(user: CurrentUser): Promise<AsyncResult<FoundationService["listCampuses"]>> {
  return apiGet(user, "/api/v1/campuses");
}

export async function listTransportRoutes(user: CurrentUser): Promise<AsyncResult<TransportService["listTransportRoutes"]>> {
  return apiGet(user, "/api/v1/transport/routes");
}

export async function listTransportVehicles(user: CurrentUser): Promise<AsyncResult<TransportService["listTransportVehicles"]>> {
  return apiGet(user, "/api/v1/transport/vehicles");
}

export async function listVehicleDocuments(user: CurrentUser): Promise<AsyncResult<TransportService["listVehicleDocuments"]>> {
  return apiGet(user, "/api/v1/transport/documents");
}

export async function listTransportStops(user: CurrentUser): Promise<AsyncResult<TransportService["listTransportStops"]>> {
  return apiGet(user, "/api/v1/transport/stops");
}

export async function listTransportStudents(user: CurrentUser): Promise<AsyncResult<TransportService["listTransportStudents"]>> {
  return apiGet(user, "/api/v1/transport/students");
}

export async function listRouteAllocations(user: CurrentUser): Promise<AsyncResult<TransportService["listRouteAllocations"]>> {
  return apiGet(user, "/api/v1/transport/allocations");
}

export async function listNotifications(user: CurrentUser): Promise<AsyncResult<CommunicationService["listNotifications"]>> {
  return apiGet(user, "/api/v1/communication/notifications");
}

export async function listMessages(user: CurrentUser): Promise<AsyncResult<CommunicationService["listMessages"]>> {
  return apiGet(user, "/api/v1/communication/messages");
}

export async function listNotificationDelivery(user: CurrentUser): Promise<AsyncResult<CommunicationService["listNotificationDelivery"]>> {
  return apiGet(user, "/api/v1/communication/notification-delivery");
}

export async function listNotices(user: CurrentUser): Promise<AsyncResult<NoticeService["listNotices"]>> {
  return apiGet(user, "/api/v1/communication/notices");
}

export async function listLibraryItems(user: CurrentUser, search?: string): Promise<AsyncResult<LibraryService["listLibraryItems"]>> {
  return apiGet(user, withQuery("/api/v1/library/items", { search }));
}

export async function listLibraryCopies(user: CurrentUser, itemId?: string, availableOnly = true): Promise<AsyncResult<LibraryService["listLibraryCopies"]>> {
  return apiGet(user, withQuery("/api/v1/library/copies", { itemId, availableOnly }));
}

export async function listActiveLibraryIssues(user: CurrentUser): Promise<AsyncResult<LibraryService["listActiveLibraryIssues"]>> {
  const data = await getLibraryIssues(user);
  return data.active;
}

export async function listLibraryBorrowers(user: CurrentUser): Promise<AsyncResult<LibraryService["listLibraryBorrowers"]>> {
  const data = await getLibraryIssues(user);
  return data.borrowers;
}

export async function listLibraryReservations(user: CurrentUser): Promise<AsyncResult<LibraryService["listLibraryReservations"]>> {
  return apiGet(user, "/api/v1/library/reservations");
}

export async function listDigitalResources(user: CurrentUser): Promise<AsyncResult<LibraryService["listDigitalResources"]>> {
  return apiGet(user, "/api/v1/library/digital-resources");
}

export async function listCanteenStudents(user: CurrentUser): Promise<AsyncResult<CanteenService["listCanteenStudents"]>> {
  return apiGet(user, "/api/v1/canteen/students");
}

export async function listCanteenTransactions(user: CurrentUser): Promise<AsyncResult<CanteenService["listCanteenTransactions"]>> {
  return apiGet(user, "/api/v1/canteen/transactions");
}

export async function listMenus(user: CurrentUser): Promise<AsyncResult<CanteenService["listMenus"]>> {
  return apiGet(user, "/api/v1/canteen/menu");
}

export async function listHostelRooms(user: CurrentUser): Promise<AsyncResult<HostelService["listHostelRooms"]>> {
  return apiGet(user, "/api/v1/hostel/rooms");
}

export async function listHostelBeds(user: CurrentUser): Promise<AsyncResult<HostelService["listHostelBeds"]>> {
  return apiGet(user, "/api/v1/hostel/beds");
}

export async function listHostelStudents(user: CurrentUser): Promise<AsyncResult<HostelService["listHostelStudents"]>> {
  return apiGet(user, "/api/v1/hostel/students");
}

export async function listHostelAllotments(user: CurrentUser): Promise<AsyncResult<HostelService["listHostelAllotments"]>> {
  return apiGet(user, "/api/v1/hostel/allotments");
}

export async function getAttendanceStudentOptions(user: CurrentUser, search?: string): Promise<AsyncResult<AttendanceWorkspaceService["getAttendanceStudentOptions"]>> {
  return apiGet(user, withQuery("/api/v1/attendance/students/options", { search }));
}

export async function getAttendanceOverview(user: CurrentUser): Promise<AsyncResult<AttendanceWorkspaceService["getAttendanceOverview"]>> {
  return apiGet(user, "/api/v1/attendance/overview");
}

export async function listAttendancePage(user: CurrentUser, input?: { page?: number; pageSize?: number; date?: string }): Promise<AsyncResult<AttendanceWorkspaceService["listAttendancePage"]>> {
  return apiGet(user, withQuery("/api/v1/attendance/students", input ?? {}));
}

export async function listAttendanceCorrections(user: CurrentUser): Promise<AsyncResult<AttendanceWorkspaceService["listAttendanceCorrections"]>> {
  return apiGet(user, "/api/v1/attendance/corrections");
}

export async function listEmployeeOptions(user: CurrentUser): Promise<AsyncResult<AttendanceExtensionService["listEmployeeOptions"]>> {
  return apiGet(user, "/api/v1/attendance/staff/options");
}

export async function listStaffAttendance(user: CurrentUser): Promise<AsyncResult<AttendanceExtensionService["listStaffAttendance"]>> {
  return apiGet(user, "/api/v1/attendance/staff");
}

export async function listLowAttendance(user: CurrentUser, threshold?: number): Promise<AsyncResult<AttendanceExtensionService["listLowAttendance"]>> {
  return apiGet(user, withQuery("/api/v1/attendance/low", { threshold }));
}

export async function listLeaveRequests(user: CurrentUser): Promise<AsyncResult<LeaveService["listLeaveRequests"]>> {
  return apiGet(user, "/api/v1/attendance/leave");
}

export async function listDisciplineIncidents(user: CurrentUser): Promise<AsyncResult<DisciplineService["listDisciplineIncidents"]>> {
  return apiGet(user, "/api/v1/attendance/discipline");
}

export async function listStudents(user: CurrentUser): Promise<AsyncResult<StudentService["listStudents"]>> {
  return apiGet(user, "/api/v1/students/options");
}

export async function getStudentFormOptions(user: CurrentUser): Promise<AsyncResult<StudentService["getStudentFormOptions"]>> {
  return apiGet(user, "/api/v1/students/form-options");
}

export async function getStudentProfile(user: CurrentUser, id: string): Promise<AsyncResult<StudentService["getStudentProfile"]>> {
  return apiGet(user, `/api/v1/students/${encodeURIComponent(id)}`);
}

export async function getMyStudentProfile(user: CurrentUser): Promise<AsyncResult<StudentService["getMyStudentProfile"]>> {
  return apiGet(user, "/api/v1/students/me");
}

export async function getStudentMedicalProfile(user: CurrentUser, id: string): Promise<AsyncResult<StudentService["getStudentMedicalProfile"]>> {
  return apiGet(user, `/api/v1/students/${encodeURIComponent(id)}/medical`);
}

export async function listStudentImportJobs(user: CurrentUser): Promise<AsyncResult<StudentImportService["listStudentImportJobs"]>> {
  return apiGet(user, "/api/v1/imports/students");
}

export async function listAllAssets(user: CurrentUser): Promise<AsyncResult<AssetService["listAllAssets"]>> {
  return apiGet(user, "/api/v1/assets/all");
}

export async function listAssets(user: CurrentUser): Promise<AsyncResult<AssetService["listAssets"]>> {
  return apiGet(user, "/api/v1/assets");
}

export async function listAssetAssignments(user: CurrentUser): Promise<AsyncResult<AssetService["listAssetAssignments"]>> {
  return apiGet(user, "/api/v1/assets/assignments");
}

export async function listAssetMaintenance(user: CurrentUser): Promise<AsyncResult<AssetService["listAssetMaintenance"]>> {
  return apiGet(user, "/api/v1/assets/maintenance");
}

export async function listAssetDepreciation(user: CurrentUser): Promise<AsyncResult<AssetService["listAssetDepreciation"]>> {
  return apiGet(user, "/api/v1/assets/depreciation");
}

export async function listSuppliers(user: CurrentUser): Promise<AsyncResult<InventoryService["listSuppliers"]>> {
  return apiGet(user, "/api/v1/inventory/suppliers");
}

export async function listInventoryItems(user: CurrentUser, search?: string): Promise<AsyncResult<InventoryService["listInventoryItems"]>> {
  return apiGet(user, withQuery("/api/v1/inventory/items", { search }));
}

export async function listStockMovements(user: CurrentUser): Promise<AsyncResult<InventoryService["listStockMovements"]>> {
  return apiGet(user, "/api/v1/inventory/stock-movements");
}

export async function listRequisitions(user: CurrentUser): Promise<AsyncResult<ProcurementService["listRequisitions"]>> {
  return apiGet(user, "/api/v1/procurement/requisitions");
}

export async function listPurchaseOrders(user: CurrentUser): Promise<AsyncResult<ProcurementService["listPurchaseOrders"]>> {
  return apiGet(user, "/api/v1/procurement/purchase-orders");
}

export async function listGoodsReceipts(user: CurrentUser): Promise<AsyncResult<ProcurementService["listGoodsReceipts"]>> {
  return apiGet(user, "/api/v1/procurement/goods-receipts");
}

export async function listFacilityBookings(user: CurrentUser): Promise<AsyncResult<FacilitiesService["listFacilityBookings"]>> {
  return apiGet(user, "/api/v1/facilities/bookings");
}

export async function listFacilityMaintenance(user: CurrentUser): Promise<AsyncResult<FacilitiesService["listFacilityMaintenance"]>> {
  return apiGet(user, "/api/v1/facilities/maintenance");
}

export async function listFacilityComplaints(user: CurrentUser): Promise<AsyncResult<FacilitiesService["listFacilityComplaints"]>> {
  return apiGet(user, "/api/v1/facilities/complaints");
}

export async function listVisitors(user: CurrentUser): Promise<AsyncResult<SafetyService["listVisitors"]>> {
  return apiGet(user, "/api/v1/safety/visitors");
}

export async function listGatePasses(user: CurrentUser): Promise<AsyncResult<SafetyService["listGatePasses"]>> {
  return apiGet(user, "/api/v1/safety/gate-passes");
}

export async function listSecurityIncidents(user: CurrentUser): Promise<AsyncResult<SafetyService["listSecurityIncidents"]>> {
  return apiGet(user, "/api/v1/safety/incidents");
}

export async function listEvacuations(user: CurrentUser): Promise<AsyncResult<SafetyService["listEvacuations"]>> {
  return apiGet(user, "/api/v1/safety/evacuation");
}

export async function listEmployees(user: CurrentUser, search?: string): Promise<AsyncResult<HrService["listEmployees"]>> {
  return apiGet(user, withQuery("/api/v1/hr/employees", { search }));
}

export async function listPayrollRuns(user: CurrentUser): Promise<AsyncResult<HrService["listPayrollRuns"]>> {
  return apiGet(user, "/api/v1/payroll/runs");
}

export async function listPayslips(user: CurrentUser): Promise<AsyncResult<HrService["listPayslips"]>> {
  return apiGet(user, "/api/v1/payroll/payslips");
}

export async function getAdmissionOptions(user: CurrentUser, options: { allAccessibleCampuses?: boolean } = {}): Promise<AsyncResult<AdmissionsService["getAdmissionOptions"]>> {
  return apiGet(user, withQuery("/api/v1/admissions/options", { allCampuses: options.allAccessibleCampuses }));
}

export async function listEnquiriesPage(user: CurrentUser, input: PageInput): Promise<AsyncResult<AdmissionsService["listEnquiriesPage"]>> {
  return apiGet(user, withQuery("/api/v1/admissions/enquiries", input));
}

export async function listApplicationsPage(user: CurrentUser, input: PageInput): Promise<AsyncResult<AdmissionsService["listApplicationsPage"]>> {
  return apiGet(user, withQuery("/api/v1/admissions/applications", input));
}

export async function listApprovalQueue(user: CurrentUser): Promise<AsyncResult<AdmissionsService["listApprovalQueue"]>> {
  return apiGet(user, "/api/v1/admissions/approvals");
}

export async function getAdmissionSeatMatrix(user: CurrentUser, input: Parameters<AdmissionsService["getAdmissionSeatMatrix"]>[1] = {}): Promise<AsyncResult<AdmissionsService["getAdmissionSeatMatrix"]>> {
  return apiGet(user, withQuery("/api/v1/admissions/seat-matrix", input));
}

export async function listClubs(user: CurrentUser): Promise<AsyncResult<CommunityService["listClubs"]>> {
  return apiGet(user, "/api/v1/activities/clubs");
}

export async function listAchievements(user: CurrentUser): Promise<AsyncResult<CommunityService["listAchievements"]>> {
  return apiGet(user, "/api/v1/activities/achievements");
}

export async function listClubMemberships(user: CurrentUser): Promise<AsyncResult<CommunityService["listClubMemberships"]>> {
  return apiGet(user, "/api/v1/activities/clubs/memberships");
}

export async function listSportsTeams(user: CurrentUser): Promise<AsyncResult<CommunityService["listSportsTeams"]>> {
  return apiGet(user, "/api/v1/activities/sports/teams");
}

export async function listSportsFixtures(user: CurrentUser): Promise<AsyncResult<CommunityService["listSportsFixtures"]>> {
  return apiGet(user, "/api/v1/activities/sports/fixtures");
}

export async function listAlumniProfiles(user: CurrentUser): Promise<AsyncResult<CommunityService["listAlumniProfiles"]>> {
  return apiGet(user, "/api/v1/alumni/profiles");
}

export async function listAlumniEvents(user: CurrentUser): Promise<AsyncResult<CommunityService["listAlumniEvents"]>> {
  const data = await getAlumniEvents(user);
  return data.events;
}

export async function listAlumniEventRegistrations(user: CurrentUser): Promise<AsyncResult<CommunityService["listAlumniEventRegistrations"]>> {
  const data = await getAlumniEvents(user);
  return data.registrations;
}

export async function listMentorships(user: CurrentUser): Promise<AsyncResult<CommunityService["listMentorships"]>> {
  return apiGet(user, "/api/v1/alumni/mentorship");
}

export async function listJobBoardPosts(user: CurrentUser): Promise<AsyncResult<CommunityService["listJobBoardPosts"]>> {
  return apiGet(user, "/api/v1/alumni/jobs");
}

export async function listAlumniDonations(user: CurrentUser): Promise<AsyncResult<CommunityService["listAlumniDonations"]>> {
  return apiGet(user, "/api/v1/alumni/donations");
}

export async function listCmsPages(user: CurrentUser): Promise<AsyncResult<CommunityService["listCmsPages"]>> {
  return apiGet(user, "/api/v1/cms/pages");
}

export async function listCmsMedia(user: CurrentUser): Promise<AsyncResult<CommunityService["listCmsMedia"]>> {
  return apiGet(user, "/api/v1/cms/media");
}

export async function listCmsForms(user: CurrentUser): Promise<AsyncResult<CommunityService["listCmsForms"]>> {
  return apiGet(user, "/api/v1/cms/forms");
}

export async function listFormSubmissions(user: CurrentUser): Promise<AsyncResult<CommunityService["listFormSubmissions"]>> {
  return apiGet(user, "/api/v1/cms/submissions");
}

export async function listHealthProfiles(user: CurrentUser): Promise<AsyncResult<HealthService["listHealthProfiles"]>> {
  return apiGet(user, "/api/v1/health/profiles");
}

export async function listHealthStudents(user: CurrentUser): Promise<AsyncResult<HealthService["listHealthStudents"]>> {
  return apiGet(user, "/api/v1/health/students");
}

export async function listClinicVisits(user: CurrentUser): Promise<AsyncResult<HealthService["listClinicVisits"]>> {
  return apiGet(user, "/api/v1/health/clinic-visits");
}

export async function getRefundOptions(user: CurrentUser): Promise<AsyncResult<FinanceWorkspaceService["getRefundOptions"]>> {
  return apiGet(user, "/api/v1/fees/refunds/options");
}

export async function getPaymentOptions(user: CurrentUser): Promise<AsyncResult<FinanceWorkspaceService["getPaymentOptions"]>> {
  return apiGet(user, "/api/v1/fees/payments/options");
}

export async function listPayments(user: CurrentUser): Promise<AsyncResult<FinanceWorkspaceService["listPayments"]>> {
  return apiGet(user, "/api/v1/fees/payments");
}

export async function getInvoiceStudentOptions(user: CurrentUser): Promise<AsyncResult<FinanceWorkspaceService["getInvoiceStudentOptions"]>> {
  return apiGet(user, "/api/v1/fees/invoices/options");
}

export async function listInvoicesPage(user: CurrentUser, input: PageInput): Promise<AsyncResult<FinanceWorkspaceService["listInvoicesPage"]>> {
  return apiGet(user, withQuery("/api/v1/fees/invoices", input));
}

export async function listFeeConfiguration(user: CurrentUser): Promise<AsyncResult<FeeConfigurationService["listFeeConfiguration"]>> {
  return apiGet(user, "/api/v1/fees/configuration");
}

export async function listDonations(user: CurrentUser): Promise<AsyncResult<AccountingService["listDonations"]>> {
  return apiGet(user, "/api/v1/accounts/donations");
}

export async function listApiKeys(user: CurrentUser): Promise<AsyncResult<IntegrationService["listApiKeys"]>> {
  return apiGet(user, "/api/v1/integrations/api-keys");
}

export async function listIntegrationConfigs(user: CurrentUser): Promise<AsyncResult<IntegrationService["listIntegrationConfigs"]>> {
  return apiGet(user, "/api/v1/integrations/configs");
}

export async function listIntegrationLogs(user: CurrentUser): Promise<AsyncResult<IntegrationService["listIntegrationLogs"]>> {
  return apiGet(user, "/api/v1/integrations/logs");
}

export async function listWebhookEvents(user: CurrentUser): Promise<AsyncResult<IntegrationService["listWebhookEvents"]>> {
  return apiGet(user, "/api/v1/integrations/webhook-events");
}

export async function getExamWorkspaceOptions(user: CurrentUser): Promise<AsyncResult<ExamWorkspaceService["getExamWorkspaceOptions"]>> {
  return apiGet(user, "/api/v1/exams/workspace/options");
}

export async function getExamPlanningOptions(user: CurrentUser): Promise<AsyncResult<ExamWorkspaceService["getExamPlanningOptions"]>> {
  return apiGet(user, "/api/v1/exams/planning/options");
}

export async function listExamPlanning(user: CurrentUser): Promise<AsyncResult<ExamWorkspaceService["listExamPlanning"]>> {
  return apiGet(user, "/api/v1/exams/planning");
}

export async function listExamResults(user: CurrentUser): Promise<AsyncResult<ExamWorkspaceService["listExamResults"]>> {
  return apiGet(user, "/api/v1/exams/results");
}

export async function getDeepExamOptions(user: CurrentUser): Promise<AsyncResult<DeepExamService["getDeepExamOptions"]>> {
  return apiGet(user, "/api/v1/exams/deep/options");
}

export async function listQuestionBank(user: CurrentUser): Promise<AsyncResult<DeepExamService["listQuestionBank"]>> {
  return apiGet(user, "/api/v1/exams/question-bank");
}

export async function listReportCards(user: CurrentUser): Promise<AsyncResult<DeepExamService["listReportCards"]>> {
  return apiGet(user, "/api/v1/exams/report-cards");
}
