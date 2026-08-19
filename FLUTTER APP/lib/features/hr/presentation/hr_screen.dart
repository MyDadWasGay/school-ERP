import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/workspace_models.dart';
import '../../../shared/models/hr_models.dart';
import '../../../shared/widgets/erp_states.dart';
import '../../leave/presentation/leave_screen.dart';

class HrScreen extends ConsumerStatefulWidget {
  const HrScreen({super.key});

  @override
  ConsumerState<HrScreen> createState() => _HrScreenState();
}

class _HrScreenState extends ConsumerState<HrScreen> {
  Future<void> _refresh() async {
    final user = ref.read(sessionProvider).valueOrNull;
    final canReadEmployees = user?.can('hr:read') == true;
    final canReadPayroll = user?.can('payroll:read') == true;
    final canReadAttendance = user?.can('attendance:read') == true;
    ref.invalidate(employeesProvider);
    ref.invalidate(payrollRunsProvider);
    ref.invalidate(payslipsProvider);
    ref.invalidate(staffAttendanceProvider);
    ref.invalidate(employeeAttendanceOptionsProvider);
    await Future.wait([
      if (canReadEmployees) ref.read(employeesProvider.future),
      if (canReadPayroll) ref.read(payrollRunsProvider.future),
      if (canReadPayroll) ref.read(payslipsProvider.future),
      if (canReadAttendance) ref.read(staffAttendanceProvider.future),
    ]);
  }

  Future<void> _createPayrollRun() async {
    final period = await showDialog<String>(
      context: context,
      builder: (context) => const _PayrollPeriodDialog(),
    );
    if (period == null || !mounted) return;
    try {
      await ref.read(apiClientProvider).createPayrollRun(period);
      await _refresh();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Payroll run created.')));
      }
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final canReadEmployees = user?.can('hr:read') == true;
    final canReadPayroll = user?.can('payroll:read') == true;
    final canCreatePayroll = user?.can('payroll:create') == true;
    final canReadAttendance = user?.can('attendance:read') == true;
    final tabs = <Tab>[
      if (canReadEmployees) const Tab(text: 'Staff'),
      if (canReadPayroll) const Tab(text: 'Payroll'),
      if (canReadPayroll) const Tab(text: 'Payslips'),
      if (canReadAttendance) const Tab(text: 'Staff attendance'),
      if (canReadAttendance) const Tab(text: 'Leave'),
    ];
    final views = <Widget>[
      if (canReadEmployees) _EmployeeDirectory(onRefresh: _refresh),
      if (canReadPayroll)
        _PayrollRuns(
          canCreate: canCreatePayroll,
          onCreate: _createPayrollRun,
          onRefresh: _refresh,
        ),
      if (canReadPayroll) _Payslips(onRefresh: _refresh),
      if (canReadAttendance) _StaffAttendanceTab(onRefresh: _refresh),
      if (canReadAttendance) const LeaveScreen(),
    ];
    if (tabs.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.lock_outline,
        title: 'People data is not available',
        message: 'Your account does not have staff or payroll access.',
      );
    }
    return DefaultTabController(
      length: tabs.length,
      child: Column(
        children: [
          TabBar(tabs: tabs),
          Expanded(child: TabBarView(children: views)),
        ],
      ),
    );
  }
}

class _EmployeeDirectory extends ConsumerWidget {
  const _EmployeeDirectory({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(employeesProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(employeesProvider),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.groups_outlined,
            title: 'No active staff',
            message: 'Staff records in your campus scope will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: rows.length,
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              final row = rows[index];
              return Card(
                child: ListTile(
                  leading: CircleAvatar(child: Text(_initials(row.name))),
                  title: Text(row.name),
                  subtitle: Text(
                    '${row.employeeNumber} · ${row.jobTitle?.isNotEmpty == true ? row.jobTitle : 'Staff member'}'
                    '${row.email?.isNotEmpty == true ? '\n${row.email}' : ''}',
                  ),
                  isThreeLine: row.email?.isNotEmpty == true,
                  trailing: ErpStatusChip(row.status),
                ),
              );
            },
          ),
        );
      },
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    return parts.take(2).map((part) => part[0].toUpperCase()).join();
  }
}

class _PayrollRuns extends ConsumerStatefulWidget {
  const _PayrollRuns({
    required this.canCreate,
    required this.onCreate,
    required this.onRefresh,
  });
  final bool canCreate;
  final VoidCallback onCreate;
  final Future<void> Function() onRefresh;

  @override
  ConsumerState<_PayrollRuns> createState() => _PayrollRunsState();
}

class _PayrollRunsState extends ConsumerState<_PayrollRuns> {
  final _busy = <String>{};

  Future<void> _process(PayrollRunRow row) async {
    if (_busy.contains(row.id)) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Process payroll?'),
        content: Text(
          'This will calculate and issue payslips for active staff for ${row.period}.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Process'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _busy.add(row.id));
    try {
      await ref.read(apiClientProvider).processPayrollRun(row.id);
      await widget.onRefresh();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Payroll processed.')));
      }
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    } finally {
      if (mounted) setState(() => _busy.remove(row.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(payrollRunsProvider);
    final canProcess =
        ref.watch(sessionProvider).valueOrNull?.can('payroll:update') == true;
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(payrollRunsProvider),
      ),
      data: (rows) {
        if (rows.isEmpty && !widget.canCreate) {
          return const ErpEmptyState(
            icon: Icons.payments_outlined,
            title: 'No payroll runs',
            message: 'Payroll periods will appear here when created.',
          );
        }
        return RefreshIndicator(
          onRefresh: widget.onRefresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: rows.length + (widget.canCreate ? 1 : 0),
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              if (widget.canCreate && index == 0) {
                return FilledButton.icon(
                  onPressed: widget.onCreate,
                  icon: const Icon(Icons.add),
                  label: const Text('Create payroll run'),
                );
              }
              final row = rows[widget.canCreate ? index - 1 : index];
              final isBusy = _busy.contains(row.id);
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.payments)),
                  title: Text(row.period),
                  subtitle: Text('${row.total} · ${row.payslipCount} payslips'),
                  trailing: row.status == 'draft' && canProcess
                      ? FilledButton.tonal(
                          onPressed: isBusy ? null : () => _process(row),
                          child: Text(isBusy ? 'Working…' : 'Process'),
                        )
                      : ErpStatusChip(row.status),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _Payslips extends ConsumerWidget {
  const _Payslips({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(payslipsProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(payslipsProvider),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.receipt_long_outlined,
            title: 'No payslips',
            message:
                'Issued payslips will appear here after payroll processing.',
          );
        }
        return RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: rows.length,
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              final row = rows[index];
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(ErpSpacing.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              row.employeeName,
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                          ErpStatusChip(row.status),
                        ],
                      ),
                      const SizedBox(height: ErpSpacing.xs),
                      Text('${row.employeeNumber} · ${row.period}'),
                      const SizedBox(height: ErpSpacing.md),
                      Text(
                        'Net ${row.net}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: ErpSpacing.xs),
                      Text('Gross ${row.gross} · Deductions ${row.deductions}'),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _StaffAttendanceTab extends ConsumerStatefulWidget {
  const _StaffAttendanceTab({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  ConsumerState<_StaffAttendanceTab> createState() =>
      _StaffAttendanceTabState();
}

class _StaffAttendanceTabState extends ConsumerState<_StaffAttendanceTab> {
  Future<void> _record() async {
    final options = await ref.read(employeeAttendanceOptionsProvider.future);
    if (!mounted) return;
    if (options.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No active employees are available.')),
      );
      return;
    }
    final values = await showModalBottomSheet<_StaffAttendanceValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _StaffAttendanceForm(options: options),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .recordStaffAttendance(
            employeeId: values.employeeId,
            attendanceDate: values.date,
            state: values.state,
            note: values.note,
          );
      await widget.onRefresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Staff attendance recorded.')),
        );
      }
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(staffAttendanceProvider);
    final canMark =
        ref.watch(sessionProvider).valueOrNull?.can('attendance:mark') == true;
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(staffAttendanceProvider),
      ),
      data: (rows) {
        if (rows.isEmpty && !canMark) {
          return const ErpEmptyState(
            icon: Icons.badge_outlined,
            title: 'No staff attendance',
            message: 'Recorded staff attendance in your scope appears here.',
          );
        }
        return RefreshIndicator(
          onRefresh: widget.onRefresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: rows.length + (canMark ? 1 : 0),
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              if (canMark && index == 0) {
                return FilledButton.icon(
                  onPressed: _record,
                  icon: const Icon(Icons.fact_check_outlined),
                  label: const Text('Record staff attendance'),
                );
              }
              if (rows.isEmpty) {
                return const ErpEmptyState(
                  icon: Icons.badge_outlined,
                  title: 'No staff attendance',
                  message: 'Start by recording attendance for an employee.',
                );
              }
              final row = rows[canMark ? index - 1 : index];
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(
                    child: Icon(Icons.badge_outlined),
                  ),
                  title: Text(row.name),
                  subtitle: Text(
                    '${DateFormat('d MMM yyyy').format(row.attendanceDate.toLocal())}${row.note?.isNotEmpty == true ? '\n${row.note}' : ''}',
                  ),
                  isThreeLine: row.note?.isNotEmpty == true,
                  trailing: ErpStatusChip(row.state),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _StaffAttendanceValues {
  const _StaffAttendanceValues({
    required this.employeeId,
    required this.date,
    required this.state,
    this.note,
  });
  final String employeeId;
  final DateTime date;
  final String state;
  final String? note;
}

class _StaffAttendanceForm extends StatefulWidget {
  const _StaffAttendanceForm({required this.options});
  final List<EmployeeOption> options;

  @override
  State<_StaffAttendanceForm> createState() => _StaffAttendanceFormState();
}

class _StaffAttendanceFormState extends State<_StaffAttendanceForm> {
  final _note = TextEditingController();
  String? _employeeId;
  String _state = 'present';
  DateTime _date = DateTime.now();

  @override
  void initState() {
    super.initState();
    _employeeId = widget.options.first.id;
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final value = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 90)),
      lastDate: DateTime.now(),
      initialDate: _date,
    );
    if (value != null && mounted) setState(() => _date = value);
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(
      left: ErpSpacing.lg,
      right: ErpSpacing.lg,
      top: ErpSpacing.lg,
      bottom: MediaQuery.viewInsetsOf(context).bottom + ErpSpacing.lg,
    ),
    child: SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Record staff attendance',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _employeeId,
            decoration: const InputDecoration(labelText: 'Employee'),
            items: [
              for (final option in widget.options)
                DropdownMenuItem(value: option.id, child: Text(option.name)),
            ],
            onChanged: (value) => setState(() => _employeeId = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _state,
            decoration: const InputDecoration(labelText: 'Attendance state'),
            items: const [
              DropdownMenuItem(value: 'present', child: Text('Present')),
              DropdownMenuItem(value: 'absent', child: Text('Absent')),
              DropdownMenuItem(value: 'late', child: Text('Late')),
              DropdownMenuItem(value: 'leave', child: Text('Leave')),
            ],
            onChanged: (value) => setState(() => _state = value ?? 'present'),
          ),
          const SizedBox(height: ErpSpacing.md),
          OutlinedButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.calendar_today_outlined),
            label: Text(DateFormat('d MMM yyyy').format(_date)),
          ),
          const SizedBox(height: ErpSpacing.md),
          TextField(
            controller: _note,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Note (optional)'),
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: _employeeId == null
                ? null
                : () => Navigator.pop(
                    context,
                    _StaffAttendanceValues(
                      employeeId: _employeeId!,
                      date: _date,
                      state: _state,
                      note: _note.text.trim().isEmpty
                          ? null
                          : _note.text.trim(),
                    ),
                  ),
            child: const Text('Save attendance'),
          ),
        ],
      ),
    ),
  );
}

class _PayrollPeriodDialog extends StatefulWidget {
  const _PayrollPeriodDialog();

  @override
  State<_PayrollPeriodDialog> createState() => _PayrollPeriodDialogState();
}

class _PayrollPeriodDialogState extends State<_PayrollPeriodDialog> {
  late final TextEditingController _period;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _period = TextEditingController(
      text: '${now.year}-${now.month.toString().padLeft(2, '0')}',
    );
  }

  @override
  void dispose() {
    _period.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Create payroll run'),
    content: TextField(
      controller: _period,
      keyboardType: TextInputType.datetime,
      decoration: const InputDecoration(
        labelText: 'Period',
        hintText: '2026-08',
        prefixIcon: Icon(Icons.calendar_month_outlined),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: () {
          final value = _period.text.trim();
          if (!RegExp(r'^\d{4}-(0[1-9]|1[0-2])$').hasMatch(value)) return;
          Navigator.pop(context, value);
        },
        child: const Text('Create'),
      ),
    ],
  );
}
