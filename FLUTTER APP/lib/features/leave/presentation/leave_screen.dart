import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/identity_models.dart';
import '../../../shared/models/leave_models.dart';
import '../../../shared/widgets/erp_states.dart';

class LeaveScreen extends ConsumerStatefulWidget {
  const LeaveScreen({super.key});

  @override
  ConsumerState<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends ConsumerState<LeaveScreen> {
  final _busy = <String>{};

  Future<void> _request(CurrentUser user, List<PortalStudent> students) async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _LeaveForm(user: user, students: students),
    );
    if (created == true) ref.invalidate(leaveRequestsProvider);
  }

  Future<void> _review(String id, String decision) async {
    if (_busy.contains(id)) return;
    setState(() => _busy.add(id));
    try {
      await ref.read(apiClientProvider).reviewLeaveRequest(id, decision);
      ref.invalidate(leaveRequestsProvider);
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    } finally {
      if (mounted) setState(() => _busy.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final requests = ref.watch(leaveRequestsProvider);
    final user = ref.watch(sessionProvider).valueOrNull;
    final students =
        ref.watch(portalProvider).valueOrNull?.students ??
        const <PortalStudent>[];
    return Scaffold(
      body: requests.when(
        loading: () => const ErpLoadingList(),
        error: (error, stack) => ErpErrorState(
          error: error,
          onRetry: () => ref.invalidate(leaveRequestsProvider),
        ),
        data: (rows) {
          if (rows.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(leaveRequestsProvider);
                await ref.read(leaveRequestsProvider.future);
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(
                    height: 420,
                    child: ErpEmptyState(
                      icon: Icons.event_available_outlined,
                      title: 'No leave requests',
                      message:
                          'Requests and approval updates will appear here.',
                    ),
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(leaveRequestsProvider);
              await ref.read(leaveRequestsProvider.future);
            },
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(ErpSpacing.lg),
              itemCount: rows.length,
              separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
              itemBuilder: (context, index) => _LeaveCard(
                row: rows[index],
                busy: _busy.contains(rows[index].id),
                onReview: (decision) => _review(rows[index].id, decision),
              ),
            ),
          );
        },
      ),
      floatingActionButton: user?.can('attendance:request_leave') == true
          ? FloatingActionButton.extended(
              onPressed: () => _request(user!, students),
              icon: const Icon(Icons.add),
              label: const Text('Request leave'),
            )
          : null,
    );
  }
}

class _LeaveCard extends StatelessWidget {
  const _LeaveCard({
    required this.row,
    required this.busy,
    required this.onReview,
  });
  final LeaveRequest row;
  final bool busy;
  final ValueChanged<String> onReview;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(ErpSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  row.requester,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              ErpStatusChip(row.status),
            ],
          ),
          const SizedBox(height: ErpSpacing.sm),
          Text(
            '${row.startsOn} – ${row.endsOn}',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: ErpSpacing.xs),
          Text(row.reason),
          if (row.canReview) ...[
            const SizedBox(height: ErpSpacing.md),
            Wrap(
              spacing: ErpSpacing.sm,
              children: [
                OutlinedButton.icon(
                  onPressed: busy ? null : () => onReview('rejected'),
                  icon: const Icon(Icons.close),
                  label: const Text('Reject'),
                ),
                FilledButton.icon(
                  onPressed: busy ? null : () => onReview('approved'),
                  icon: busy
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.check),
                  label: const Text('Approve'),
                ),
              ],
            ),
          ],
        ],
      ),
    ),
  );
}

class _LeaveForm extends ConsumerStatefulWidget {
  const _LeaveForm({required this.user, required this.students});
  final CurrentUser user;
  final List<PortalStudent> students;

  @override
  ConsumerState<_LeaveForm> createState() => _LeaveFormState();
}

class _LeaveFormState extends ConsumerState<_LeaveForm> {
  final _formKey = GlobalKey<FormState>();
  final _reason = TextEditingController();
  late DateTime _startsOn;
  late DateTime _endsOn;
  String? _studentId;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final today = DateTime.now();
    _startsOn = DateTime(today.year, today.month, today.day);
    _endsOn = _startsOn;
    if (widget.user.role == 'student') {
      _studentId = widget.user.linkedStudentId;
    } else if (widget.user.role == 'parent') {
      _studentId =
          ref.read(selectedStudentIdProvider) ??
          (widget.students.isEmpty ? null : widget.students.first.id);
    }
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool start) async {
    final value = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      initialDate: start ? _startsOn : _endsOn,
    );
    if (value == null) return;
    setState(() {
      if (start) {
        _startsOn = value;
        if (_endsOn.isBefore(value)) _endsOn = value;
      } else {
        _endsOn = value;
      }
    });
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_endsOn.isBefore(_startsOn)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('End date must be on or after the start date.'),
        ),
      );
      return;
    }
    if ((widget.user.role == 'parent' || widget.user.role == 'student') &&
        _studentId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Choose the student requesting leave.')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await ref
          .read(apiClientProvider)
          .createLeaveRequest(
            studentId: _studentId,
            startsOn: _startsOn,
            endsOn: _endsOn,
            reason: _reason.text,
          );
      if (mounted) Navigator.of(context).pop(true);
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(
      left: ErpSpacing.lg,
      right: ErpSpacing.lg,
      top: ErpSpacing.lg,
      bottom: MediaQuery.viewInsetsOf(context).bottom + ErpSpacing.lg,
    ),
    child: Form(
      key: _formKey,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Request leave',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: ErpSpacing.md),
            if (widget.user.role == 'parent') ...[
              DropdownButtonFormField<String>(
                initialValue:
                    widget.students.any((student) => student.id == _studentId)
                    ? _studentId
                    : null,
                decoration: const InputDecoration(
                  labelText: 'Student',
                  prefixIcon: Icon(Icons.school_outlined),
                ),
                items: [
                  for (final student in widget.students)
                    DropdownMenuItem(
                      value: student.id,
                      child: Text(
                        '${student.name} · ${student.detail}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
                onChanged: (value) => setState(() => _studentId = value),
                validator: (value) =>
                    value == null ? 'Choose a student.' : null,
              ),
              const SizedBox(height: ErpSpacing.md),
            ],
            _dateButton('Starts', _startsOn, () => _pickDate(true)),
            const SizedBox(height: ErpSpacing.sm),
            _dateButton('Ends', _endsOn, () => _pickDate(false)),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _reason,
              decoration: const InputDecoration(
                labelText: 'Reason',
                prefixIcon: Icon(Icons.notes_outlined),
              ),
              minLines: 3,
              maxLines: 5,
              maxLength: 500,
              validator: (value) => value == null || value.trim().length < 3
                  ? 'Enter at least 3 characters.'
                  : null,
            ),
            const SizedBox(height: ErpSpacing.md),
            FilledButton.icon(
              onPressed: _saving ? null : _save,
              icon: _saving
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.send_outlined),
              label: Text(_saving ? 'Submitting…' : 'Submit request'),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _dateButton(String label, DateTime date, VoidCallback onPressed) =>
      OutlinedButton.icon(
        onPressed: _saving ? null : onPressed,
        icon: const Icon(Icons.calendar_today_outlined),
        label: Align(
          alignment: Alignment.centerLeft,
          child: Text('$label · ${DateFormat('d MMM yyyy').format(date)}'),
        ),
      );
}
