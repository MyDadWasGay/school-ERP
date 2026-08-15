import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/attendance_models.dart';
import '../../../shared/models/teacher_models.dart';
import '../../../shared/widgets/erp_states.dart';

const _attendanceStates = <String>[
  'present',
  'absent',
  'late',
  'leave',
  'half_day',
  'medical',
];

class TeacherAttendanceScreen extends ConsumerStatefulWidget {
  const TeacherAttendanceScreen({super.key});

  @override
  ConsumerState<TeacherAttendanceScreen> createState() =>
      _TeacherAttendanceScreenState();
}

class _TeacherAttendanceScreenState
    extends ConsumerState<TeacherAttendanceScreen> {
  late DateTime _date;
  final _search = TextEditingController();
  final _states = <String, String?>{};
  final _drafts = <String, AttendanceDraft>{};
  final _saving = <String>{};
  String _query = '';

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _date = DateTime(now.year, now.month, now.day);
    _search.addListener(
      () => setState(() => _query = _search.text.trim().toLowerCase()),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDrafts());
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  String get _dateKey =>
      '${_date.year.toString().padLeft(4, '0')}-'
      '${_date.month.toString().padLeft(2, '0')}-'
      '${_date.day.toString().padLeft(2, '0')}';

  Future<void> _pickDate() async {
    final value = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 90)),
      lastDate: DateTime.now(),
      initialDate: _date,
      helpText: 'Attendance date',
    );
    if (value == null) return;
    setState(() {
      _date = DateTime(value.year, value.month, value.day);
      _states.clear();
      _drafts.clear();
    });
    await _loadDrafts();
  }

  Future<void> _loadDrafts() async {
    final user = ref.read(sessionProvider).valueOrNull;
    final campusId = user?.campus?.id;
    if (user == null || campusId == null) return;
    final drafts = await ref
        .read(attendanceDraftStoreProvider)
        .read(userId: user.id, campusId: campusId);
    if (!mounted) return;
    final currentDate = _dateKey;
    setState(() {
      _drafts
        ..clear()
        ..addEntries(
          drafts
              .where((draft) => draft.attendanceDate == currentDate)
              .map((draft) => MapEntry(draft.studentId, draft)),
        );
    });
  }

  String _draftId(String studentId, String userId, String campusId) =>
      '$userId:$campusId:$_dateKey:daily:$studentId';

  Future<void> _saveDraft({
    required String studentId,
    required String state,
  }) async {
    final user = ref.read(sessionProvider).valueOrNull;
    final campusId = user?.campus?.id;
    if (user == null || campusId == null) return;
    final draft = AttendanceDraft(
      id: _draftId(studentId, user.id, campusId),
      userId: user.id,
      campusId: campusId,
      studentId: studentId,
      attendanceDate: _dateKey,
      periodKey: 'daily',
      state: state,
      savedAt: DateTime.now(),
    );
    await ref.read(attendanceDraftStoreProvider).upsert(draft);
    if (!mounted) return;
    setState(() => _drafts[studentId] = draft);
  }

  bool _isRetryableNetworkError(Object error) =>
      error is ApiError &&
      (error.kind == ApiErrorKind.networkUnavailable ||
          error.kind == ApiErrorKind.timeout);

  Future<void> _save(String studentId, String state) async {
    if (_saving.contains(studentId)) return;
    setState(() => _saving.add(studentId));
    try {
      await ref
          .read(apiClientProvider)
          .markAttendance(
            studentId: studentId,
            attendanceDate: _date,
            periodKey: 'daily',
            state: state,
          );
      final draft = _drafts.remove(studentId);
      if (draft != null) {
        await ref.read(attendanceDraftStoreProvider).remove(draft.id);
      }
      ref.invalidate(teacherAttendanceForDateProvider(_dateKey));
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Attendance saved.')));
      }
    } on Object catch (error) {
      if (_isRetryableNetworkError(error)) {
        try {
          await _saveDraft(studentId: studentId, state: state);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Connection unavailable. Attendance saved locally for manual sync.',
                ),
              ),
            );
          }
        } on Object catch (draftError) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(readableApiError(draftError))),
            );
          }
        }
      } else if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    } finally {
      if (mounted) setState(() => _saving.remove(studentId));
    }
  }

  Future<void> _syncDrafts() async {
    if (_drafts.isEmpty) return;
    final drafts = _drafts.values.toList(growable: false);
    var synced = 0;
    for (final draft in drafts) {
      if (!mounted) return;
      try {
        await ref
            .read(apiClientProvider)
            .markAttendance(
              studentId: draft.studentId,
              attendanceDate: DateTime.parse(draft.attendanceDate),
              periodKey: draft.periodKey,
              state: draft.state,
            );
        await ref.read(attendanceDraftStoreProvider).remove(draft.id);
        if (mounted) {
          setState(() => _drafts.remove(draft.studentId));
        }
        synced++;
      } on Object catch (error) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                synced == 0
                    ? readableApiError(error)
                    : '$synced draft(s) synced. ${readableApiError(error)}',
              ),
            ),
          );
        }
        return;
      }
    }
    ref.invalidate(teacherAttendanceForDateProvider(_dateKey));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$synced attendance draft(s) synced.')),
      );
    }
  }

  Future<void> _markAllPresent(List<StudentOption> students) async {
    for (final student in students) {
      if (!mounted) return;
      setState(() => _states[student.id] = 'present');
      await _save(student.id, 'present');
    }
  }

  @override
  Widget build(BuildContext context) {
    final options = ref.watch(studentOptionsProvider);
    final attendance = ref.watch(teacherAttendanceForDateProvider(_dateKey));
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            ErpSpacing.lg,
            ErpSpacing.md,
            ErpSpacing.lg,
            ErpSpacing.sm,
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickDate,
                      icon: const Icon(Icons.calendar_today_outlined),
                      label: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          DateFormat('EEEE, d MMM yyyy').format(_date),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: ErpSpacing.sm),
                  options.when(
                    loading: () => const SizedBox.square(
                      dimension: 40,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    error: (error, stack) => const SizedBox.shrink(),
                    data: (students) => FilledButton.tonal(
                      onPressed: students.isEmpty
                          ? null
                          : () => _markAllPresent(students),
                      child: const Text('All present'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: ErpSpacing.sm),
              TextField(
                controller: _search,
                decoration: const InputDecoration(
                  labelText: 'Search students',
                  prefixIcon: Icon(Icons.search),
                  suffixIcon: Icon(Icons.filter_alt_outlined),
                ),
              ),
              if (_drafts.isNotEmpty) ...[
                const SizedBox(height: ErpSpacing.sm),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.cloud_off_outlined),
                    title: Text('${_drafts.length} local attendance draft(s)'),
                    subtitle: const Text(
                      'These changes are not on the server yet. Sync only when the connection is stable.',
                    ),
                    trailing: FilledButton.tonal(
                      onPressed: _syncDrafts,
                      child: const Text('Sync'),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        Expanded(
          child: options.when(
            loading: () => const ErpLoadingList(),
            error: (error, stack) => ErpErrorState(
              error: error,
              onRetry: () => ref.invalidate(studentOptionsProvider),
            ),
            data: (students) => attendance.when(
              loading: () => const ErpLoadingList(),
              error: (error, stack) => ErpErrorState(
                error: error,
                onRetry: () =>
                    ref.invalidate(teacherAttendanceForDateProvider(_dateKey)),
              ),
              data: (page) {
                final existing = <String, String>{
                  for (final row in page.rows) row.studentId: row.state,
                };
                final filtered = students
                    .where((student) {
                      if (_query.isEmpty) return true;
                      return student.name.toLowerCase().contains(_query) ||
                          student.detail.toLowerCase().contains(_query);
                    })
                    .toList(growable: false);
                if (filtered.isEmpty) {
                  return const ErpEmptyState(
                    icon: Icons.groups_outlined,
                    title: 'No students found',
                    message:
                        'Try a different search or check your assigned class scope.',
                  );
                }
                return ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(
                    ErpSpacing.lg,
                    ErpSpacing.sm,
                    ErpSpacing.lg,
                    ErpSpacing.xxl,
                  ),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(height: ErpSpacing.sm),
                  itemBuilder: (context, index) {
                    final student = filtered[index];
                    final selected =
                        _states[student.id] ??
                        _drafts[student.id]?.state ??
                        existing[student.id];
                    return _AttendanceStudentCard(
                      student: student,
                      selectedState: selected,
                      saving: _saving.contains(student.id),
                      onStateChanged: (state) =>
                          setState(() => _states[student.id] = state),
                      onSave: selected == null
                          ? null
                          : () => _save(student.id, selected),
                    );
                  },
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _AttendanceStudentCard extends StatelessWidget {
  const _AttendanceStudentCard({
    required this.student,
    required this.selectedState,
    required this.saving,
    required this.onStateChanged,
    required this.onSave,
  });
  final StudentOption student;
  final String? selectedState;
  final bool saving;
  final ValueChanged<String?> onStateChanged;
  final VoidCallback? onSave;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(ErpSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      student.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (student.detail.isNotEmpty)
                      Text(
                        student.detail,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                  ],
                ),
              ),
              if (saving)
                const SizedBox.square(
                  dimension: 22,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              IconButton(
                tooltip: 'Save attendance',
                onPressed: saving ? null : onSave,
                icon: const Icon(Icons.save_outlined),
              ),
            ],
          ),
          const SizedBox(height: ErpSpacing.sm),
          Wrap(
            spacing: ErpSpacing.xs,
            runSpacing: ErpSpacing.xs,
            children: [
              for (final state in _attendanceStates)
                Semantics(
                  button: true,
                  label: '${_label(state)} attendance for ${student.name}',
                  child: ChoiceChip(
                    label: Text(_label(state)),
                    selected: selectedState == state,
                    onSelected: (_) => onStateChanged(state),
                  ),
                ),
            ],
          ),
          if (selectedState == null)
            Padding(
              padding: const EdgeInsets.only(top: ErpSpacing.xs),
              child: Text(
                'Choose a status before saving.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
        ],
      ),
    ),
  );

  static String _label(String value) => value
      .replaceAll('_', ' ')
      .split(' ')
      .map(
        (word) => word.isEmpty
            ? word
            : '${word[0].toUpperCase()}${word.substring(1)}',
      )
      .join(' ');
}
