import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/exam_models.dart';
import '../../../shared/models/workspace_models.dart';
import '../../../shared/widgets/erp_states.dart';

class ExamPlanningSetupTab extends ConsumerStatefulWidget {
  const ExamPlanningSetupTab({required this.onRefresh, super.key});

  final Future<void> Function() onRefresh;

  @override
  ConsumerState<ExamPlanningSetupTab> createState() =>
      _ExamPlanningSetupTabState();
}

class _ExamPlanningSetupTabState extends ConsumerState<ExamPlanningSetupTab> {
  bool _can(String permission) =>
      ref.read(sessionProvider).valueOrNull?.can(permission) == true;

  void _message(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _createExam() async {
    final options = await ref.read(examPlanningOptionsProvider.future);
    if (!mounted || options == null || options.academicYears.isEmpty) {
      _message('An active academic year is required before creating an exam.');
      return;
    }
    final values = await showModalBottomSheet<_ExamValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _ExamFormSheet(years: options.academicYears),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createExam(
            academicYearId: values.academicYearId,
            name: values.name,
            maxMarks: values.maxMarks,
            startsOn: values.startsOn,
            endsOn: values.endsOn,
          );
      await widget.onRefresh();
      _message('Exam created.');
    } on Object catch (error) {
      _message(readableApiError(error));
    }
  }

  Future<void> _scheduleExam() async {
    final results = await Future.wait<Object?>([
      ref.read(examPlanningProvider.future),
      ref.read(examPlanningOptionsProvider.future),
    ]);
    if (!mounted) return;
    final exams = (results[0] as List<ExamPlanningRow>)
        .where((row) => row.status == 'draft' || row.status == 'planning')
        .toList(growable: false);
    final options = results[1] as ExamPlanningOptions?;
    if (options == null ||
        exams.isEmpty ||
        options.subjects.isEmpty ||
        options.classes.isEmpty) {
      _message(
        'An editable exam, subject and class are required for scheduling.',
      );
      return;
    }
    final values = await showModalBottomSheet<_ScheduleValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _ScheduleFormSheet(
        exams: exams,
        subjects: options.subjects,
        classes: options.classes,
      ),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .scheduleExam(
            examId: values.examId,
            subjectId: values.subjectId,
            classId: values.classId,
            startsAt: values.startsAt,
            endsAt: values.endsAt,
            roomId: values.roomId,
          );
      await widget.onRefresh();
      _message('Exam schedule saved.');
    } on Object catch (error) {
      _message(readableApiError(error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final options = ref.watch(examPlanningOptionsProvider);
    final canCreate = _can('exams:create');
    final canUpdate = _can('exams:update');
    return valueRefreshable(
      context: context,
      value: options,
      onRefresh: widget.onRefresh,
      builder: (options) {
        if (options == null) {
          return const ErpEmptyState(
            icon: Icons.lock_outline,
            title: 'Exam setup is unavailable',
            message: 'Your account cannot read exam planning options.',
          );
        }
        return ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(ErpSpacing.lg),
          children: [
            Text('Exam setup', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: ErpSpacing.xs),
            const Text(
              'Create an exam window and add class schedules before opening marks entry.',
            ),
            const SizedBox(height: ErpSpacing.lg),
            Wrap(
              spacing: ErpSpacing.sm,
              runSpacing: ErpSpacing.sm,
              children: [
                if (canCreate)
                  FilledButton.icon(
                    onPressed: options.academicYears.isEmpty
                        ? null
                        : _createExam,
                    icon: const Icon(Icons.add),
                    label: const Text('Create exam'),
                  ),
                if (canUpdate)
                  FilledButton.tonalIcon(
                    onPressed:
                        options.classes.isEmpty || options.subjects.isEmpty
                        ? null
                        : _scheduleExam,
                    icon: const Icon(Icons.calendar_month_outlined),
                    label: const Text('Add schedule'),
                  ),
              ],
            ),
            if (options.academicYears.isEmpty) ...[
              const SizedBox(height: ErpSpacing.lg),
              const ErpEmptyState(
                icon: Icons.calendar_month_outlined,
                title: 'No active academic year',
                message:
                    'Configure an active academic year before creating exams.',
              ),
            ],
          ],
        );
      },
    );
  }
}

class ExamQuestionBankTab extends ConsumerStatefulWidget {
  const ExamQuestionBankTab({required this.onRefresh, super.key});

  final Future<void> Function() onRefresh;

  @override
  ConsumerState<ExamQuestionBankTab> createState() =>
      _ExamQuestionBankTabState();
}

class _ExamQuestionBankTabState extends ConsumerState<ExamQuestionBankTab> {
  bool _can(String permission) =>
      ref.read(sessionProvider).valueOrNull?.can(permission) == true;

  Future<void> _create() async {
    final options = await ref.read(deepExamOptionsProvider.future);
    if (!mounted || options == null || options.subjects.isEmpty) {
      _show('An active subject is required before adding a question.');
      return;
    }
    final values = await showModalBottomSheet<_QuestionValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _QuestionFormSheet(subjects: options.subjects),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createQuestionBankItem(
            subjectId: values.subjectId,
            questionType: values.questionType,
            prompt: values.prompt,
            answer: values.answer,
            maximumMarks: values.maximumMarks,
          );
      await widget.onRefresh();
      _show('Question added to the bank.');
    } on Object catch (error) {
      _show(readableApiError(error));
    }
  }

  void _show(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(questionBankProvider);
    final canCreate = _can('exams:create');
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
                  icon: const Icon(Icons.add),
                  label: const Text('Add question'),
                ),
              );
            }
            if (rows.isEmpty) {
              return const ErpEmptyState(
                icon: Icons.quiz_outlined,
                title: 'No question bank items',
                message:
                    'Draft questions will appear here for authorized exam staff.',
              );
            }
            final row = rows[index - 1];
            return Card(
              child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.quiz_outlined)),
                title: Text(row.prompt),
                subtitle: Text(
                  '${row.subjectName ?? row.subjectId} · ${_title(row.questionType)} · ${row.maximumMarks} mark(s)',
                ),
                trailing: ErpStatusChip(row.status),
              ),
            );
          },
        ),
      ),
    );
  }
}

class ExamReportCardsTab extends ConsumerStatefulWidget {
  const ExamReportCardsTab({required this.onRefresh, super.key});

  final Future<void> Function() onRefresh;

  @override
  ConsumerState<ExamReportCardsTab> createState() => _ExamReportCardsTabState();
}

class _ExamReportCardsTabState extends ConsumerState<ExamReportCardsTab> {
  bool _can(String permission) =>
      ref.read(sessionProvider).valueOrNull?.can(permission) == true;

  Future<void> _generate() async {
    final options = await ref.read(deepExamOptionsProvider.future);
    if (!mounted ||
        options == null ||
        options.exams.isEmpty ||
        options.students.isEmpty) {
      _show('An approved exam and active student are required.');
      return;
    }
    final values = await showModalBottomSheet<_ReportCardValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _ReportCardFormSheet(options: options),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .generateReportCard(
            examId: values.examId,
            studentId: values.studentId,
          );
      await widget.onRefresh();
      _show('Report card generated.');
    } on Object catch (error) {
      _show(readableApiError(error));
    }
  }

  void _show(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(reportCardsProvider);
    final canCreate = _can('exams:update');
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
                  onPressed: canCreate ? _generate : null,
                  icon: const Icon(Icons.post_add_outlined),
                  label: const Text('Generate report card'),
                ),
              );
            }
            if (rows.isEmpty) {
              return const ErpEmptyState(
                icon: Icons.description_outlined,
                title: 'No report cards',
                message: 'Generated report cards will appear here.',
              );
            }
            final row = rows[index - 1];
            return Card(
              child: ListTile(
                leading: const CircleAvatar(
                  child: Icon(Icons.description_outlined),
                ),
                title: Text('${row.exam} · ${row.student}'),
                subtitle: Text(
                  '${row.total ?? '—'}/${row.maximum ?? '—'} · ${DateFormat('d MMM yyyy').format(row.generatedAt.toLocal())}',
                ),
                trailing: Text(
                  row.percentage == null
                      ? '—'
                      : '${row.percentage!.toStringAsFixed(1)}%',
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

Widget valueRefreshable<T>({
  required BuildContext context,
  required AsyncValue<T> value,
  required Future<void> Function() onRefresh,
  required Widget Function(T value) builder,
}) => value.when(
  loading: () => const ErpLoadingList(),
  error: (error, stack) => ErpErrorState(error: error, onRetry: onRefresh),
  data: builder,
);

class _ExamFormSheet extends StatefulWidget {
  const _ExamFormSheet({required this.years});
  final List<ExamPlanningOption> years;

  @override
  State<_ExamFormSheet> createState() => _ExamFormSheetState();
}

class _ExamFormSheetState extends State<_ExamFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _marks = TextEditingController(text: '100');
  String? _yearId;
  DateTime? _startsOn;
  DateTime? _endsOn;

  @override
  void initState() {
    super.initState();
    _yearId = widget.years.first.id;
  }

  @override
  void dispose() {
    _name.dispose();
    _marks.dispose();
    super.dispose();
  }

  Future<void> _pick(bool start) async {
    final initial = start ? _startsOn : _endsOn;
    final selected = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      initialDate: initial ?? DateTime.now(),
    );
    if (selected == null) return;
    setState(() {
      final value = DateTime(selected.year, selected.month, selected.day);
      if (start) {
        _startsOn = value;
      } else {
        _endsOn = value;
      }
    });
  }

  @override
  Widget build(BuildContext context) => _ExamSheetFrame(
    title: 'Create exam',
    child: Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _yearId,
            decoration: const InputDecoration(labelText: 'Academic year'),
            items: [
              for (final year in widget.years)
                DropdownMenuItem(value: year.id, child: Text(year.name)),
            ],
            onChanged: (value) => setState(() => _yearId = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Exam name'),
            validator: (value) => value == null || value.trim().length < 2
                ? 'Enter an exam name.'
                : null,
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _marks,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Maximum marks'),
            validator: (value) =>
                int.tryParse(value?.trim() ?? '') == null ||
                    int.parse(value!.trim()) < 1
                ? 'Enter maximum marks.'
                : null,
          ),
          const SizedBox(height: ErpSpacing.md),
          OutlinedButton(
            onPressed: () => _pick(true),
            child: Text(
              _startsOn == null
                  ? 'Choose start date'
                  : 'Starts ${DateFormat('d MMM yyyy').format(_startsOn!)}',
            ),
          ),
          OutlinedButton(
            onPressed: () => _pick(false),
            child: Text(
              _endsOn == null
                  ? 'Choose end date'
                  : 'Ends ${DateFormat('d MMM yyyy').format(_endsOn!)}',
            ),
          ),
          const SizedBox(height: ErpSpacing.md),
          FilledButton(
            onPressed: () {
              if (!_formKey.currentState!.validate() || _yearId == null) return;
              if (_startsOn != null &&
                  _endsOn != null &&
                  _endsOn!.isBefore(_startsOn!)) {
                return;
              }
              Navigator.pop(
                context,
                _ExamValues(
                  academicYearId: _yearId!,
                  name: _name.text.trim(),
                  maxMarks: int.parse(_marks.text.trim()),
                  startsOn: _startsOn,
                  endsOn: _endsOn,
                ),
              );
            },
            child: const Text('Create exam'),
          ),
        ],
      ),
    ),
  );
}

class _ScheduleFormSheet extends StatefulWidget {
  const _ScheduleFormSheet({
    required this.exams,
    required this.subjects,
    required this.classes,
  });
  final List<ExamPlanningRow> exams;
  final List<ExamPlanningOption> subjects;
  final List<ExamPlanningOption> classes;

  @override
  State<_ScheduleFormSheet> createState() => _ScheduleFormSheetState();
}

class _ScheduleFormSheetState extends State<_ScheduleFormSheet> {
  final _room = TextEditingController();
  String? _examId;
  String? _subjectId;
  String? _classId;
  DateTime _startsAt = DateTime.now().add(const Duration(hours: 1));
  DateTime _endsAt = DateTime.now().add(const Duration(hours: 2));

  @override
  void initState() {
    super.initState();
    _examId = widget.exams.first.id;
    _subjectId = widget.subjects.first.id;
    _classId = widget.classes.first.id;
  }

  @override
  void dispose() {
    _room.dispose();
    super.dispose();
  }

  Future<void> _pick(bool start) async {
    final current = start ? _startsAt : _endsAt;
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      initialDate: current,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(current),
    );
    if (time == null) return;
    final value = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    setState(() {
      if (start) {
        _startsAt = value;
      } else {
        _endsAt = value;
      }
    });
  }

  @override
  Widget build(BuildContext context) => _ExamSheetFrame(
    title: 'Add exam schedule',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DropdownButtonFormField<String>(
          initialValue: _examId,
          decoration: const InputDecoration(labelText: 'Exam'),
          items: [
            for (final row in widget.exams)
              DropdownMenuItem(value: row.id, child: Text(row.name)),
          ],
          onChanged: (value) => setState(() => _examId = value),
        ),
        const SizedBox(height: ErpSpacing.md),
        DropdownButtonFormField<String>(
          initialValue: _subjectId,
          decoration: const InputDecoration(labelText: 'Subject'),
          items: [
            for (final row in widget.subjects)
              DropdownMenuItem(value: row.id, child: Text(row.name)),
          ],
          onChanged: (value) => setState(() => _subjectId = value),
        ),
        const SizedBox(height: ErpSpacing.md),
        DropdownButtonFormField<String>(
          initialValue: _classId,
          decoration: const InputDecoration(labelText: 'Class'),
          items: [
            for (final row in widget.classes)
              DropdownMenuItem(value: row.id, child: Text(row.name)),
          ],
          onChanged: (value) => setState(() => _classId = value),
        ),
        const SizedBox(height: ErpSpacing.md),
        OutlinedButton(
          onPressed: () => _pick(true),
          child: Text(
            'Starts ${DateFormat('d MMM yyyy, h:mm a').format(_startsAt)}',
          ),
        ),
        OutlinedButton(
          onPressed: () => _pick(false),
          child: Text(
            'Ends ${DateFormat('d MMM yyyy, h:mm a').format(_endsAt)}',
          ),
        ),
        TextField(
          controller: _room,
          decoration: const InputDecoration(labelText: 'Room (optional)'),
        ),
        const SizedBox(height: ErpSpacing.lg),
        FilledButton(
          onPressed:
              _examId == null ||
                  _subjectId == null ||
                  _classId == null ||
                  !_endsAt.isAfter(_startsAt)
              ? null
              : () => Navigator.pop(
                  context,
                  _ScheduleValues(
                    examId: _examId!,
                    subjectId: _subjectId!,
                    classId: _classId!,
                    startsAt: _startsAt,
                    endsAt: _endsAt,
                    roomId: _room.text.trim().isEmpty
                        ? null
                        : _room.text.trim(),
                  ),
                ),
          child: const Text('Save schedule'),
        ),
      ],
    ),
  );
}

class _QuestionFormSheet extends StatefulWidget {
  const _QuestionFormSheet({required this.subjects});
  final List<DeepSubjectOption> subjects;
  @override
  State<_QuestionFormSheet> createState() => _QuestionFormSheetState();
}

class _QuestionFormSheetState extends State<_QuestionFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _prompt = TextEditingController();
  final _answer = TextEditingController();
  final _marks = TextEditingController(text: '1');
  String? _subjectId;
  String _type = 'mcq';
  @override
  void initState() {
    super.initState();
    _subjectId = widget.subjects.first.id;
  }

  @override
  void dispose() {
    _prompt.dispose();
    _answer.dispose();
    _marks.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _ExamSheetFrame(
    title: 'Add question',
    child: Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _subjectId,
            decoration: const InputDecoration(labelText: 'Subject'),
            items: [
              for (final row in widget.subjects)
                DropdownMenuItem(value: row.id, child: Text(row.name)),
            ],
            onChanged: (value) => setState(() => _subjectId = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _type,
            decoration: const InputDecoration(labelText: 'Question type'),
            items: const [
              DropdownMenuItem(value: 'mcq', child: Text('MCQ')),
              DropdownMenuItem(
                value: 'short_answer',
                child: Text('Short answer'),
              ),
              DropdownMenuItem(
                value: 'long_answer',
                child: Text('Long answer'),
              ),
              DropdownMenuItem(value: 'true_false', child: Text('True/false')),
            ],
            onChanged: (value) => setState(() => _type = value ?? 'mcq'),
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _prompt,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Prompt'),
            validator: (value) => value == null || value.trim().length < 3
                ? 'Enter a question.'
                : null,
          ),
          const SizedBox(height: ErpSpacing.md),
          TextField(
            controller: _answer,
            decoration: const InputDecoration(
              labelText: 'Answer/key (optional)',
            ),
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _marks,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Maximum marks'),
            validator: (value) =>
                int.tryParse(value?.trim() ?? '') == null ||
                    int.parse(value!.trim()) < 1
                ? 'Enter marks.'
                : null,
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: () {
              if (!_formKey.currentState!.validate() || _subjectId == null) {
                return;
              }
              Navigator.pop(
                context,
                _QuestionValues(
                  subjectId: _subjectId!,
                  questionType: _type,
                  prompt: _prompt.text.trim(),
                  answer: _answer.text.trim().isEmpty
                      ? null
                      : _answer.text.trim(),
                  maximumMarks: int.parse(_marks.text.trim()),
                ),
              );
            },
            child: const Text('Add question'),
          ),
        ],
      ),
    ),
  );
}

class _ReportCardFormSheet extends StatefulWidget {
  const _ReportCardFormSheet({required this.options});
  final DeepExamOptions options;
  @override
  State<_ReportCardFormSheet> createState() => _ReportCardFormSheetState();
}

class _ReportCardFormSheetState extends State<_ReportCardFormSheet> {
  String? _examId;
  String? _studentId;
  @override
  void initState() {
    super.initState();
    _examId = widget.options.exams.first.id;
    _studentId = widget.options.students.first.id;
  }

  @override
  Widget build(BuildContext context) => _ExamSheetFrame(
    title: 'Generate report card',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DropdownButtonFormField<String>(
          initialValue: _examId,
          decoration: const InputDecoration(labelText: 'Approved exam'),
          items: [
            for (final row in widget.options.exams)
              DropdownMenuItem(value: row.id, child: Text(row.name)),
          ],
          onChanged: (value) => setState(() => _examId = value),
        ),
        const SizedBox(height: ErpSpacing.md),
        DropdownButtonFormField<String>(
          initialValue: _studentId,
          decoration: const InputDecoration(labelText: 'Student'),
          items: [
            for (final row in widget.options.students)
              DropdownMenuItem(value: row.id, child: Text(row.name)),
          ],
          onChanged: (value) => setState(() => _studentId = value),
        ),
        const SizedBox(height: ErpSpacing.lg),
        FilledButton(
          onPressed: _examId == null || _studentId == null
              ? null
              : () => Navigator.pop(
                  context,
                  _ReportCardValues(examId: _examId!, studentId: _studentId!),
                ),
          child: const Text('Generate report card'),
        ),
      ],
    ),
  );
}

class _ExamSheetFrame extends StatelessWidget {
  const _ExamSheetFrame({required this.title, required this.child});
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

class _ExamValues {
  const _ExamValues({
    required this.academicYearId,
    required this.name,
    required this.maxMarks,
    this.startsOn,
    this.endsOn,
  });
  final String academicYearId;
  final String name;
  final int maxMarks;
  final DateTime? startsOn;
  final DateTime? endsOn;
}

class _ScheduleValues {
  const _ScheduleValues({
    required this.examId,
    required this.subjectId,
    required this.classId,
    required this.startsAt,
    required this.endsAt,
    this.roomId,
  });
  final String examId;
  final String subjectId;
  final String classId;
  final DateTime startsAt;
  final DateTime endsAt;
  final String? roomId;
}

class _QuestionValues {
  const _QuestionValues({
    required this.subjectId,
    required this.questionType,
    required this.prompt,
    required this.answer,
    required this.maximumMarks,
  });
  final String subjectId;
  final String questionType;
  final String prompt;
  final String? answer;
  final int maximumMarks;
}

class _ReportCardValues {
  const _ReportCardValues({required this.examId, required this.studentId});
  final String examId;
  final String studentId;
}

String _title(String value) => value
    .replaceAll('_', ' ')
    .split(' ')
    .map(
      (word) =>
          word.isEmpty ? word : '${word[0].toUpperCase()}${word.substring(1)}',
    )
    .join(' ');
