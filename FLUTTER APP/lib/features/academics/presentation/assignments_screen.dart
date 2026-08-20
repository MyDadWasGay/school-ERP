import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/academic_models.dart';
import '../../../shared/models/document_models.dart';
import '../../../shared/models/identity_models.dart';
import '../../../shared/widgets/erp_states.dart';
import '../../documents/presentation/entity_documents_sheet.dart';

class AssignmentsScreen extends ConsumerStatefulWidget {
  const AssignmentsScreen({super.key, this.initialAssignmentId});

  final String? initialAssignmentId;

  @override
  ConsumerState<AssignmentsScreen> createState() => _AssignmentsScreenState();
}

class _AssignmentsScreenState extends ConsumerState<AssignmentsScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.initialAssignmentId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _openInitial());
    }
  }

  Future<void> _openInitial() async {
    final user = ref.read(sessionProvider).valueOrNull;
    final id = widget.initialAssignmentId;
    if (!mounted || user == null || id == null || id.isEmpty) return;
    await _openAssignment(id, user);
  }

  Future<void> _create(CurrentUser user) async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _AssignmentForm(user: user),
    );
    if (created == true) ref.invalidate(academicRecordsProvider('assignments'));
  }

  Future<void> _openAssignment(String id, CurrentUser user) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _AssignmentDetailSheet(assignmentId: id, user: user),
    );
    if (changed == true) {
      ref.invalidate(academicRecordsProvider('assignments'));
    }
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
                    onTap: user == null
                        ? null
                        : () => _openAssignment(row.id, user),
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

class _AssignmentDetailSheet extends ConsumerStatefulWidget {
  const _AssignmentDetailSheet({
    required this.assignmentId,
    required this.user,
  });

  final String assignmentId;
  final CurrentUser user;

  @override
  ConsumerState<_AssignmentDetailSheet> createState() =>
      _AssignmentDetailSheetState();
}

class _AssignmentDetailSheetState
    extends ConsumerState<_AssignmentDetailSheet> {
  late Future<AssignmentDetail> _future;
  final _response = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;
  bool _responseInitialised = false;
  final _attachments = <UploadableFile>[];
  double? _attachmentProgress;
  final _imagePicker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _future = ref
        .read(apiClientProvider)
        .getAssignmentDetail(widget.assignmentId);
  }

  @override
  void dispose() {
    _response.dispose();
    super.dispose();
  }

  Future<void> _pickAttachments() async {
    if (_saving) return;
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      withData: false,
      type: FileType.custom,
      allowedExtensions: const [
        'pdf',
        'doc',
        'docx',
        'jpg',
        'jpeg',
        'png',
        'webp',
      ],
    );
    if (result == null || !mounted) return;
    final selected = <UploadableFile>[];
    for (final file in result.files.take(3)) {
      final format = (file.extension ?? '').toLowerCase();
      final isImage = {'jpg', 'jpeg', 'png', 'webp'}.contains(format);
      final maxBytes = isImage ? 5_000_000 : 25_000_000;
      if (file.size <= 0 || file.size > maxBytes) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '${file.name} is too large. Images are limited to 5 MB and documents to 25 MB.',
            ),
          ),
        );
        continue;
      }
      if (file.path == null || file.path!.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${file.name} could not be accessed.')),
        );
        continue;
      }
      selected.add(
        UploadableFile(
          name: file.name,
          size: file.size,
          format: format,
          resourceType: isImage ? 'image' : 'raw',
          path: file.path,
          bytes: file.bytes,
        ),
      );
    }
    if (selected.isNotEmpty) {
      setState(() {
        _attachments
          ..clear()
          ..addAll(selected);
      });
    }
  }

  Future<void> _capturePhoto() async {
    if (_saving) return;
    try {
      final image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1800,
        maxHeight: 1800,
        imageQuality: 82,
        requestFullMetadata: false,
      );
      if (image == null || !mounted) return;
      final size = await image.length();
      if (!mounted) return;
      if (size <= 0 || size > 5_000_000) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('The photo must be 5 MB or smaller.')),
        );
        return;
      }
      setState(() {
        _attachments
          ..clear()
          ..add(
            UploadableFile(
              name: 'homework-${DateTime.now().millisecondsSinceEpoch}.jpg',
              size: size,
              format: 'jpg',
              resourceType: 'image',
              path: image.path,
            ),
          );
      });
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Camera capture failed. ${readableApiError(error)}')),
        );
      }
    }
  }

  Future<void> _chooseAttachments() async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('Camera'),
              onTap: () => Navigator.pop(context, 'camera'),
            ),
            ListTile(
              leading: const Icon(Icons.folder_open_outlined),
              title: const Text('Files'),
              onTap: () => Navigator.pop(context, 'files'),
            ),
          ],
        ),
      ),
    );
    if (!mounted) return;
    if (choice == 'camera') {
      await _capturePhoto();
    } else if (choice == 'files') {
      await _pickAttachments();
    }
  }

  Future<void> _openAttachments(String submissionId, String title) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => EntityDocumentsSheet(
        entityType: 'assignment_submission',
        entityId: submissionId,
        title: title,
      ),
    );
  }

  Future<void> _submit(AssignmentDetail detail) async {
    if (!_formKey.currentState!.validate()) return;
    final studentId =
        ref.read(selectedStudentIdProvider) ??
        (widget.user.role == 'student' ? widget.user.linkedStudentId : null);
    setState(() => _saving = true);
    AssignmentSubmissionReceipt? receipt;
    try {
      receipt = await ref
          .read(apiClientProvider)
          .submitAssignment(
            assignmentId: detail.id,
            studentId: studentId,
            response: _response.text,
          );
      for (var index = 0; index < _attachments.length; index++) {
        final file = _attachments[index];
        await ref
            .read(apiClientProvider)
            .uploadDocument(
              entityType: 'assignment_submission',
              entityId: receipt.id,
              category: 'assignment_attachment',
              file: file,
              onSendProgress: (sent, total) {
                if (!mounted) return;
                setState(() {
                  _attachmentProgress = total > 0
                      ? (index + (sent / total)) / _attachments.length
                      : null;
                });
              },
            );
      }
      if (mounted) Navigator.of(context).pop(true);
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              receipt == null
                  ? readableApiError(error)
                  : 'Submission saved, but an attachment could not be uploaded. ${readableApiError(error)}',
            ),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
          _attachmentProgress = null;
        });
      }
    }
  }

  Future<void> _grade(
    AssignmentDetail detail,
    AssignmentSubmission submission,
  ) async {
    final result = await showDialog<(int?, String?)>(
      context: context,
      builder: (context) => _GradeDialog(submission: submission),
    );
    if (result == null) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(apiClientProvider)
          .gradeAssignment(
            assignmentId: detail.id,
            submissionId: submission.id,
            score: result.$1,
            comment: result.$2,
          );
      if (mounted) {
        setState(() {
          _future = ref.read(apiClientProvider).getAssignmentDetail(detail.id);
          _saving = false;
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
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
    child: FutureBuilder<AssignmentDetail>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SizedBox(height: 260, child: ErpLoadingList());
        }
        if (snapshot.hasError) {
          return SizedBox(
            height: 260,
            child: ErpErrorState(
              error: snapshot.error!,
              onRetry: () => setState(() {
                _future = ref
                    .read(apiClientProvider)
                    .getAssignmentDetail(widget.assignmentId);
              }),
            ),
          );
        }
        final detail = snapshot.data!;
        final selectedStudentId =
            ref.watch(selectedStudentIdProvider) ??
            (widget.user.role == 'student'
                ? widget.user.linkedStudentId
                : null);
        final ownSubmission = detail.submissions
            .cast<AssignmentSubmission?>()
            .firstWhere(
              (submission) => submission?.studentId == selectedStudentId,
              orElse: () => null,
            );
        if (!_responseInitialised && ownSubmission != null) {
          _response.text = ownSubmission.response;
          _responseInitialised = true;
        }
        return SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.72,
          child: ListView(
            shrinkWrap: true,
            children: [
              Text(
                detail.title,
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: ErpSpacing.xs),
              Text(
                'Due ${DateFormat('d MMM yyyy, h:mm a').format(detail.dueAt.toLocal())}',
              ),
              if (detail.instructions?.isNotEmpty == true) ...[
                const SizedBox(height: ErpSpacing.md),
                Text(detail.instructions!),
              ],
              const SizedBox(height: ErpSpacing.lg),
              if (widget.user.role == 'student' || widget.user.role == 'parent')
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        controller: _response,
                        minLines: 5,
                        maxLines: 10,
                        enabled: !_saving,
                        decoration: const InputDecoration(
                          labelText: 'Your submission',
                          alignLabelWithHint: true,
                          prefixIcon: Icon(Icons.edit_note_outlined),
                        ),
                        validator: (value) =>
                            value == null || value.trim().isEmpty
                            ? 'Write a response before submitting.'
                            : null,
                      ),
                      if (ownSubmission?.attachments.isNotEmpty == true) ...[
                        const SizedBox(height: ErpSpacing.sm),
                        for (final attachment in ownSubmission!.attachments)
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: const Icon(Icons.attach_file_outlined),
                            title: Text(
                              attachment.originalFilename ??
                                  attachment.category,
                            ),
                            subtitle: const Text('Open submitted attachment'),
                            onTap: () => _openAttachments(
                              ownSubmission.id,
                              'Assignment attachments',
                            ),
                          ),
                      ],
                      const SizedBox(height: ErpSpacing.sm),
                      OutlinedButton.icon(
                        onPressed: _saving ? null : _chooseAttachments,
                        icon: const Icon(Icons.attach_file_outlined),
                        label: Text(
                          _attachments.isEmpty
                              ? 'Add attachments'
                              : 'Replace attachments (${_attachments.length})',
                        ),
                      ),
                      if (_attachments.isNotEmpty) ...[
                        const SizedBox(height: ErpSpacing.xs),
                        for (final attachment in _attachments)
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            dense: true,
                            leading: const Icon(
                              Icons.insert_drive_file_outlined,
                            ),
                            title: Text(attachment.name),
                            subtitle: Text(
                              '${(attachment.size / 1024).ceil()} KB',
                            ),
                          ),
                      ],
                      if (_attachmentProgress != null) ...[
                        const SizedBox(height: ErpSpacing.xs),
                        LinearProgressIndicator(value: _attachmentProgress),
                      ],
                      const SizedBox(height: ErpSpacing.md),
                      FilledButton.icon(
                        onPressed: _saving ? null : () => _submit(detail),
                        icon: _saving
                            ? const SizedBox.square(
                                dimension: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.send_outlined),
                        label: Text(
                          ownSubmission == null
                              ? 'Submit assignment'
                              : 'Update submission',
                        ),
                      ),
                      if (ownSubmission?.feedback != null) ...[
                        const SizedBox(height: ErpSpacing.lg),
                        Card(
                          child: ListTile(
                            leading: const Icon(Icons.feedback_outlined),
                            title: Text(
                              ownSubmission!.score == null
                                  ? 'Teacher feedback'
                                  : 'Score: ${ownSubmission.score}',
                            ),
                            subtitle: Text(ownSubmission.feedback!),
                          ),
                        ),
                      ],
                    ],
                  ),
                )
              else ...[
                Text(
                  'Submissions (${detail.submissions.length})',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: ErpSpacing.sm),
                if (detail.submissions.isEmpty)
                  const Text('No student submissions yet.')
                else
                  for (final submission in detail.submissions)
                    Card(
                      child: ListTile(
                        title: Text(submission.studentName),
                        subtitle: Text(
                          '${submission.response}\n${DateFormat('d MMM yyyy, h:mm a').format(submission.submittedAt.toLocal())}',
                        ),
                        isThreeLine: true,
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (submission.attachments.isNotEmpty)
                              IconButton(
                                tooltip: 'View attachments',
                                onPressed: _saving
                                    ? null
                                    : () => _openAttachments(
                                        submission.id,
                                        '${submission.studentName} attachments',
                                      ),
                                icon: const Icon(Icons.attach_file_outlined),
                              ),
                            submission.score == null
                                ? const Icon(Icons.rate_review_outlined)
                                : Text('${submission.score}'),
                          ],
                        ),
                        onTap: _saving
                            ? null
                            : () => _grade(detail, submission),
                      ),
                    ),
              ],
            ],
          ),
        );
      },
    ),
  );
}

class _GradeDialog extends StatefulWidget {
  const _GradeDialog({required this.submission});
  final AssignmentSubmission submission;

  @override
  State<_GradeDialog> createState() => _GradeDialogState();
}

class _GradeDialogState extends State<_GradeDialog> {
  late final TextEditingController _score;
  late final TextEditingController _comment;

  @override
  void initState() {
    super.initState();
    _score = TextEditingController(text: widget.submission.score?.toString());
    _comment = TextEditingController(text: widget.submission.feedback ?? '');
  }

  @override
  void dispose() {
    _score.dispose();
    _comment.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text('Review ${widget.submission.studentName}'),
    content: SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(widget.submission.response),
          const SizedBox(height: ErpSpacing.md),
          TextField(
            controller: _score,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Score (optional)'),
          ),
          const SizedBox(height: ErpSpacing.md),
          TextField(
            controller: _comment,
            minLines: 2,
            maxLines: 5,
            decoration: const InputDecoration(labelText: 'Feedback'),
          ),
        ],
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: () => Navigator.pop(context, (
          int.tryParse(_score.text.trim()),
          _comment.text.trim().isEmpty ? null : _comment.text.trim(),
        )),
        child: const Text('Save review'),
      ),
    ],
  );
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
