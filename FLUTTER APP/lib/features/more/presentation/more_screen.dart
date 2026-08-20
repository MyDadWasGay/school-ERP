import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../../shared/widgets/erp_states.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    return session.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(sessionProvider),
      ),
      data: (user) {
        final links = <_MoreLink>[
          if (user.can('admissions:approve') ||
              user.can('attendance:approve_leave') ||
              user.can('attendance:approve_correction') ||
              user.can('procurement:approve') ||
              user.can('facilities:approve'))
            const _MoreLink(
              title: 'Approvals inbox',
              subtitle: 'Review admissions, leave, attendance and operations',
              path: '/approvals',
              icon: Icons.approval_outlined,
            ),
          if (user.can('students:read') || user.can('hr:read'))
            const _MoreLink(
              title: 'People directory',
              subtitle: 'Search students, profiles and staff in your scope',
              path: '/people',
              icon: Icons.groups_outlined,
            ),
          if (user.can('safety:read') || user.can('health:read'))
            const _MoreLink(
              title: 'Operations',
              subtitle: 'Visitors, gate passes, incidents and health records',
              path: '/operations',
              icon: Icons.health_and_safety_outlined,
            ),
          if (user.can('assets:read') ||
              user.can('inventory:read') ||
              user.can('procurement:read') ||
              user.can('facilities:read') ||
              user.can('hostel:read') ||
              user.can('canteen:read'))
            const _MoreLink(
              title: 'Back-office operations',
              subtitle:
                  'Inventory, procurement, facilities, hostel and canteen',
              path: '/back-office',
              icon: Icons.inventory_2_outlined,
            ),
          if (user.can('campuses:read') ||
              user.can('settings:read') ||
              user.can('users:read'))
            const _MoreLink(
              title: 'Administration',
              subtitle: 'Campuses, academic setup and user access',
              path: '/administration',
              icon: Icons.admin_panel_settings_outlined,
            ),
          if (user.can('exams:read'))
            const _MoreLink(
              title: 'Exams & results',
              subtitle: 'Marks entry, exam planning and publication status',
              path: '/exams',
              icon: Icons.school_outlined,
            ),
          if (user.can('admissions:read'))
            const _MoreLink(
              title: 'Admissions',
              subtitle: 'Application pipeline and approval queue',
              path: '/admissions',
              icon: Icons.how_to_reg_outlined,
            ),
          if (user.can('fees:read') || user.can('accounts:read'))
            const _MoreLink(
              title: 'Finance',
              subtitle: 'Fees, payments and accounts in your scope',
              path: '/finance',
              icon: Icons.account_balance_wallet_outlined,
            ),
          if (user.can('hr:read') || user.can('payroll:read'))
            const _MoreLink(
              title: 'People & payroll',
              subtitle: 'Staff directory, payroll runs and payslips',
              path: '/hr',
              icon: Icons.badge_outlined,
            ),
          if (user.can('attendance:read'))
            const _MoreLink(
              title: 'Attendance',
              subtitle: 'Review or record attendance in your permitted scope',
              path: '/attendance',
              icon: Icons.fact_check_outlined,
            ),
          if (user.can('library:read'))
            const _MoreLink(
              title: 'Library',
              subtitle: 'Loans, catalogue and digital resources',
              path: '/library',
              icon: Icons.local_library_outlined,
            ),
          if (user.can('transport:read'))
            const _MoreLink(
              title: 'Transport',
              subtitle: 'Assigned routes and pickup information',
              path: '/transport',
              icon: Icons.directions_bus_outlined,
            ),
          const _MoreLink(
            title: 'Profile & settings',
            subtitle: 'Campus context, access and sign out',
            path: '/profile',
            icon: Icons.person_outline,
          ),
        ];
        return ListView(
          padding: const EdgeInsets.all(ErpSpacing.lg),
          children: [
            Text(
              'Your mobile workspace',
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: ErpSpacing.xs),
            Text(
              'Available modules are based on permissions from the school service.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: ErpSpacing.lg),
            Card(
              child: Column(
                children: [
                  for (var index = 0; index < links.length; index++) ...[
                    ListTile(
                      minVerticalPadding: ErpSpacing.md,
                      leading: CircleAvatar(child: Icon(links[index].icon)),
                      title: Text(links[index].title),
                      subtitle: Text(links[index].subtitle),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.go(links[index].path),
                    ),
                    if (index < links.length - 1) const Divider(height: 1),
                  ],
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _MoreLink {
  const _MoreLink({
    required this.title,
    required this.subtitle,
    required this.path,
    required this.icon,
  });

  final String title;
  final String subtitle;
  final String path;
  final IconData icon;
}
