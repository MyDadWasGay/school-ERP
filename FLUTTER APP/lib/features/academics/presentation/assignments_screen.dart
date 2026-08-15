import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/academic_models.dart';
import '../../../shared/models/identity_models.dart';
import '../../../shared/widgets/erp_states.dart';

class AssignmentsScreen extends ConsumerStatefulWidget {
  const AssignmentsScreen({super.key});

  @override
  ConsumerState<AssignmentsScreen> createState() => _AssignmentsScreenState();
}

class _AssignmentsScreenState extends ConsumerState<AssignmentsScreen> {
  Future<void> _create(CurrentUser user) async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _AssignmentForm(user: user),
    );
    if (created == true) ref.invalidate(academicRecordsProvider('assignments'));
  }

  @override
  Widget build(BuildContext context) {
    final records = ref.watch(academicRecordsProvider('assignments'));
    final user = ref.watch(sessionProvider).valueOrNull;
    return Scaffold(
      body: records.when(
        loading: () => const ErpLoadingList(),
        error: (error, stack) => ErpErrorState(
          error: error,
          onRetry: () => ref.invalidate(academicRecordsProvider('assignments')),
        ),
        data: (rows) {
          if (rows.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(academicRecordsProvider('assignments'));
                await ref.read(academicRecordsProvider('assignments').future);
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(
                    height: 420,
                    child: ErpEmptyState(
                      icon: Icons.assignment_outlined,
                      title: 'No assignments yet',
                      message:
                          'Published homework and assignment deadlines will appear here.',
                    ),
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(academicRecordsProvider('assignments'));
              await ref.read(academicRecordsProvider('assignments').future);
            },
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(ErpSpacing.lg),
              itemCount: rows.length,
              separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
              itemBuilder: (context, index) {
                final row = rows[index];
                return Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: ErpSpacing.lg,
                      vertical: ErpSpacing.sm,
                    ),
                    leading: const CircleAvatar(
                      child: Icon(Icons.assignment_outlined),
                    ),
                    title: Text(row.name),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: ErpSpacing.xs),
                      child: Text(row.detail),
                    ),
                    trailing: ErpStatusChip(row.status),
                  ),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: user?.can('academics:create') == true
          ? FloatingActionButton.extended(
              onPressed: () => _create(user!),
              icon: const Icon(Icons.add),
              label: const Text('Assignment'),
            )
          : null,
    );
  }
}

class _AssignmentForm extends ConsumerStatefulWidget {
  const _AssignmentForm({required this.user});
  final CurrentUser user;

  @override
  ConsumerState<_AssignmentForm> createState() => _AssignmentFormState();
}

class _AssignmentFormState extends ConsumerState<_AssignmentForm> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _details = TextEditingController();
  String? _classId;
  String? _subjectId;
  String? _teacherId;
  DateTime _dueAt = DateTime.now().add(const Duration(days: 1));
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.user.role == 'teacher') _teacherId = widget.user.id;
  }

  @override
  void dispose() {
    _title.dispose();
    _details.dispose();
    super.dispose();
  }

  Future<void> _pickDueDate() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      initialDate: _dueAt,
      helpText: 'Assignment due date',
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_dueAt),
    );
    if (time == null) return;
    setState(
      () => _dueAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      ),
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() ||
        _classId == null ||
        _subjectId == null ||
        _teacherId == null) {
      setState(() {});
      return;
    }
    setState(() => _saving = true);
    try {
      await ref
          .read(apiClientProvider)
          .createAcademicRecord(
            kind: 'assignments',
            name: _title.text.trim(),
            teacherId: _teacherId,
            classId: _classId,
            subjectId: _subjectId,
            dueAt: _dueAt,
            details: _details.text,
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
  Widget build(BuildContext context) {
    final classes = ref.watch(academicOptionsProvider('class'));
    final subjects = ref.watch(academicOptionsProvider('subject'));
    final teachers = widget.user.role == 'teacher'
        ? const AsyncValue<List<AcademicOption>>.data([])
        : ref.watch(academicOptionsProvider('teacher'));
    return Padding(
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
                'Create assignment',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: ErpSpacing.md),
              TextFormField(
                controller: _title,
                autofocus: true,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  prefixIcon: Icon(Icons.title),
                ),
                textInputAction: TextInputAction.next,
                validator: (value) => value == null || value.trim().length < 2
                    ? 'Enter a title.'
                    : null,
              ),
              const SizedBox(height: ErpSpacing.md),
              _optionField(
                'Class',
                classes,
                _classId,
                (value) => setState(() => _classId = value),
              ),
              const SizedBox(height: ErpSpacing.md),
              _optionField(
                'Subject',
                subjects,
                _subjectId,
                (value) => setState(() => _subjectId = value),
              ),
              if (widget.user.role != 'teacher') ...[
                const SizedBox(height: ErpSpacing.md),
                _optionField(
                  'Teacher',
                  teachers,
                  _teacherId,
                  (value) => setState(() => _teacherId = value),
                ),
              ],
              const SizedBox(height: ErpSpacing.md),
              OutlinedButton.icon(
                onPressed: _saving ? null : _pickDueDate,
                icon: const Icon(Icons.event_outlined),
                label: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Due ${DateFormat('d MMM yyyy, h:mm a').format(_dueAt)}',
                  ),
                ),
              ),
              const SizedBox(height: ErpSpacing.md),
              TextFormField(
                controller: _details,
                decoration: const InputDecoration(
                  labelText: 'Instructions (optional)',
                  prefixIcon: Icon(Icons.notes_outlined),
                ),
                minLines: 2,
                maxLines: 4,
                maxLength: 2000,
              ),
              const SizedBox(height: ErpSpacing.md),
              FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save_outlined),
                label: Text(_saving ? 'Saving…' : 'Save assignment'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _optionField(
    String label,
    AsyncValue<List<AcademicOption>> value,
    String? selected,
    ValueChanged<String?> onChanged,
  ) => value.when(
    loading: () => InputDecorator(
      decoration: InputDecoration(labelText: label),
      child: const LinearProgressIndicator(),
    ),
    error: (error, stack) => InputDecorator(
      decoration: InputDecoration(
        labelText: label,
        errorText: 'Could not load options.',
      ),
      child: TextButton(
        onPressed: () =>
            ref.invalidate(academicOptionsProvider(label.toLowerCase())),
        child: const Text('Retry'),
      ),
    ),
    data: (options) => DropdownButtonFormField<String>(
      initialValue: options.any((item) => item.id == selected)
          ? selected
          : null,
      decoration: InputDecoration(labelText: label),
      items: [
        for (final option in options)
          DropdownMenuItem(
            value: option.id,
            child: Text(
              '${option.label}${option.detail.isEmpty ? '' : ' · ${option.detail}'}',
              overflow: TextOverflow.ellipsis,
            ),
          ),
      ],
      onChanged: options.isEmpty ? null : onChanged,
      validator: (value) =>
          value == null ? 'Choose a $label.'.toLowerCase() : null,
    ),
  );
}
