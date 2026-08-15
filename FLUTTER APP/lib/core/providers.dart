import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../shared/models/academic_models.dart';
import '../shared/models/admission_models.dart';
import '../shared/models/asset_models.dart';
import '../shared/models/attendance_models.dart';
import '../shared/models/communication_models.dart';
import '../shared/models/exam_models.dart';
import '../shared/models/finance_models.dart';
import '../shared/models/hr_models.dart';
import '../shared/models/admin_models.dart';
import '../shared/models/identity_models.dart';
import '../shared/models/leave_models.dart';
import '../shared/models/library_models.dart';
import '../shared/models/operations_models.dart';
import '../shared/models/student_models.dart';
import '../shared/models/teacher_models.dart';
import '../shared/models/transport_models.dart';
import '../shared/models/workspace_models.dart';
import 'api/api_client.dart';
import 'api/api_error.dart';
import 'auth/auth_gateway.dart';
import 'config/app_config.dart';
import 'storage/campus_store.dart';
import 'storage/attendance_draft_store.dart';

final firebaseAuthProvider = Provider<FirebaseAuth>(
  (ref) => FirebaseAuth.instance,
);
final authGatewayProvider = Provider<AuthGateway>(
  (ref) => FirebaseAuthGateway(ref.watch(firebaseAuthProvider)),
);
final authStateProvider = StreamProvider<User?>(
  (ref) => ref.watch(authGatewayProvider).authStateChanges(),
);
final currentCampusIdProvider = StateProvider<String?>((ref) => null);
final selectedStudentIdProvider = StateProvider<String?>((ref) => null);
final campusStoreProvider = Provider<CampusStore>(
  (ref) => CampusStore(SharedPreferencesAsync()),
);
final attendanceDraftStoreProvider = Provider<AttendanceDraftStore>(
  (ref) => AttendanceDraftStore(SharedPreferencesAsync()),
);

final apiClientProvider = Provider<ApiClient>((ref) {
  final config = ref.watch(appConfigProvider);
  final auth = ref.watch(authGatewayProvider);
  return ApiClient(
    baseUrl: config.apiBaseUrl,
    tokenLoader: ({forceRefresh = false}) =>
        auth.getIdToken(forceRefresh: forceRefresh),
    campusId: () => ref.read(currentCampusIdProvider),
  );
});

final sessionProvider = AsyncNotifierProvider<SessionController, CurrentUser>(
  SessionController.new,
);

class SessionController extends AsyncNotifier<CurrentUser> {
  @override
  Future<CurrentUser> build() async {
    final authUser = await ref.watch(authStateProvider.future);
    if (authUser == null) throw const AuthException('Sign in is required.');
    final store = ref.read(campusStoreProvider);
    final storedCampus = await store.read();
    final api = ref.read(apiClientProvider);
    try {
      final me = await api.getMe(
        campusOverride: storedCampus,
        omitCampus: storedCampus == null,
      );
      ref.read(currentCampusIdProvider.notifier).state = me.campus?.id;
      if (me.campus != null) await store.write(me.campus!.id);
      return me;
    } on ApiError catch (error) {
      if (storedCampus == null || error.kind != ApiErrorKind.forbidden) rethrow;
      await store.clear();
      ref.read(currentCampusIdProvider.notifier).state = null;
      final me = await api.getMe(omitCampus: true);
      if (me.campus != null) await store.write(me.campus!.id);
      ref.read(currentCampusIdProvider.notifier).state = me.campus?.id;
      return me;
    }
  }

  Future<void> selectCampus(Campus campus) async {
    final previous = ref.read(currentCampusIdProvider);
    ref.read(currentCampusIdProvider.notifier).state = campus.id;
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final me = await ref
          .read(apiClientProvider)
          .getMe(campusOverride: campus.id);
      await ref.read(campusStoreProvider).write(campus.id);
      ref.invalidate(portalProvider);
      ref.invalidate(managementDashboardProvider);
      ref.invalidate(notificationsProvider);
      ref.invalidate(studentOverviewProvider);
      ref.invalidate(noticesProvider);
      ref.invalidate(messagesProvider);
      ref.invalidate(academicRecordsProvider);
      ref.invalidate(leaveRequestsProvider);
      ref.invalidate(studentOptionsProvider);
      ref.invalidate(teacherAttendanceProvider);
      ref.invalidate(teacherAttendanceForDateProvider);
      ref.invalidate(attendanceOverviewProvider);
      ref.invalidate(attendanceCorrectionsProvider);
      ref.invalidate(lowAttendanceProvider);
      ref.invalidate(disciplineIncidentsProvider);
      ref.invalidate(libraryProvider);
      ref.invalidate(libraryCopiesProvider);
      ref.invalidate(libraryReservationsProvider);
      ref.invalidate(transportProvider);
      ref.invalidate(transportRoutesProvider);
      ref.invalidate(transportVehiclesProvider);
      ref.invalidate(transportStopsProvider);
      ref.invalidate(transportDocumentsProvider);
      ref.invalidate(transportStudentsProvider);
      ref.invalidate(examWorkspaceOptionsProvider);
      ref.invalidate(examPlanningOptionsProvider);
      ref.invalidate(examPlanningProvider);
      ref.invalidate(examResultsProvider);
      ref.invalidate(questionBankProvider);
      ref.invalidate(deepExamOptionsProvider);
      ref.invalidate(reportCardsProvider);
      ref.invalidate(admissionApprovalsProvider);
      ref.invalidate(admissionOptionsProvider);
      ref.invalidate(admissionSeatMatrixProvider);
      ref.invalidate(admissionApplicationsProvider);
      ref.invalidate(admissionEnquiriesProvider);
      ref.invalidate(financeInvoicesProvider);
      ref.invalidate(paymentOptionsProvider);
      ref.invalidate(paymentsProvider);
      ref.invalidate(employeesProvider);
      ref.invalidate(payrollRunsProvider);
      ref.invalidate(payslipsProvider);
      ref.invalidate(studentDirectoryProvider);
      ref.invalidate(studentFormOptionsProvider);
      ref.invalidate(studentMedicalProvider);
      ref.invalidate(employeesSearchProvider);
      ref.invalidate(safetyVisitorsProvider);
      ref.invalidate(safetyGatePassesProvider);
      ref.invalidate(safetyIncidentsProvider);
      ref.invalidate(healthStudentsProvider);
      ref.invalidate(healthProfilesProvider);
      ref.invalidate(clinicVisitsProvider);
      ref.invalidate(assetsProvider);
      ref.invalidate(assetAssignmentsProvider);
      ref.invalidate(assetMaintenanceProvider);
      ref.invalidate(assetDepreciationProvider);
      ref.invalidate(inventorySuppliersProvider);
      ref.invalidate(inventoryItemsProvider);
      ref.invalidate(stockMovementsProvider);
      ref.invalidate(procurementRequisitionsProvider);
      ref.invalidate(procurementPurchaseOrdersProvider);
      ref.invalidate(procurementGoodsReceiptsProvider);
      ref.invalidate(facilityBookingsProvider);
      ref.invalidate(facilityMaintenanceProvider);
      ref.invalidate(facilityComplaintsProvider);
      ref.invalidate(hostelRoomsProvider);
      ref.invalidate(hostelBedsProvider);
      ref.invalidate(hostelStudentsProvider);
      ref.invalidate(hostelAllotmentsProvider);
      ref.invalidate(canteenMenuProvider);
      ref.invalidate(canteenStudentsProvider);
      ref.invalidate(canteenTransactionsProvider);
      ref.invalidate(financeRefundOptionsProvider);
      ref.invalidate(financeAccountsProvider);
      ref.invalidate(financeExpensesProvider);
      ref.invalidate(financeLedgerProvider);
      ref.invalidate(financeDonationsProvider);
      ref.invalidate(feeConfigurationProvider);
      ref.invalidate(invoiceStudentOptionsProvider);
      ref.invalidate(staffAttendanceProvider);
      ref.invalidate(employeeAttendanceOptionsProvider);
      ref.invalidate(adminCampusesProvider);
      ref.invalidate(academicSetupOptionsProvider);
      ref.invalidate(adminUsersProvider);
      ref.invalidate(adminUserAccessProvider);
      for (final kind in _academicSetupKinds) {
        ref.invalidate(academicSetupProvider(kind));
      }
      return me;
    });
    if (state.hasError) {
      ref.read(currentCampusIdProvider.notifier).state = previous;
    }
  }
}

String? portalForRole(String role) => switch (role) {
  'student' => 'student',
  'parent' => 'parent',
  'teacher' => 'teacher',
  _ => null,
};

final portalProvider = FutureProvider<PortalSnapshot?>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  final portal = portalForRole(me.role);
  if (portal == null || !me.can('portals:read')) return null;
  final snapshot = await ref.watch(apiClientProvider).getPortal(portal);
  final selected = ref.read(selectedStudentIdProvider);
  if (selected == null && snapshot.students.isNotEmpty) {
    Future.microtask(
      () => ref.read(selectedStudentIdProvider.notifier).state =
          me.linkedStudentId ?? snapshot.students.first.id,
    );
  }
  return snapshot;
});

final managementDashboardProvider = FutureProvider<ManagementDashboard?>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('analytics:read')) return null;
  return ref.watch(apiClientProvider).getManagementDashboard();
});

final notificationsProvider = FutureProvider<PagedRows<NotificationRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('communication:read')) {
    return const PagedRows(
      rows: [],
      pageInfo: PageInfo(page: 1, pageSize: 0, total: 0, pageCount: 0),
    );
  }
  return ref.watch(apiClientProvider).getNotifications();
});

final noticesProvider = FutureProvider<List<NoticeRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('communication:read')) return const [];
  return ref.watch(apiClientProvider).getNotices();
});

final messagesProvider = FutureProvider<List<CommunicationMessageRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('communication:read')) return const [];
  return ref.watch(apiClientProvider).getMessages();
});

final academicRecordsProvider =
    FutureProvider.family<List<AcademicRecord>, String>((ref, kind) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('academics:read')) return const [];
      return ref.watch(apiClientProvider).getAcademicRecords(kind);
    });

final leaveRequestsProvider = FutureProvider<List<LeaveRequest>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('attendance:read')) return const [];
  return ref.watch(apiClientProvider).getLeaveRequests();
});

final studentOptionsProvider = FutureProvider<List<StudentOption>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('attendance:read')) return const [];
  return ref.watch(apiClientProvider).getStudentOptions();
});

final teacherAttendanceProvider = FutureProvider<TeacherAttendancePage>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('attendance:read')) {
    return TeacherAttendancePage(
      rows: const [],
      pageInfo: const PageInfo(page: 1, pageSize: 0, total: 0, pageCount: 0),
      attendanceDate: _todayKey(),
    );
  }
  return ref
      .watch(apiClientProvider)
      .getTeacherAttendance(date: DateTime.now());
});

final teacherAttendanceForDateProvider =
    FutureProvider.family<TeacherAttendancePage, String>((ref, dateKey) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('attendance:read')) {
        return TeacherAttendancePage(
          rows: const [],
          pageInfo: const PageInfo(
            page: 1,
            pageSize: 0,
            total: 0,
            pageCount: 0,
          ),
          attendanceDate: dateKey,
        );
      }
      return ref
          .watch(apiClientProvider)
          .getTeacherAttendance(date: DateTime.parse(dateKey));
    });

final attendanceOverviewProvider = FutureProvider<AttendanceOverview>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('attendance:read')) {
    return const AttendanceOverview(
      total: 0,
      attended: 0,
      rate: 0,
      states: [],
      groups: [],
    );
  }
  return ref.watch(apiClientProvider).getAttendanceOverview();
});

final attendanceCorrectionsProvider =
    FutureProvider<List<AttendanceCorrectionRow>>((ref) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('attendance:read')) return const [];
      return ref.watch(apiClientProvider).getAttendanceCorrections();
    });

final lowAttendanceProvider =
    FutureProvider.family<List<LowAttendanceRow>, double>((
      ref,
      threshold,
    ) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('attendance:read')) return const [];
      return ref
          .watch(apiClientProvider)
          .getLowAttendance(threshold: threshold);
    });

final disciplineIncidentsProvider = FutureProvider<List<DisciplineIncidentRow>>(
  (ref) async {
    final me = await ref.watch(sessionProvider.future);
    if (!me.can('safety:read')) return const [];
    return ref.watch(apiClientProvider).getDisciplineIncidents();
  },
);

final academicOptionsProvider =
    FutureProvider.family<List<AcademicOption>, String>((ref, kind) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('academics:read')) return const [];
      return ref.watch(apiClientProvider).getAcademicOptions(kind);
    });

final libraryProvider = FutureProvider<LibraryOverview?>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('library:read')) return null;
  return ref.watch(apiClientProvider).getLibraryOverview();
});

final libraryCopiesProvider = FutureProvider<List<LibraryCopyRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('library:read')) return const [];
  return ref.watch(apiClientProvider).getLibraryCopies();
});

final libraryReservationsProvider = FutureProvider<List<LibraryReservationRow>>(
  (ref) async {
    final me = await ref.watch(sessionProvider.future);
    if (!me.can('library:read')) return const [];
    return ref.watch(apiClientProvider).getLibraryReservations();
  },
);

final transportProvider = FutureProvider<List<TransportAllocation>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('transport:read')) return const [];
  return ref.watch(apiClientProvider).getTransportAllocations();
});

final transportRoutesProvider = FutureProvider<List<TransportRouteRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('transport:read')) return const [];
  return ref.watch(apiClientProvider).getTransportRoutes();
});

final transportVehiclesProvider = FutureProvider<List<TransportVehicleRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('transport:read')) return const [];
  return ref.watch(apiClientProvider).getTransportVehicles();
});

final transportStopsProvider = FutureProvider<List<TransportStopRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('transport:read')) return const [];
  return ref.watch(apiClientProvider).getTransportStops();
});

final transportDocumentsProvider = FutureProvider<List<TransportDocumentRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('transport:read')) return const [];
  return ref.watch(apiClientProvider).getTransportDocuments();
});

final transportStudentsProvider = FutureProvider<List<TransportStudentOption>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('transport:read')) return const [];
  return ref.watch(apiClientProvider).getTransportStudents();
});

final examWorkspaceOptionsProvider = FutureProvider<ExamWorkspaceOptions?>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('exams:read')) return null;
  return ref.watch(apiClientProvider).getExamWorkspaceOptions();
});

final examPlanningOptionsProvider = FutureProvider<ExamPlanningOptions?>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('exams:read')) return null;
  return ref.watch(apiClientProvider).getExamPlanningOptions();
});

final examPlanningProvider = FutureProvider<List<ExamPlanningRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('exams:read')) return const [];
  return ref.watch(apiClientProvider).getExamPlanning();
});

final examResultsProvider = FutureProvider<List<ExamResultSummary>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('exams:read')) return const [];
  return ref.watch(apiClientProvider).getExamResults();
});

final questionBankProvider = FutureProvider<List<QuestionBankRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('exams:read')) return const [];
  return ref.watch(apiClientProvider).getQuestionBank();
});

final deepExamOptionsProvider = FutureProvider<DeepExamOptions?>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('exams:read')) return null;
  return ref.watch(apiClientProvider).getDeepExamOptions();
});

final reportCardsProvider = FutureProvider<List<ReportCardRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('exams:read')) return const [];
  return ref.watch(apiClientProvider).getReportCards();
});

final admissionApprovalsProvider = FutureProvider<List<AdmissionApproval>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('admissions:read')) return const [];
  return ref.watch(apiClientProvider).getAdmissionApprovals();
});

final admissionOptionsProvider = FutureProvider<AdmissionOptions?>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('admissions:read')) return null;
  return ref.watch(apiClientProvider).getAdmissionOptions();
});

final admissionSeatMatrixProvider =
    FutureProvider<List<AdmissionSeatMatrixRow>>((ref) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('admissions:read')) return const [];
      return ref.watch(apiClientProvider).getAdmissionSeatMatrix();
    });

final admissionApplicationsProvider =
    FutureProvider<PagedRows<AdmissionApplication>>((ref) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('admissions:read')) return _emptyPage();
      return ref.watch(apiClientProvider).getAdmissionApplications();
    });

final admissionEnquiriesProvider =
    FutureProvider.family<PagedRows<AdmissionEnquiry>, String>((
      ref,
      search,
    ) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('admissions:read')) return _emptyPage();
      return ref.watch(apiClientProvider).getAdmissionEnquiries(search: search);
    });

final financeInvoicesProvider = FutureProvider<PagedRows<FinanceInvoiceRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('fees:read')) return _emptyPage();
  return ref.watch(apiClientProvider).getFinanceInvoices();
});

final paymentOptionsProvider = FutureProvider<List<PaymentOption>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('fees:read')) return const [];
  return ref.watch(apiClientProvider).getPaymentOptions();
});

final paymentsProvider = FutureProvider<List<PaymentRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('fees:read')) return const [];
  return ref.watch(apiClientProvider).getPayments();
});

final financeRefundOptionsProvider = FutureProvider<List<FinanceRefundOption>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('fees:read')) return const [];
  return ref.watch(apiClientProvider).getRefundOptions();
});

final financeAccountsProvider = FutureProvider<List<FinanceAccountRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('accounts:read')) return const [];
  return ref.watch(apiClientProvider).getFinanceAccounts();
});

final financeExpensesProvider = FutureProvider<List<FinanceExpenseRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('accounts:read')) return const [];
  return ref.watch(apiClientProvider).getFinanceExpenses();
});

final financeLedgerProvider = FutureProvider<List<FinanceLedgerRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('accounts:read')) return const [];
  return ref.watch(apiClientProvider).getFinanceLedger();
});

final financeDonationsProvider = FutureProvider<List<FinanceDonationRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('accounts:read')) return const [];
  return ref.watch(apiClientProvider).getFinanceDonations();
});

final feeConfigurationProvider = FutureProvider<FinanceConfiguration?>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('fees:read')) return null;
  return ref.watch(apiClientProvider).getFeeConfiguration();
});

final invoiceStudentOptionsProvider =
    FutureProvider<List<FinanceInvoiceStudentOption>>((ref) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('fees:read')) return const [];
      return ref.watch(apiClientProvider).getInvoiceStudentOptions();
    });

final employeesProvider = FutureProvider<List<EmployeeRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('hr:read')) return const [];
  return ref.watch(apiClientProvider).getEmployees();
});

final payrollRunsProvider = FutureProvider<List<PayrollRunRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('payroll:read')) return const [];
  return ref.watch(apiClientProvider).getPayrollRuns();
});

final payslipsProvider = FutureProvider<List<PayslipRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('payroll:read')) return const [];
  return ref.watch(apiClientProvider).getPayslips();
});

final staffAttendanceProvider = FutureProvider<List<StaffAttendanceRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('attendance:read')) return const [];
  return ref.watch(apiClientProvider).getStaffAttendance();
});

final employeeAttendanceOptionsProvider = FutureProvider<List<EmployeeOption>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('attendance:read')) return const [];
  return ref.watch(apiClientProvider).getStaffAttendanceOptions();
});

const _academicSetupKinds = <String>[
  'academic_year',
  'class',
  'section',
  'subject',
];

final adminCampusesProvider = FutureProvider<List<AdminCampusRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('campuses:read')) return const [];
  return ref.watch(apiClientProvider).getAdminCampuses();
});

final academicSetupOptionsProvider = FutureProvider<AcademicSetupOptions?>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('settings:read')) return null;
  return ref.watch(apiClientProvider).getAcademicSetupOptions();
});

final academicSetupProvider =
    FutureProvider.family<List<AcademicSetupRow>, String>((ref, kind) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('settings:read')) return const [];
      return ref.watch(apiClientProvider).getAcademicSetup(kind);
    });

final adminUsersProvider = FutureProvider.family<AdminUsersPage, String>((
  ref,
  search,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('users:read')) return _emptyAdminUsersPage();
  return ref.watch(apiClientProvider).getAdminUsers(search: search);
});

final adminUserAccessProvider =
    FutureProvider.family<AdminUserAccessDetail, String>((ref, userId) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('users:read')) {
        throw const ApiError(
          kind: ApiErrorKind.forbidden,
          message: 'You do not have access to user access details.',
        );
      }
      return ref.watch(apiClientProvider).getAdminUserAccess(userId);
    });

final studentDirectoryProvider =
    FutureProvider.family<PagedRows<StudentDirectoryRow>, String>((
      ref,
      search,
    ) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('students:read')) return _emptyPage();
      return ref.watch(apiClientProvider).getStudentDirectory(search: search);
    });

final studentProfileProvider =
    FutureProvider.family<StudentProfileSummary, String>((
      ref,
      studentId,
    ) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('students:read')) {
        throw const ApiError(
          kind: ApiErrorKind.forbidden,
          message: 'You do not have access to student profiles.',
        );
      }
      return ref.watch(apiClientProvider).getStudentProfile(studentId);
    });

final studentFormOptionsProvider = FutureProvider<StudentFormOptions?>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('students:create')) return null;
  return ref.watch(apiClientProvider).getStudentFormOptions();
});

final studentMedicalProvider =
    FutureProvider.family<StudentMedicalProfile?, String>((
      ref,
      studentId,
    ) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('students:view_sensitive')) return null;
      return ref.watch(apiClientProvider).getStudentMedical(studentId);
    });

final employeesSearchProvider =
    FutureProvider.family<List<EmployeeRow>, String>((ref, search) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('hr:read')) return const [];
      return ref.watch(apiClientProvider).getEmployees(search: search);
    });

final safetyVisitorsProvider = FutureProvider<List<SafetyVisitorRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('safety:read')) return const [];
  return ref.watch(apiClientProvider).getSafetyVisitors();
});

final safetyGatePassesProvider = FutureProvider<List<SafetyGatePassRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('safety:read')) return const [];
  return ref.watch(apiClientProvider).getSafetyGatePasses();
});

final safetyIncidentsProvider = FutureProvider<List<SafetyIncidentRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('safety:read')) return const [];
  return ref.watch(apiClientProvider).getSafetyIncidents();
});

final healthStudentsProvider = FutureProvider<List<HealthStudentOption>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('health:read')) return const [];
  return ref.watch(apiClientProvider).getHealthStudents();
});

final healthProfilesProvider = FutureProvider<List<HealthProfileRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('health:read')) return const [];
  return ref.watch(apiClientProvider).getHealthProfiles();
});

final clinicVisitsProvider = FutureProvider<List<ClinicVisitRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('health:read')) return const [];
  return ref.watch(apiClientProvider).getClinicVisits();
});

final assetsProvider = FutureProvider<List<AssetRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('assets:read')) return const [];
  return ref.watch(apiClientProvider).getAssets(includeInactive: true);
});

final assetAssignmentsProvider = FutureProvider<List<AssetAssignmentRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('assets:read')) return const [];
  return ref.watch(apiClientProvider).getAssetAssignments();
});

final assetMaintenanceProvider = FutureProvider<List<AssetMaintenanceRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('assets:read')) return const [];
  return ref.watch(apiClientProvider).getAssetMaintenance();
});

final assetDepreciationProvider = FutureProvider<List<AssetDepreciationRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('assets:read')) return const [];
  return ref.watch(apiClientProvider).getAssetDepreciation();
});

final inventorySuppliersProvider = FutureProvider<List<InventorySupplierRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('inventory:read')) return const [];
  return ref.watch(apiClientProvider).getInventorySuppliers();
});

final inventoryItemsProvider =
    FutureProvider.family<List<InventoryItemRow>, String>((ref, search) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('inventory:read')) return const [];
      return ref.watch(apiClientProvider).getInventoryItems(search: search);
    });

final stockMovementsProvider = FutureProvider<List<StockMovementRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('inventory:read')) return const [];
  return ref.watch(apiClientProvider).getStockMovements();
});

final procurementRequisitionsProvider =
    FutureProvider<List<ProcurementRequisitionRow>>((ref) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('procurement:read')) return const [];
      return ref.watch(apiClientProvider).getProcurementRequisitions();
    });

final procurementPurchaseOrdersProvider =
    FutureProvider<List<ProcurementPurchaseOrderRow>>((ref) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('procurement:read')) return const [];
      return ref.watch(apiClientProvider).getProcurementPurchaseOrders();
    });

final procurementGoodsReceiptsProvider =
    FutureProvider<List<ProcurementGoodsReceiptRow>>((ref) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('procurement:read')) return const [];
      return ref.watch(apiClientProvider).getProcurementGoodsReceipts();
    });

final facilityBookingsProvider = FutureProvider<List<FacilityBookingRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('facilities:read')) return const [];
  return ref.watch(apiClientProvider).getFacilityBookings();
});

final facilityMaintenanceProvider =
    FutureProvider<List<FacilityMaintenanceRow>>((ref) async {
      final me = await ref.watch(sessionProvider.future);
      if (!me.can('facilities:read')) return const [];
      return ref.watch(apiClientProvider).getFacilityMaintenance();
    });

final facilityComplaintsProvider = FutureProvider<List<FacilityComplaintRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('facilities:read')) return const [];
  return ref.watch(apiClientProvider).getFacilityComplaints();
});

final hostelRoomsProvider = FutureProvider<List<HostelRoomRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('hostel:read')) return const [];
  return ref.watch(apiClientProvider).getHostelRooms();
});

final hostelBedsProvider = FutureProvider<List<HostelBedRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('hostel:read')) return const [];
  return ref.watch(apiClientProvider).getHostelBeds();
});

final hostelStudentsProvider = FutureProvider<List<HostelStudentOption>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('hostel:read')) return const [];
  return ref.watch(apiClientProvider).getHostelStudents();
});

final hostelAllotmentsProvider = FutureProvider<List<HostelAllotmentRow>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('hostel:read')) return const [];
  return ref.watch(apiClientProvider).getHostelAllotments();
});

final canteenMenuProvider = FutureProvider<List<CanteenMenuRow>>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('canteen:read')) return const [];
  return ref.watch(apiClientProvider).getCanteenMenu();
});

final canteenStudentsProvider = FutureProvider<List<CanteenStudentOption>>((
  ref,
) async {
  final me = await ref.watch(sessionProvider.future);
  if (!me.can('canteen:read')) return const [];
  return ref.watch(apiClientProvider).getCanteenStudents();
});

final canteenTransactionsProvider = FutureProvider<List<CanteenTransactionRow>>(
  (ref) async {
    final me = await ref.watch(sessionProvider.future);
    if (!me.can('canteen:read')) return const [];
    return ref.watch(apiClientProvider).getCanteenTransactions();
  },
);

class StudentOverview {
  const StudentOverview({
    this.attendance,
    this.invoices,
    this.results,
    this.documents,
  });
  final PagedRows<AttendanceRow>? attendance;
  final PagedRows<InvoiceRow>? invoices;
  final PagedRows<ResultRow>? results;
  final List<DocumentRow>? documents;
}

final studentOverviewProvider = FutureProvider<StudentOverview>((ref) async {
  final me = await ref.watch(sessionProvider.future);
  final studentId = ref.watch(selectedStudentIdProvider) ?? me.linkedStudentId;
  if (studentId == null) return const StudentOverview();
  final api = ref.watch(apiClientProvider);
  final values = await Future.wait<Object?>([
    if (me.can('attendance:read'))
      api.getAttendance(studentId)
    else
      Future.value(null),
    if (me.can('fees:read')) api.getInvoices(studentId) else Future.value(null),
    if (me.can('exams:read')) api.getResults(studentId) else Future.value(null),
    if (me.can('documents:read'))
      api.getDocuments(studentId)
    else
      Future.value(null),
  ]);
  return StudentOverview(
    attendance: values[0] as PagedRows<AttendanceRow>?,
    invoices: values[1] as PagedRows<InvoiceRow>?,
    results: values[2] as PagedRows<ResultRow>?,
    documents: values[3] as List<DocumentRow>?,
  );
});

String _todayKey() {
  final date = DateTime.now();
  return '${date.year.toString().padLeft(4, '0')}-'
      '${date.month.toString().padLeft(2, '0')}-'
      '${date.day.toString().padLeft(2, '0')}';
}

PagedRows<T> _emptyPage<T>() => PagedRows(
  rows: const [],
  pageInfo: const PageInfo(page: 1, pageSize: 0, total: 0, pageCount: 0),
);

AdminUsersPage _emptyAdminUsersPage() => const AdminUsersPage(
  rows: [],
  campusOptions: [],
  pageInfo: PageInfo(page: 1, pageSize: 0, total: 0, pageCount: 0),
);
