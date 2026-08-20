import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../core/sync/mutation_queue.dart';
import '../../../core/sync/sync_engine.dart';
import '../../../shared/models/identity_models.dart';
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
    extends ConsumerState<TeacherAttendanceScreen>
    with WidgetsBindingObserver {
  late DateTime _date;
  final _search = TextEditingController();
  final _states = <String, String?>{};
  final _drafts = <String, QueuedMutation>{};
  final _saving = <String>{};
  String _query = '';
  bool _bulkSaving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final now = DateTime.now();
    _date = DateTime(now.year, now.month, now.day);
    _search.addListener(
      () => setState(() => _query = _search.text.trim().toLowerCase()),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDrafts());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _search.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    _loadDrafts().then((_) {
      if (mounted && _drafts.isNotEmpty) unawaited(_syncDrafts());
    });
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
    await _migrateLegacyDrafts(user, campusId);
    final scope = SyncScope(
      tenantId: user.organization.id,
      userId: user.id,
      campusId: campusId,
    );
    final drafts = await ref.read(mutationQueueProvider).read(scope);
    if (!mounted) return;
    final currentDate = _dateKey;
    setState(() {
      _drafts
        ..clear()
        ..addEntries(
          drafts
              .where(
                (draft) =>
                    draft.entityType == 'attendance' &&
                    draft.status != MutationStatus.synced &&
                    _mutationDate(draft) == currentDate,
              )
              .map((draft) => MapEntry(draft.entityId, draft)),
        );
    });
  }

  Future<void> _migrateLegacyDrafts(CurrentUser user, String campusId) async {
    final legacy = await ref
        .read(attendanceDraftStoreProvider)
        .read(userId: user.id, campusId: campusId);
    if (legacy.isEmpty) return;
    final scope = SyncScope(
      tenantId: user.organization.id,
      userId: user.id,
      campusId: campusId,
    );
    final queue = ref.read(mutationQueueProvider);
    for (final draft in legacy) {
      await queue.upsert(
        scope,
        QueuedMutation(
          id: draft.id,
          tenantId: user.organization.id,
          campusId: campusId,
          userId: user.id,
          entityType: 'attendance',
          entityId: draft.studentId,
          operation: 'upsert',
          payload: {
            'studentId': draft.studentId,
            'attendanceDate': draft.attendanceDate,
            'periodKey': draft.periodKey,
            'state': draft.state,
            if (draft.note != null) 'note': draft.note,
          },
          createdAt: draft.savedAt,
          attemptCount: 0,
          status: MutationStatus.pending,
          idempotencyKey: draft.id,
        ),
      );
      await ref.read(attendanceDraftStoreProvider).remove(draft.id);
    }
  }

  String? _mutationDate(QueuedMutation mutation) {
    final value = mutation.payload['attendanceDate'];
    return value is String ? value : null;
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
    final scope = SyncScope(
      tenantId: user.organization.id,
      userId: user.id,
      campusId: campusId,
    );
    final draft = QueuedMutation(
      id: _draftId(studentId, user.id, campusId),
      tenantId: user.organization.id,
      campusId: campusId,
      userId: user.id,
      entityType: 'attendance',
      entityId: studentId,
      operation: 'upsert',
      payload: {
        'studentId': studentId,
        'attendanceDate': _dateKey,
        'periodKey': 'daily',
        'state': state,
      },
      createdAt: DateTime.now().toUtc(),
      attemptCount: 0,
      status: MutationStatus.pending,
      idempotencyKey: _draftId(studentId, user.id, campusId),
    );
    await ref.read(mutationQueueProvider).upsert(scope, draft);
    if (!mounted) return;
    setState(() => _drafts[studentId] = draft);
  }

  bool _isRetryableNetworkError(Object error) =>
      const RetryPolicy().classify(error) == MutationFailureKind.retryable;

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
      final user = ref.read(sessionProvider).valueOrNull;
      final campusId = user?.campus?.id;
      final draft = _drafts.remove(studentId);
      if (draft != null) {
        if (user != null && campusId != null) {
          await ref
              .read(mutationQueueProvider)
              .remove(
                SyncScope(
                  tenantId: user.organization.id,
                  userId: user.id,
                  campusId: campusId,
                ),
                draft.id,
              );
        }
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
    final user = ref.read(sessionProvider).valueOrNull;
    final campusId = user?.campus?.id;
    if (user == null || campusId == null) return;
    final scope = SyncScope(
      tenantId: user.organization.id,
      userId: user.id,
      campusId: campusId,
    );
    final queue = ref.read(mutationQueueProvider);
    final engine = SyncEngine(
      queue: queue,
      executor: (mutation) async {
        final payload = mutation.payload;
        await ref.read(apiClientProvider).markAttendance(
          studentId: asString(payload['studentId'], 'attendance.studentId'),
          attendanceDate: DateTime.parse(
            asString(payload['attendanceDate'], 'attendance.attendanceDate'),
          ),
          periodKey: asString(payload['periodKey'], 'attendance.periodKey'),
          state: asString(payload['state'], 'attendance.state'),
          note: payload['note'] as String?,
        );
      },
    );
    for (final draft in _drafts.values) {
      if (draft.status == MutationStatus.failed ||
          draft.status == MutationStatus.conflict) {
        await queue.upsert(
          scope,
          draft.copyWith(
            status: MutationStatus.pending,
            clearLastError: true,
          ),
        );
      }
    }
    final report = await engine.sync(scope);
    await queue.clearCompleted(scope);
    await _loadDrafts();
    if (report.synced > 0) ref.invalidate(teacherAttendanceForDateProvider(_dateKey));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${report.synced} attendance draft(s) synced. '
            '${report.failed + report.conflict + report.retryable} still need attention.',
          ),
        ),
      );
    }
  }

  Future<void> _markAllPresent(List<StudentOption> students) async {
    if (_bulkSaving || students.isEmpty) return;
    setState(() {
      _bulkSaving = true;
      for (final student in students) {
        _states[student.id] = 'present';
      }
    });
    try {
      final results = await ref
          .read(apiClientProvider)
          .markAttendanceBulk(
            attendanceDate: _date,
            periodKey: 'daily',
            records: [
              for (final student in students)
                (studentId: student.id, state: 'present', note: null),
            ],
          );
      final user = ref.read(sessionProvider).valueOrNull;
      final campusId = user?.campus?.id;
      final queue = ref.read(mutationQueueProvider);
      for (final student in students) {
        final draft = _drafts.remove(student.id);
        if (draft != null && user != null && campusId != null) {
          await queue.remove(
            SyncScope(
              tenantId: user.organization.id,
              userId: user.id,
              campusId: campusId,
            ),
            draft.id,
          );
        }
      }
      ref.invalidate(teacherAttendanceForDateProvider(_dateKey));
      if (mounted) {
        final corrections = results.where((result) => result.correctionRequested).length;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              corrections == 0
                  ? '${results.length} students marked present.'
                  : '${results.length} attendance records submitted. $corrections correction request(s) created.',
            ),
          ),
        );
      }
    } on Object catch (error) {
      if (_isRetryableNetworkError(error)) {
        for (final student in students) {
          await _saveDraft(studentId: student.id, state: 'present');
        }
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Connection unavailable. The attendance batch was saved locally for sync.',
              ),
            ),
          );
        }
      } else if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    } finally {
      if (mounted) setState(() => _bulkSaving = false);
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
                      onPressed: students.isEmpty || _bulkSaving
                          ? null
                          : () => _markAllPresent(students),
                      child: _bulkSaving
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('All present'),
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
                      _drafts[student.id]?.payload['state'] as String? ??
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
