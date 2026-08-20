import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/academics/presentation/assignments_screen.dart';
import '../../features/academics/presentation/timetable_screen.dart';
import '../../features/academics/presentation/syllabus_progress_screen.dart';
import '../../features/admissions/presentation/admissions_screen.dart';
import '../../features/approvals/presentation/approvals_screen.dart';
import '../../features/attendance/presentation/attendance_workspace_screen.dart';
import '../../features/administration/presentation/administration_screen.dart';
import '../../features/back_office/presentation/back_office_screen.dart';
import '../../features/communication/presentation/communication_workspace_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/exams/presentation/exam_workspace_screen.dart';
import '../../features/exams/presentation/admit_cards_screen.dart';
import '../../features/finance/presentation/finance_screen.dart';
import '../../features/hr/presentation/hr_screen.dart';
import '../../features/library/presentation/library_screen.dart';
import '../../features/leave/presentation/leave_screen.dart';
import '../../features/more/presentation/more_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/operations/presentation/operations_screen.dart';
import '../../features/people/presentation/people_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/student/presentation/student_overview_screen.dart';
import '../../features/transport/presentation/transport_screen.dart';
import '../../features/transport/presentation/transport_checklist_screen.dart';
import '../shell/role_shell.dart';
import 'route_permissions.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authStateProvider);
  final session = ref.watch(sessionProvider);
  return GoRouter(
    initialLocation: '/home',
    redirect: (context, state) {
      if (auth.isLoading) {
        return state.matchedLocation == '/loading' ? null : '/loading';
      }
      final signedIn = auth.valueOrNull != null;
      if (!signedIn) return state.matchedLocation == '/login' ? null : '/login';
      if (state.matchedLocation == '/login' ||
          state.matchedLocation == '/loading') {
        if (session.isLoading) return null;
        return '/home';
      }
      final user = session.valueOrNull;
      if (user != null && !canAccessPath(state.uri.path, user)) {
        return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/loading',
        builder: (context, state) => const _LoadingScreen(),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      ShellRoute(
        builder: (context, state, child) =>
            RoleShell(location: state.uri.path, child: child),
        routes: [
          GoRoute(
            path: '/home',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/student',
            builder: (context, state) => const StudentOverviewScreen(),
          ),
          GoRoute(
            path: '/notifications',
            builder: (context, state) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/notices',
            builder: (context, state) => const CommunicationWorkspaceScreen(),
          ),
          GoRoute(
            path: '/timetable',
            builder: (context, state) => const TimetableScreen(),
          ),
          GoRoute(
            path: '/assignments',
            builder: (context, state) => AssignmentsScreen(
              initialAssignmentId: state.uri.queryParameters['id'],
            ),
          ),
          GoRoute(
            path: '/syllabus',
            builder: (context, state) => const SyllabusProgressScreen(),
          ),
          GoRoute(
            path: '/leave',
            builder: (context, state) => const LeaveScreen(),
          ),
          GoRoute(
            path: '/library',
            builder: (context, state) => const LibraryScreen(),
          ),
          GoRoute(
            path: '/transport',
            builder: (context, state) => const TransportScreen(),
          ),
          GoRoute(
            path: '/transport/checklist',
            builder: (context, state) => const TransportChecklistScreen(),
          ),
          GoRoute(
            path: '/attendance',
            builder: (context, state) => const AttendanceWorkspaceScreen(),
          ),
          GoRoute(
            path: '/exams',
            builder: (context, state) => const ExamWorkspaceScreen(),
          ),
          GoRoute(
            path: '/admit-cards',
            builder: (context, state) => const AdmitCardsScreen(),
          ),
          GoRoute(
            path: '/admissions',
            builder: (context, state) => const AdmissionsScreen(),
          ),
          GoRoute(
            path: '/approvals',
            builder: (context, state) => const ApprovalsScreen(),
          ),
          GoRoute(
            path: '/finance',
            builder: (context, state) => const FinanceScreen(),
          ),
          GoRoute(path: '/hr', builder: (context, state) => const HrScreen()),
          GoRoute(
            path: '/people',
            builder: (context, state) => const PeopleScreen(),
          ),
          GoRoute(
            path: '/operations',
            builder: (context, state) => const OperationsScreen(),
          ),
          GoRoute(
            path: '/back-office',
            builder: (context, state) => const BackOfficeScreen(),
          ),
          GoRoute(
            path: '/administration',
            builder: (context, state) => const AdministrationScreen(),
          ),
          GoRoute(
            path: '/more',
            builder: (context, state) => const MoreScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
});

class _LoadingScreen extends StatelessWidget {
  const _LoadingScreen();
  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: CircularProgressIndicator()));
}
