import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/attendance_models.dart';
import '../../../shared/models/teacher_models.dart';
import '../../../shared/widgets/erp_states.dart';
import 'teacher_attendance_screen.dart';

class AttendanceWorkspaceScreen extends ConsumerStatefulWidget {
  const AttendanceWorkspaceScreen({super.key});

  @override
  ConsumerState<AttendanceWorkspaceScreen> createState() =>
      _AttendanceWorkspaceScreenState();
}

class _AttendanceWorkspaceScreenState
    extends ConsumerState<AttendanceWorkspaceScreen> {
  bool _can(String permission) =>
      ref.read(sessionProvider).valueOrNull?.can(permission) == true;

  Future<void> _refresh() async {
    for (final provider in [
      attendanceOverviewProvider,
      attendanceCorrectionsProvider,
      disciplineIncidentsProvider,
      studentOptionsProvider,
      teacherAttendanceProvider,
    ]) {
      ref.invalidate(provider);
    }
    ref.invalidate(lowAttendanceProvider);
    await Future.wait([
      if (_can('attendance:read')) ref.read(attendanceOverviewProvider.future),
      if (_can('attendance:read'))
        ref.read(attendanceCorrectionsProvider.future),
      if (_can('attendance:read')) ref.read(lowAttendanceProvider(75).future),
      if (_can('safety:read')) ref.read(disciplineIncidentsProvider.future),
    ]);
  }

  void _showError(Object error) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
  }

  void _showSuccess(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final tabs = <Tab>[];
    final views = <Widget>[];
    if (user?.can('attendance:mark') == true) {
      tabs.add(const Tab(text: 'Take attendance'));
      views.add(const TeacherAttendanceScreen());
    }
    if (user?.can('attendance:read') == true) {
      tabs.add(const Tab(text: 'Overview'));
      views.add(_AttendanceOverviewTab(onRefresh: _refresh));
      tabs.add(const Tab(text: 'Day records'));
      views.add(_AttendanceDayRecordsTab(onRefresh: _refresh));
      tabs.add(const Tab(text: 'Corrections'));
      views.add(
        _AttendanceCorrectionsTab(
          onRefresh: _refresh,
          onReview: (row, decision) async {
            try {
              await ref
                  .read(apiClientProvider)
                  .reviewAttendanceCorrection(row.id, decision);
              await _refresh();
              _showSuccess('Correction request $decision.');
            } on Object catch (error) {
              _showError(error);
            }
          },
        ),
      );
      tabs.add(const Tab(text: 'Low attendance'));
      views.add(_LowAttendanceTab(onRefresh: _refresh));
    }
    if (user?.can('safety:read') == true) {
      tabs.add(const Tab(text: 'Discipline'));
      views.add(
        _DisciplineTab(
          onRefresh: _refresh,
          onError: _showError,
          onSuccess: _showSuccess,
        ),
      );
    }
    if (tabs.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.fact_check_outlined,
        title: 'Attendance is not available',
        message: 'Your account does not have attendance access.',
      );
    }
    return DefaultTabController(
      length: tabs.length,
      child: Column(
        children: [
          TabBar(isScrollable: true, tabs: tabs),
          Expanded(child: TabBarView(children: views)),
        ],
      ),
    );
  }
}

class _AttendanceOverviewTab extends ConsumerWidget {
  const _AttendanceOverviewTab({required this.onRefresh});

  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(attendanceOverviewProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(error: error, onRetry: onRefresh),
      data: (overview) => RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(ErpSpacing.lg),
          children: [
            Wrap(
              spacing: ErpSpacing.sm,
              runSpacing: ErpSpacing.sm,
              children: [
                _AttendanceMetric(
                  label: 'Attendance rate',
                  value: '${overview.rate.toStringAsFixed(1)}%',
                  icon: Icons.percent,
                ),
                _AttendanceMetric(
                  label: 'Attended',
                  value: '${overview.attended}/${overview.total}',
                  icon: Icons.check_circle_outline,
                ),
                for (final state in overview.states)
                  _AttendanceMetric(
                    label: _attendanceTitle(state.state),
                    value: '${state.total}',
                    icon: Icons.pie_chart_outline,
                  ),
              ],
            ),
            const SizedBox(height: ErpSpacing.lg),
            Text(
              'Class and section performance',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: ErpSpacing.sm),
            if (overview.groups.isEmpty)
              const ErpEmptyState(
                icon: Icons.groups_outlined,
                title: 'No grouped attendance data',
                message:
                    'Attendance summaries will appear after records exist.',
              )
            else
              for (final group in overview.groups)
                Card(
                  child: ListTile(
                    leading: const CircleAvatar(
                      child: Icon(Icons.groups_outlined),
                    ),
                    title: Text('${group.className} · ${group.sectionName}'),
                    subtitle: Text('${group.attended}/${group.total} attended'),
                    trailing: Text(
                      '${group.rate.toStringAsFixed(1)}%',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

class _AttendanceDayRecordsTab extends ConsumerStatefulWidget {
  const _AttendanceDayRecordsTab({required this.onRefresh});

  final Future<void> Function() onRefresh;

  @override
  ConsumerState<_AttendanceDayRecordsTab> createState() =>
      _AttendanceDayRecordsTabState();
}

class _AttendanceDayRecordsTabState
    extends ConsumerState<_AttendanceDayRecordsTab> {
  late DateTime _date;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _date = DateTime(now.year, now.month, now.day);
  }

  String get _dateKey => _attendanceDateKey(_date);

  Future<void> _pickDate() async {
    final selected = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 180)),
      lastDate: DateTime.now(),
      initialDate: _date,
    );
    if (selected == null) return;
    setState(
      () => _date = DateTime(selected.year, selected.month, selected.day),
    );
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(teacherAttendanceForDateProvider(_dateKey));
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(ErpSpacing.lg),
          child: OutlinedButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.calendar_today_outlined),
            label: Align(
              alignment: Alignment.centerLeft,
              child: Text(DateFormat('EEEE, d MMM yyyy').format(_date)),
            ),
          ),
        ),
        Expanded(
          child: value.when(
            loading: () => const ErpLoadingList(),
            error: (error, stack) => ErpErrorState(
              error: error,
              onRetry: () =>
                  ref.invalidate(teacherAttendanceForDateProvider(_dateKey)),
            ),
            data: (page) => RefreshIndicator(
              onRefresh: widget.onRefresh,
              child: page.rows.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: const [
                        SizedBox(height: ErpSpacing.xxl),
                        ErpEmptyState(
                          icon: Icons.event_busy_outlined,
                          title: 'No records for this date',
                          message:
                              'Marked student attendance will appear here.',
                        ),
                      ],
                    )
                  : ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(
                        ErpSpacing.lg,
                        0,
                        ErpSpacing.lg,
                        ErpSpacing.xxl,
                      ),
                      itemCount: page.rows.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: ErpSpacing.sm),
                      itemBuilder: (context, index) {
                        final row = page.rows[index];
                        return Card(
                          child: ListTile(
                            leading: const CircleAvatar(
                              child: Icon(Icons.fact_check_outlined),
                            ),
                            title: Text(row.student),
                            subtitle: Text('${row.period} · ${row.markedAt}'),
                            trailing: ErpStatusChip(row.state),
                          ),
                        );
                      },
                    ),
            ),
          ),
        ),
      ],
    );
  }
}

class _AttendanceCorrectionsTab extends ConsumerWidget {
  const _AttendanceCorrectionsTab({
    required this.onRefresh,
    required this.onReview,
  });

  final Future<void> Function() onRefresh;
  final Future<void> Function(AttendanceCorrectionRow row, String decision)
  onReview;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(attendanceCorrectionsProvider);
    final canReview =
        ref
            .watch(sessionProvider)
            .valueOrNull
            ?.can('attendance:approve_correction') ==
        true;
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(error: error, onRetry: onRefresh),
      data: (rows) => RefreshIndicator(
        onRefresh: onRefresh,
        child: rows.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: ErpSpacing.xxl),
                  ErpEmptyState(
                    icon: Icons.fact_check_outlined,
                    title: 'No pending corrections',
                    message: 'Attendance correction requests will appear here.',
                  ),
                ],
              )
            : ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(ErpSpacing.lg),
                itemCount: rows.length,
                separatorBuilder: (_, _) =>
                    const SizedBox(height: ErpSpacing.sm),
                itemBuilder: (context, index) {
                  final row = rows[index];
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(ErpSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            row.student,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: ErpSpacing.xs),
                          Text(
                            '${_attendanceTitle(row.currentState)} → ${_attendanceTitle(row.requestedState)}\n${row.reason}',
                          ),
                          if (canReview) ...[
                            const SizedBox(height: ErpSpacing.sm),
                            Wrap(
                              spacing: ErpSpacing.sm,
                              children: [
                                FilledButton.tonal(
                                  onPressed: () => onReview(row, 'approved'),
                                  child: const Text('Approve'),
                                ),
                                OutlinedButton(
                                  onPressed: () => onReview(row, 'rejected'),
                                  child: const Text('Reject'),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

class _LowAttendanceTab extends ConsumerStatefulWidget {
  const _LowAttendanceTab({required this.onRefresh});

  final Future<void> Function() onRefresh;

  @override
  ConsumerState<_LowAttendanceTab> createState() => _LowAttendanceTabState();
}

class _LowAttendanceTabState extends ConsumerState<_LowAttendanceTab> {
  double _threshold = 75;
  double _appliedThreshold = 75;

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(lowAttendanceProvider(_appliedThreshold));
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            ErpSpacing.lg,
            ErpSpacing.md,
            ErpSpacing.lg,
            0,
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Below ${_threshold.toStringAsFixed(0)}%',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              TextButton(
                onPressed: () => setState(() {
                  _threshold = 75;
                  _appliedThreshold = 75;
                }),
                child: const Text('75%'),
              ),
            ],
          ),
        ),
        Slider(
          value: _threshold,
          min: 50,
          max: 95,
          divisions: 9,
          label: '${_threshold.toStringAsFixed(0)}%',
          onChanged: (value) => setState(() => _threshold = value),
          onChangeEnd: (value) => setState(() => _appliedThreshold = value),
        ),
        Expanded(
          child: value.when(
            loading: () => const ErpLoadingList(),
            error: (error, stack) =>
                ErpErrorState(error: error, onRetry: widget.onRefresh),
            data: (rows) => RefreshIndicator(
              onRefresh: widget.onRefresh,
              child: rows.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: const [
                        SizedBox(height: ErpSpacing.xxl),
                        ErpEmptyState(
                          icon: Icons.trending_down_outlined,
                          title: 'No low-attendance students',
                          message:
                              'Students below the selected threshold appear here.',
                        ),
                      ],
                    )
                  : ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(ErpSpacing.lg),
                      itemCount: rows.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: ErpSpacing.sm),
                      itemBuilder: (context, index) {
                        final row = rows[index];
                        return Card(
                          child: ListTile(
                            leading: const CircleAvatar(
                              child: Icon(Icons.warning_amber_outlined),
                            ),
                            title: Text(row.student),
                            subtitle: Text(
                              '${row.attended}/${row.total} attended',
                            ),
                            trailing: Text(
                              '${row.percentage.toStringAsFixed(1)}%',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
        ),
      ],
    );
  }
}

class _DisciplineTab extends ConsumerStatefulWidget {
  const _DisciplineTab({
    required this.onRefresh,
    required this.onError,
    required this.onSuccess,
  });

  final Future<void> Function() onRefresh;
  final void Function(Object error) onError;
  final void Function(String message) onSuccess;

  @override
  ConsumerState<_DisciplineTab> createState() => _DisciplineTabState();
}

class _DisciplineTabState extends ConsumerState<_DisciplineTab> {
  bool _can(String permission) =>
      ref.read(sessionProvider).valueOrNull?.can(permission) == true;

  Future<List<StudentOption>> _students() async {
    if (_can('attendance:read')) {
      return ref.read(studentOptionsProvider.future);
    }
    if (_can('students:read')) {
      final page = await ref.read(studentDirectoryProvider('').future);
      return page.rows
          .map(
            (row) =>
                StudentOption(id: row.id, name: row.name, detail: row.detail),
          )
          .toList(growable: false);
    }
    return const [];
  }

  Future<void> _create() async {
    final students = await _students();
    if (!mounted) return;
    if (students.isEmpty) {
      widget.onSuccess(
        'Student directory access is required to record a discipline incident.',
      );
      return;
    }
    final values = await showModalBottomSheet<_DisciplineValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _DisciplineForm(students: students),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createDisciplineIncident(
            studentId: values.studentId,
            severity: values.severity,
            title: values.title,
            occurredAt: values.occurredAt,
            details: values.details,
            confidential: values.confidential,
          );
      await widget.onRefresh();
      widget.onSuccess('Discipline incident recorded.');
    } on Object catch (error) {
      widget.onError(error);
    }
  }

  Future<void> _update(DisciplineIncidentRow row) async {
    final status = await showModalBottomSheet<String>(
      context: context,
      useSafeArea: true,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            for (final value in const ['open', 'resolved', 'dismissed'])
              ListTile(
                title: Text(_attendanceTitle(value)),
                onTap: () => Navigator.pop(context, value),
              ),
          ],
        ),
      ),
    );
    if (status == null || !mounted) return;
    try {
      await ref.read(apiClientProvider).updateDisciplineStatus(row.id, status);
      await widget.onRefresh();
      widget.onSuccess('Discipline status updated.');
    } on Object catch (error) {
      widget.onError(error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(disciplineIncidentsProvider);
    final canCreate = _can('safety:create');
    final canUpdate = _can('safety:update');
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) =>
          ErpErrorState(error: error, onRetry: widget.onRefresh),
      data: (rows) => RefreshIndicator(
        onRefresh: widget.onRefresh,
        child: ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(ErpSpacing.lg),
          itemCount: rows.isEmpty ? 2 : rows.length + 1,
          separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
          itemBuilder: (context, index) {
            if (index == 0) {
              return Align(
                alignment: Alignment.centerRight,
                child: FilledButton.icon(
                  onPressed: canCreate ? _create : null,
                  icon: const Icon(Icons.add_alert_outlined),
                  label: const Text('Record incident'),
                ),
              );
            }
            if (rows.isEmpty) {
              return const ErpEmptyState(
                icon: Icons.shield_outlined,
                title: 'No discipline incidents',
                message:
                    'Sensitive student incidents will appear here for authorized staff.',
              );
            }
            final row = rows[index - 1];
            return Card(
              child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.shield_outlined)),
                title: Text('${row.student} · ${row.title}'),
                subtitle: Text(
                  '${row.severity} · ${row.occurredAt}${row.confidential ? '\nConfidential' : ''}',
                ),
                isThreeLine: row.confidential,
                trailing: canUpdate
                    ? TextButton(
                        onPressed: () => _update(row),
                        child: Text(_attendanceTitle(row.status)),
                      )
                    : ErpStatusChip(row.status),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _DisciplineForm extends StatefulWidget {
  const _DisciplineForm({required this.students});

  final List<StudentOption> students;

  @override
  State<_DisciplineForm> createState() => _DisciplineFormState();
}

class _DisciplineFormState extends State<_DisciplineForm> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _details = TextEditingController();
  String? _studentId;
  String _severity = 'medium';
  bool _confidential = true;
  DateTime _occurredAt = DateTime.now();

  @override
  void initState() {
    super.initState();
    _studentId = widget.students.first.id;
  }

  @override
  void dispose() {
    _title.dispose();
    _details.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
      initialDate: _occurredAt,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_occurredAt),
    );
    if (time == null) return;
    setState(
      () => _occurredAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      ),
    );
  }

  @override
  Widget build(BuildContext context) => _AttendanceSheetFrame(
    title: 'Record discipline incident',
    child: Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _studentId,
            decoration: const InputDecoration(labelText: 'Student'),
            items: [
              for (final student in widget.students)
                DropdownMenuItem(value: student.id, child: Text(student.name)),
            ],
            onChanged: (value) => setState(() => _studentId = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _severity,
            decoration: const InputDecoration(labelText: 'Severity'),
            items: const [
              DropdownMenuItem(value: 'low', child: Text('Low')),
              DropdownMenuItem(value: 'medium', child: Text('Medium')),
              DropdownMenuItem(value: 'high', child: Text('High')),
              DropdownMenuItem(value: 'critical', child: Text('Critical')),
            ],
            onChanged: (value) => setState(() => _severity = value ?? 'medium'),
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _title,
            decoration: const InputDecoration(labelText: 'Title'),
            validator: (value) => value == null || value.trim().length < 3
                ? 'Enter a title.'
                : null,
          ),
          const SizedBox(height: ErpSpacing.md),
          OutlinedButton.icon(
            onPressed: _pickDateTime,
            icon: const Icon(Icons.event_outlined),
            label: Text(DateFormat('d MMM yyyy, h:mm a').format(_occurredAt)),
          ),
          const SizedBox(height: ErpSpacing.md),
          TextField(
            controller: _details,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Details (optional)'),
          ),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            title: const Text('Confidential'),
            value: _confidential,
            onChanged: (value) => setState(() => _confidential = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          FilledButton(
            onPressed: () {
              if (!_formKey.currentState!.validate() || _studentId == null) {
                return;
              }
              Navigator.pop(
                context,
                _DisciplineValues(
                  studentId: _studentId!,
                  severity: _severity,
                  title: _title.text.trim(),
                  occurredAt: _occurredAt,
                  details: _details.text.trim(),
                  confidential: _confidential,
                ),
              );
            },
            child: const Text('Record incident'),
          ),
        ],
      ),
    ),
  );
}

class _AttendanceMetric extends StatelessWidget {
  const _AttendanceMetric({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 170,
    child: Card(
      child: ListTile(
        leading: Icon(icon),
        title: Text(label),
        subtitle: Text(value),
      ),
    ),
  );
}

class _DisciplineValues {
  const _DisciplineValues({
    required this.studentId,
    required this.severity,
    required this.title,
    required this.occurredAt,
    required this.details,
    required this.confidential,
  });

  final String studentId;
  final String severity;
  final String title;
  final DateTime occurredAt;
  final String details;
  final bool confidential;
}

class _AttendanceSheetFrame extends StatelessWidget {
  const _AttendanceSheetFrame({required this.title, required this.child});

  final String title;
  final Widget child;

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
          Text(title, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: ErpSpacing.md),
          child,
        ],
      ),
    ),
  );
}

String _attendanceDateKey(DateTime date) =>
    '${date.year.toString().padLeft(4, '0')}-'
    '${date.month.toString().padLeft(2, '0')}-'
    '${date.day.toString().padLeft(2, '0')}';

String _attendanceTitle(String value) => value
    .replaceAll('_', ' ')
    .split(' ')
    .map(
      (word) =>
          word.isEmpty ? word : '${word[0].toUpperCase()}${word.substring(1)}',
    )
    .join(' ');
