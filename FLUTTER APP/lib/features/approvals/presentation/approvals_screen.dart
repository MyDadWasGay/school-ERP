import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/approval_models.dart';
import '../../../shared/models/identity_models.dart';
import '../../../shared/widgets/erp_states.dart';

class ApprovalsScreen extends ConsumerStatefulWidget {
  const ApprovalsScreen({super.key});

  @override
  ConsumerState<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends ConsumerState<ApprovalsScreen> {
  final _busy = <String>{};

  Future<void> _refresh() async {
    ref.invalidate(unifiedApprovalsProvider);
    await ref.read(unifiedApprovalsProvider.future);
  }

  Future<void> _run(String key, Future<void> Function() action) async {
    if (_busy.contains(key)) return;
    setState(() => _busy.add(key));
    try {
      await action();
      await _refresh();
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    } finally {
      if (mounted) setState(() => _busy.remove(key));
    }
  }

  Future<String?> _rejectionReason() async => showDialog<String>(
    context: context,
    builder: (context) {
      final controller = TextEditingController();
      return AlertDialog(
        title: const Text('Reason for rejection'),
        content: TextField(
          controller: controller,
          autofocus: true,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Reason',
            hintText: 'Add a short reason for the record.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final reason = controller.text.trim();
              if (reason.isNotEmpty) Navigator.pop(context, reason);
            },
            child: const Text('Reject'),
          ),
        ],
      );
    },
  );

  void _showDetails({
    required String title,
    required String status,
    required List<String> lines,
  }) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      useSafeArea: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(
          ErpSpacing.lg,
          0,
          ErpSpacing.lg,
          ErpSpacing.lg,
        ),
        child: ListView(
          shrinkWrap: true,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                ErpStatusChip(status),
              ],
            ),
            const SizedBox(height: ErpSpacing.md),
            for (final line in lines) ...[
              Text(line),
              const SizedBox(height: ErpSpacing.sm),
            ],
          ],
        ),
      ),
    );
  }

  List<Widget> _admissionCards(ApprovalInbox inbox, CurrentUser user) => [
    for (final row in inbox.admissions)
      _ApprovalCard(
        title: row.name,
        subtitle: 'Application ${row.applicationNumber}',
        status: row.status,
        icon: Icons.how_to_reg_outlined,
        busy: _busy.contains('admission:${row.id}'),
        approveLabel: row.status == 'submitted' || row.status == 'waitlisted'
            ? 'Verify'
            : 'Approve',
        onTap: () => _showDetails(
          title: row.name,
          status: row.status,
          lines: [
            'Application number: ${row.applicationNumber}',
            'This item is loaded from the campus-scoped admissions queue.',
            if (row.status == 'verified' || row.status == 'selected')
              'Approval will create the student enrollment when the server-side prerequisites are complete.',
          ],
        ),
        onApprove:
            (row.status == 'submitted' || row.status == 'waitlisted'
                ? user.can('admissions:update')
                : user.can('admissions:approve'))
            ? () => _run('admission:${row.id}', () async {
                if (row.status == 'submitted' || row.status == 'waitlisted') {
                  await ref
                      .read(apiClientProvider)
                      .reviewAdmission(row.id, 'verified');
                } else {
                  await ref.read(apiClientProvider).approveAdmission(row.id);
                }
              })
            : null,
        onReject: user.can('admissions:reject')
            ? () async {
                final reason = await _rejectionReason();
                if (reason == null) return;
                await _run('admission:${row.id}', () async {
                  await ref
                      .read(apiClientProvider)
                      .reviewAdmission(row.id, 'rejected', reason: reason);
                });
              }
            : null,
      ),
  ];

  List<Widget> _leaveCards(ApprovalInbox inbox, CurrentUser user) => [
    for (final row in inbox.leaveRequests)
      _ApprovalCard(
        title: row.requester,
        subtitle: '${row.startsOn} – ${row.endsOn}\n${row.reason}',
        status: row.status,
        icon: Icons.event_available_outlined,
        busy: _busy.contains('leave:${row.id}'),
        onTap: () => _showDetails(
          title: 'Leave request',
          status: row.status,
          lines: [
            'Requester: ${row.requester}',
            'Dates: ${row.startsOn} – ${row.endsOn}',
            'Reason: ${row.reason}',
          ],
        ),
        onApprove: user.can('attendance:approve_leave')
            ? () => _run(
                'leave:${row.id}',
                () => ref
                    .read(apiClientProvider)
                    .reviewLeaveRequest(row.id, 'approved'),
              )
            : null,
        onReject: user.can('attendance:approve_leave')
            ? () => _run(
                'leave:${row.id}',
                () => ref
                    .read(apiClientProvider)
                    .reviewLeaveRequest(row.id, 'rejected'),
              )
            : null,
      ),
  ];

  List<Widget> _correctionCards(ApprovalInbox inbox, CurrentUser user) => [
    for (final row in inbox.attendanceCorrections)
      _ApprovalCard(
        title: row.student,
        subtitle: '${row.currentState} → ${row.requestedState}\n${row.reason}',
        status: row.status,
        icon: Icons.fact_check_outlined,
        busy: _busy.contains('correction:${row.id}'),
        onTap: () => _showDetails(
          title: 'Attendance correction',
          status: row.status,
          lines: [
            'Student: ${row.student}',
            'Requested change: ${row.currentState} → ${row.requestedState}',
            'Reason: ${row.reason}',
          ],
        ),
        onApprove: user.can('attendance:approve_correction')
            ? () => _run(
                'correction:${row.id}',
                () => ref
                    .read(apiClientProvider)
                    .reviewAttendanceCorrection(row.id, 'approved'),
              )
            : null,
        onReject: user.can('attendance:approve_correction')
            ? () => _run(
                'correction:${row.id}',
                () => ref
                    .read(apiClientProvider)
                    .reviewAttendanceCorrection(row.id, 'rejected'),
              )
            : null,
      ),
  ];

  List<Widget> _requisitionCards(ApprovalInbox inbox, CurrentUser user) => [
    for (final row in inbox.requisitions)
      _ApprovalCard(
        title: row.name,
        subtitle:
            '${row.code} · ${row.quantity} item${row.quantity == 1 ? '' : 's'} · ${_money(row.estimatedMinor)}',
        status: row.status,
        icon: Icons.shopping_cart_checkout_outlined,
        busy: _busy.contains('requisition:${row.id}'),
        onTap: () => _showDetails(
          title: row.name,
          status: row.status,
          lines: [
            'Reference: ${row.code}',
            'Quantity: ${row.quantity}',
            'Estimated amount: ${_money(row.estimatedMinor)}',
            'Submitted: ${DateFormat('d MMM yyyy, h:mm a').format(row.createdAt.toLocal())}',
          ],
        ),
        onApprove: user.can('procurement:approve')
            ? () => _run(
                'requisition:${row.id}',
                () => ref
                    .read(apiClientProvider)
                    .transitionProcurementRequisition(row.id, 'approved'),
              )
            : null,
        onReject: user.can('procurement:approve')
            ? () => _run(
                'requisition:${row.id}',
                () => ref
                    .read(apiClientProvider)
                    .transitionProcurementRequisition(row.id, 'rejected'),
              )
            : null,
      ),
  ];

  List<Widget> _facilityCards(ApprovalInbox inbox, CurrentUser user) => [
    for (final row in inbox.facilityBookings)
      _ApprovalCard(
        title: row.name,
        subtitle:
            '${DateFormat('d MMM, h:mm a').format(row.startsAt.toLocal())} – ${DateFormat('h:mm a').format(row.endsAt.toLocal())}\n${row.purpose}',
        status: row.status,
        icon: Icons.meeting_room_outlined,
        busy: _busy.contains('facility:${row.id}'),
        onTap: () => _showDetails(
          title: row.name,
          status: row.status,
          lines: [
            'Purpose: ${row.purpose}',
            'Starts: ${DateFormat('d MMM yyyy, h:mm a').format(row.startsAt.toLocal())}',
            'Ends: ${DateFormat('d MMM yyyy, h:mm a').format(row.endsAt.toLocal())}',
          ],
        ),
        onApprove: user.can('facilities:approve')
            ? () => _run(
                'facility:${row.id}',
                () => ref
                    .read(apiClientProvider)
                    .transitionFacilityBooking(row.id, 'approved'),
              )
            : null,
        onReject: user.can('facilities:approve')
            ? () => _run(
                'facility:${row.id}',
                () => ref
                    .read(apiClientProvider)
                    .transitionFacilityBooking(row.id, 'rejected'),
              )
            : null,
      ),
  ];

  String _money(int minor) => 'INR ${(minor / 100).toStringAsFixed(2)}';

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final value = ref.watch(unifiedApprovalsProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () {
          _refresh();
        },
      ),
      data: (inbox) {
        if (user == null) return const ErpLoadingList();
        if (inbox.isEmpty) {
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(
                  height: 480,
                  child: ErpEmptyState(
                    icon: Icons.done_all,
                    title: 'Nothing is waiting for review',
                    message:
                        'New approvals will appear here when they are in your campus and permission scope.',
                  ),
                ),
              ],
            ),
          );
        }
        final sections = <(String, List<Widget>)>[
          ('Admissions', _admissionCards(inbox, user)),
          ('Leave requests', _leaveCards(inbox, user)),
          ('Attendance corrections', _correctionCards(inbox, user)),
          ('Procurement', _requisitionCards(inbox, user)),
          ('Facility bookings', _facilityCards(inbox, user)),
        ].where((section) => section.$2.isNotEmpty).toList(growable: false);
        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            children: [
              Text(
                '${inbox.count} item${inbox.count == 1 ? '' : 's'} need review',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: ErpSpacing.md),
              for (final section in sections) ...[
                Text(
                  section.$1,
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: ErpSpacing.sm),
                ...section.$2,
                const SizedBox(height: ErpSpacing.lg),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _ApprovalCard extends StatelessWidget {
  const _ApprovalCard({
    required this.title,
    required this.subtitle,
    required this.status,
    required this.icon,
    required this.busy,
    required this.onTap,
    this.approveLabel = 'Approve',
    this.onApprove,
    this.onReject,
  });

  final String title;
  final String subtitle;
  final String status;
  final IconData icon;
  final bool busy;
  final String approveLabel;
  final VoidCallback onTap;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(ErpSpacing.sm),
      child: Column(
        children: [
          ListTile(
            leading: CircleAvatar(child: Icon(icon)),
            title: Text(title),
            subtitle: Padding(
              padding: const EdgeInsets.only(top: ErpSpacing.xs),
              child: Text(subtitle),
            ),
            trailing: ErpStatusChip(status),
            onTap: busy ? null : onTap,
          ),
          if (onApprove != null || onReject != null)
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: busy ? null : onTap,
                  child: const Text('Details'),
                ),
                if (onReject != null)
                  TextButton(
                    onPressed: busy ? null : onReject,
                    child: const Text('Reject'),
                  ),
                if (onApprove != null)
                  FilledButton(
                    onPressed: busy ? null : onApprove,
                    child: busy
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(approveLabel),
                  ),
                const SizedBox(width: ErpSpacing.xs),
              ],
            ),
        ],
      ),
    ),
  );
}
