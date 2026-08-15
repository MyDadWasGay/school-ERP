import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/workspace_models.dart';
import '../../../shared/widgets/erp_states.dart';
import 'exam_extended_workspace.dart';

class ExamWorkspaceScreen extends ConsumerStatefulWidget {
  const ExamWorkspaceScreen({super.key});

  @override
  ConsumerState<ExamWorkspaceScreen> createState() =>
      _ExamWorkspaceScreenState();
}

class _ExamWorkspaceScreenState extends ConsumerState<ExamWorkspaceScreen> {
  Future<void> _refresh() async {
    ref.invalidate(examResultsProvider);
    ref.invalidate(examPlanningProvider);
    ref.invalidate(examWorkspaceOptionsProvider);
    ref.invalidate(examPlanningOptionsProvider);
    await Future.wait([
      ref.read(examResultsProvider.future),
      ref.read(examPlanningProvider.future),
      ref.read(questionBankProvider.future),
      ref.read(reportCardsProvider.future),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final canEnterMarks = user?.can('exams:enter_marks') == true;
    final canManage =
        user?.can('exams:create') == true || user?.can('exams:update') == true;
    final tabCount = 2 + (canManage ? 1 : 0) + (canEnterMarks ? 1 : 0) + 2;
    return DefaultTabController(
      length: tabCount,
      child: Column(
        children: [
          TabBar(
            tabs: [
              const Tab(text: 'Results'),
              const Tab(text: 'Planning'),
              if (canManage) const Tab(text: 'Setup'),
              if (canEnterMarks) const Tab(text: 'Enter marks'),
              const Tab(text: 'Question bank'),
              const Tab(text: 'Report cards'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _ExamResultsTab(onRefresh: _refresh),
                _ExamPlanningTab(onChanged: _refresh),
                if (canManage) ExamPlanningSetupTab(onRefresh: _refresh),
                if (canEnterMarks) const _MarksEntryTab(),
                ExamQuestionBankTab(onRefresh: _refresh),
                ExamReportCardsTab(onRefresh: _refresh),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ExamResultsTab extends ConsumerWidget {
  const _ExamResultsTab({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(examResultsProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(examResultsProvider),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.workspace_premium_outlined,
            title: 'No exam records',
            message: 'Exam schedules and publication updates will appear here.',
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
                  leading: const CircleAvatar(
                    child: Icon(Icons.assessment_outlined),
                  ),
                  title: Text(row.name),
                  subtitle: Text(
                    'Maximum marks: ${row.maxMarks}'
                    '${row.publishedAt == null ? '' : '\nPublished ${row.publishedAt}'}',
                  ),
                  isThreeLine: row.publishedAt != null,
                  trailing: ErpStatusChip(row.status),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _ExamPlanningTab extends ConsumerWidget {
  const _ExamPlanningTab({required this.onChanged});
  final Future<void> Function() onChanged;

  Future<void> _runAction(
    BuildContext context,
    WidgetRef ref,
    ExamPlanningRow row,
    String action,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('$action?'),
        content: Text(
          action == 'Publish results'
              ? 'Published results become visible to students and parents.'
              : 'Confirm the exam workflow transition for ${row.name}.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(action),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      final api = ref.read(apiClientProvider);
      if (action == 'Publish results') {
        await api.publishExamResults(row.id);
      } else {
        final nextStatus = switch (row.status) {
          'draft' || 'planning' when row.scheduleCount > 0 => 'marks_entry',
          'marks_entry' => 'moderation',
          'moderation' => 'approved',
          _ => null,
        };
        if (nextStatus == null) return;
        await api.transitionExamStatus(row.id, nextStatus);
      }
      await onChanged();
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$action completed.')));
      }
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(examPlanningProvider);
    final user = ref.watch(sessionProvider).valueOrNull;
    final canUpdate = user?.can('exams:update') == true;
    final canPublish = user?.can('exams:publish_result') == true;
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(examPlanningProvider),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.event_note_outlined,
            title: 'No exam planning records',
            message: 'Exam windows and schedules will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: onChanged,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: rows.length,
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              final row = rows[index];
              final action = _actionFor(row, canUpdate, canPublish);
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
                              row.name,
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                          ErpStatusChip(row.status),
                        ],
                      ),
                      const SizedBox(height: ErpSpacing.sm),
                      Text(
                        '${row.maxMarks} maximum marks · ${row.scheduleCount} schedule${row.scheduleCount == 1 ? '' : 's'}',
                      ),
                      if (row.startsOn != null || row.endsOn != null) ...[
                        const SizedBox(height: ErpSpacing.xs),
                        Text(
                          [
                            row.startsOn,
                            row.endsOn,
                          ].whereType<String>().join(' – '),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                      if (action != null) ...[
                        const SizedBox(height: ErpSpacing.md),
                        Align(
                          alignment: Alignment.centerRight,
                          child: FilledButton.tonal(
                            onPressed: () =>
                                _runAction(context, ref, row, action),
                            child: Text(action),
                          ),
                        ),
                      ],
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

  String? _actionFor(ExamPlanningRow row, bool canUpdate, bool canPublish) {
    if (row.status == 'approved' && canPublish) return 'Publish results';
    if (!canUpdate) return null;
    return switch (row.status) {
      'draft' || 'planning' when row.scheduleCount > 0 => 'Open marks entry',
      'marks_entry' => 'Move to moderation',
      'moderation' => 'Approve marks',
      _ => null,
    };
  }
}

class _MarksEntryTab extends ConsumerStatefulWidget {
  const _MarksEntryTab();

  @override
  ConsumerState<_MarksEntryTab> createState() => _MarksEntryTabState();
}

class _MarksEntryTabState extends ConsumerState<_MarksEntryTab> {
  final _formKey = GlobalKey<FormState>();
  final _marks = TextEditingController();
  String? _examId;
  String? _studentId;
  String? _subjectId;
  bool _saving = false;

  @override
  void dispose() {
    _marks.dispose();
    super.dispose();
  }

  Future<void> _save(ExamWorkspaceOptions options) async {
    if (!_formKey.currentState!.validate()) return;
    if (_examId == null ||
        _studentId == null ||
        _subjectId == null ||
        !options.exams.any((item) => item.id == _examId) ||
        !options.students.any((item) => item.id == _studentId) ||
        !options.subjects.any((item) => item.id == _subjectId)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Select a valid exam, student and subject.'),
        ),
      );
      return;
    }
    final exam = options.exams.firstWhere((item) => item.id == _examId);
    final marks = int.tryParse(_marks.text.trim());
    if (marks == null || marks > exam.maxMarks) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(apiClientProvider)
          .saveMarks(
            examId: exam.id,
            studentId: _studentId!,
            subjectId: _subjectId!,
            marks: marks,
            maxMarks: exam.maxMarks,
          );
      _marks.clear();
      ref.invalidate(examPlanningProvider);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Marks saved.')));
      }
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
  Widget build(BuildContext context) {
    final value = ref.watch(examWorkspaceOptionsProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(examWorkspaceOptionsProvider),
      ),
      data: (options) {
        if (options == null ||
            options.exams.isEmpty ||
            options.subjects.isEmpty ||
            options.students.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.edit_note_outlined,
            title: 'Marks entry is not ready',
            message:
                'An editable exam, subject and assigned student are required before marks can be saved.',
          );
        }
        if (!options.exams.any((item) => item.id == _examId)) {
          _examId = options.exams.first.id;
        }
        if (!options.students.any((item) => item.id == _studentId)) {
          _studentId = options.students.first.id;
        }
        if (!options.subjects.any((item) => item.id == _subjectId)) {
          _subjectId = options.subjects.first.id;
        }
        final exam = options.exams.firstWhere((item) => item.id == _examId);
        return ListView(
          padding: const EdgeInsets.all(ErpSpacing.lg),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(ErpSpacing.lg),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Save a marks entry',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: ErpSpacing.xs),
                      Text(
                        'The server validates exam status, class assignment and maximum marks before saving.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: ErpSpacing.lg),
                      DropdownButtonFormField<String>(
                        initialValue: _examId,
                        decoration: const InputDecoration(
                          labelText: 'Exam',
                          prefixIcon: Icon(Icons.assessment_outlined),
                        ),
                        items: [
                          for (final item in options.exams)
                            DropdownMenuItem(
                              value: item.id,
                              child: Text(
                                '${item.name} · max ${item.maxMarks}',
                              ),
                            ),
                        ],
                        onChanged: _saving
                            ? null
                            : (value) => setState(() => _examId = value),
                      ),
                      const SizedBox(height: ErpSpacing.md),
                      DropdownButtonFormField<String>(
                        initialValue: _studentId,
                        decoration: const InputDecoration(
                          labelText: 'Student',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                        items: [
                          for (final item in options.students)
                            DropdownMenuItem(
                              value: item.id,
                              child: Text(item.name),
                            ),
                        ],
                        onChanged: _saving
                            ? null
                            : (value) => setState(() => _studentId = value),
                      ),
                      const SizedBox(height: ErpSpacing.md),
                      DropdownButtonFormField<String>(
                        initialValue: _subjectId,
                        decoration: const InputDecoration(
                          labelText: 'Subject',
                          prefixIcon: Icon(Icons.menu_book_outlined),
                        ),
                        items: [
                          for (final item in options.subjects)
                            DropdownMenuItem(
                              value: item.id,
                              child: Text(item.name),
                            ),
                        ],
                        onChanged: _saving
                            ? null
                            : (value) => setState(() => _subjectId = value),
                      ),
                      const SizedBox(height: ErpSpacing.md),
                      TextFormField(
                        controller: _marks,
                        enabled: !_saving,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.done,
                        decoration: InputDecoration(
                          labelText: 'Marks',
                          prefixIcon: const Icon(Icons.edit_outlined),
                          suffixText: '/ ${exam.maxMarks}',
                        ),
                        validator: (value) {
                          final parsed = int.tryParse(value?.trim() ?? '');
                          if (parsed == null || parsed < 0) {
                            return 'Enter a whole number of marks.';
                          }
                          if (parsed > exam.maxMarks) {
                            return 'Marks cannot exceed ${exam.maxMarks}.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: ErpSpacing.lg),
                      FilledButton.icon(
                        onPressed: _saving ? null : () => _save(options),
                        icon: _saving
                            ? const SizedBox.square(
                                dimension: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.save_outlined),
                        label: Text(_saving ? 'Saving…' : 'Save marks'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
