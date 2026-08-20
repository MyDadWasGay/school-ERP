import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../../shared/models/identity_models.dart';
import '../../../shared/widgets/erp_states.dart';
import '../../../shared/widgets/metric_card.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    return session.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(sessionProvider),
      ),
      data: (user) => RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(portalProvider);
          ref.invalidate(managementDashboardProvider);
          await Future.wait([
            ref.read(portalProvider.future),
            ref.read(managementDashboardProvider.future),
          ]);
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                ErpSpacing.lg,
                ErpSpacing.lg,
                ErpSpacing.lg,
                0,
              ),
              sliver: SliverToBoxAdapter(child: _Greeting(user: user)),
            ),
            if (portalForRole(user.role) != null)
              _PortalSection(ref.watch(portalProvider), user: user)
            else
              _ManagementSection(
                ref.watch(managementDashboardProvider),
                user: user,
              ),
            const SliverPadding(
              padding: EdgeInsets.only(bottom: ErpSpacing.xxl),
            ),
          ],
        ),
      ),
    );
  }
}

class _Greeting extends StatelessWidget {
  const _Greeting({required this.user});
  final CurrentUser user;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(_greeting(), style: Theme.of(context).textTheme.bodyLarge),
      const SizedBox(height: ErpSpacing.xs),
      Text(
        user.displayName,
        style: Theme.of(
          context,
        ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
      ),
      const SizedBox(height: ErpSpacing.xs),
      Text(
        '${_roleLabel(user.role)} · ${DateFormat('EEEE, d MMMM').format(DateTime.now())}',
        style: Theme.of(context).textTheme.bodyMedium,
      ),
    ],
  );

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  String _roleLabel(String value) => value
      .split('_')
      .map(
        (part) => part.isEmpty
            ? part
            : '${part[0].toUpperCase()}${part.substring(1)}',
      )
      .join(' ');
}

class _PortalSection extends ConsumerWidget {
  const _PortalSection(this.value, {required this.user});
  final AsyncValue<PortalSnapshot?> value;
  final CurrentUser user;

  @override
  Widget build(BuildContext context, WidgetRef ref) => value.when(
    loading: () => const SliverToBoxAdapter(
      child: SizedBox(height: 420, child: ErpLoadingList()),
    ),
    error: (error, stack) => SliverToBoxAdapter(
      child: SizedBox(
        height: 360,
        child: ErpErrorState(
          error: error,
          onRetry: () => ref.invalidate(portalProvider),
        ),
      ),
    ),
    data: (snapshot) {
      if (snapshot == null) {
        return const SliverToBoxAdapter(child: SizedBox.shrink());
      }
      return SliverPadding(
        padding: const EdgeInsets.all(ErpSpacing.lg),
        sliver: SliverList.list(
          children: [
            const _SectionTitle('Today at a glance'),
            const SizedBox(height: ErpSpacing.md),
            LayoutBuilder(
              builder: (context, constraints) {
                final columns = constraints.maxWidth >= 760 ? 3 : 2;
                return GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: snapshot.metrics.length,
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: columns,
                    crossAxisSpacing: ErpSpacing.md,
                    mainAxisSpacing: ErpSpacing.md,
                    childAspectRatio: columns == 2 ? 1.05 : 1.35,
                  ),
                  itemBuilder: (context, index) {
                    final metric = snapshot.metrics[index];
                    return MetricCard(
                      label: metric.label,
                      value: metric.value,
                      detail: metric.detail,
                    );
                  },
                );
              },
            ),
            const SizedBox(height: ErpSpacing.xl),
            _QuickActions(user: user),
            const SizedBox(height: ErpSpacing.xl),
            const _SectionTitle('Recent activity'),
            const SizedBox(height: ErpSpacing.sm),
            if (snapshot.recent.isEmpty)
              const SizedBox(
                height: 180,
                child: ErpEmptyState(
                  icon: Icons.done_all,
                  title: 'Nothing needs attention',
                  message: 'New school activity will appear here.',
                ),
              )
            else
              Card(
                child: Column(
                  children: [
                    for (final item in snapshot.recent)
                      ListTile(
                        leading: const Icon(Icons.chevron_right),
                        title: Text(item.title),
                        subtitle: Text(item.detail),
                      ),
                  ],
                ),
              ),
          ],
        ),
      );
    },
  );
}

class _ManagementSection extends ConsumerWidget {
  const _ManagementSection(this.value, {required this.user});
  final AsyncValue<ManagementDashboard?> value;
  final CurrentUser user;

  @override
  Widget build(BuildContext context, WidgetRef ref) => value.when(
    loading: () => const SliverToBoxAdapter(
      child: SizedBox(height: 420, child: ErpLoadingList()),
    ),
    error: (error, stack) => SliverToBoxAdapter(
      child: SizedBox(
        height: 360,
        child: ErpErrorState(
          error: error,
          onRetry: () => ref.invalidate(managementDashboardProvider),
        ),
      ),
    ),
    data: (dashboard) {
      if (dashboard == null) {
        return SliverToBoxAdapter(
          child: SizedBox(
            height: 320,
            child: ErpEmptyState(
              icon: Icons.dashboard_outlined,
              title: 'Your mobile workspace is ready',
              message:
                  'Your role has ${user.permissions.length} enabled capabilities. Open More to access the workflows available to you.',
            ),
          ),
        );
      }
      final metrics = [
        (
          'Students',
          '${dashboard.students}',
          'Active students',
          Icons.groups_outlined,
        ),
        (
          'Attendance',
          '${dashboard.attendanceRate.toStringAsFixed(1)}%',
          'Overall attendance',
          Icons.fact_check_outlined,
        ),
        (
          'Collection',
          '${dashboard.collectionRate.toStringAsFixed(1)}%',
          'Fees collected',
          Icons.account_balance_wallet_outlined,
        ),
        (
          'Pending',
          NumberFormat.compactCurrency(
            symbol: '₹',
            decimalDigits: 0,
          ).format(dashboard.pendingMinor / 100),
          'Outstanding fees',
          Icons.warning_amber_outlined,
        ),
        ('Staff', '${dashboard.staff}', 'Active staff', Icons.badge_outlined),
      ];
      return SliverPadding(
        padding: const EdgeInsets.all(ErpSpacing.lg),
        sliver: SliverList.list(
          children: [
            LayoutBuilder(
              builder: (context, constraints) => GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: metrics.length,
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 260,
                  mainAxisSpacing: ErpSpacing.md,
                  crossAxisSpacing: ErpSpacing.md,
                  childAspectRatio: 1.12,
                ),
                itemBuilder: (context, index) {
                  final metric = metrics[index];
                  return MetricCard(
                    label: metric.$1,
                    value: metric.$2,
                    detail: metric.$3,
                    icon: metric.$4,
                  );
                },
              ),
            ),
            const SizedBox(height: ErpSpacing.xl),
            _QuickActions(user: user),
          ],
        ),
      );
    },
  );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title);
  final String title;
  @override
  Widget build(BuildContext context) => Text(
    title,
    style: Theme.of(
      context,
    ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
  );
}

class _QuickActions extends StatelessWidget {
  const _QuickActions({required this.user});
  final CurrentUser user;

  @override
  Widget build(BuildContext context) {
    final actions = <(String, String, IconData)>[
      if (user.can('academics:read'))
        ('Schedule', '/timetable', Icons.calendar_month_outlined),
      if (user.can('academics:read'))
        ('Assignments', '/assignments', Icons.assignment_outlined),
      if (user.can('communication:read'))
        ('Announcements', '/notices', Icons.campaign_outlined),
      if (user.can('attendance:read') || user.can('attendance:request_leave'))
        ('Leave', '/leave', Icons.event_available_outlined),
      if (user.can('attendance:mark'))
        ('Take attendance', '/attendance', Icons.fact_check_outlined),
      if (user.can('library:read'))
        ('Library', '/library', Icons.local_library_outlined),
      if (user.can('transport:read'))
        ('Transport', '/transport', Icons.directions_bus_outlined),
      if (user.can('admissions:approve') ||
          user.can('attendance:approve_leave') ||
          user.can('attendance:approve_correction') ||
          user.can('procurement:approve') ||
          user.can('facilities:approve'))
        ('Approvals', '/approvals', Icons.approval_outlined),
    ];
    if (actions.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionTitle('Quick actions'),
        const SizedBox(height: ErpSpacing.sm),
        Wrap(
          spacing: ErpSpacing.sm,
          runSpacing: ErpSpacing.sm,
          children: [
            for (final action in actions)
              OutlinedButton.icon(
                onPressed: () => context.go(action.$2),
                icon: Icon(action.$3),
                label: Text(action.$1),
              ),
          ],
        ),
      ],
    );
  }
}
