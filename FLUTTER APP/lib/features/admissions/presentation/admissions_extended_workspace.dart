import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/admission_models.dart';
import '../../../shared/models/workspace_models.dart';
import '../../../shared/widgets/erp_states.dart';

class AdmissionOperationsTab extends ConsumerStatefulWidget {
  const AdmissionOperationsTab({required this.onRefresh, super.key});

  final Future<void> Function() onRefresh;

  @override
  ConsumerState<AdmissionOperationsTab> createState() =>
      _AdmissionOperationsTabState();
}

class _AdmissionOperationsTabState
    extends ConsumerState<AdmissionOperationsTab> {
  bool _can(String permission) =>
      ref.read(sessionProvider).valueOrNull?.can(permission) == true;

  Future<void> _createApplication() async {
    final options = await ref.read(admissionOptionsProvider.future);
    if (!mounted || options == null) return;
    if (options.campuses.isEmpty ||
        options.academicYears.isEmpty ||
        options.classes.isEmpty ||
        options.sections.isEmpty) {
      _show('Campus, academic year, class and section options are required.');
      return;
    }
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => AdmissionApplicationForm(options: options),
    );
    if (created == true) {
      await widget.onRefresh();
      _show('Application created.');
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
    final options = ref.watch(admissionOptionsProvider);
    final canCreate = _can('admissions:create');
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          const TabBar(
            tabs: [
              Tab(text: 'Applications'),
              Tab(text: 'Seat matrix'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                options.when(
                  loading: () => const ErpLoadingList(),
                  error: (error, stack) =>
                      ErpErrorState(error: error, onRetry: widget.onRefresh),
                  data: (value) => ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(ErpSpacing.lg),
                    children: [
                      const Text(
                        'Admission pipeline',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: ErpSpacing.xs),
                      const Text(
                        'Create applications against the active campus structure and track them in the Applications tab.',
                      ),
                      const SizedBox(height: ErpSpacing.lg),
                      FilledButton.icon(
                        onPressed: canCreate && value != null
                            ? _createApplication
                            : null,
                        icon: const Icon(Icons.person_add_alt_outlined),
                        label: const Text('Create application'),
                      ),
                    ],
                  ),
                ),
                _AdmissionSeatMatrixTab(onRefresh: widget.onRefresh),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AdmissionSeatMatrixTab extends ConsumerWidget {
  const _AdmissionSeatMatrixTab({required this.onRefresh});

  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(admissionSeatMatrixProvider);
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
                    icon: Icons.event_seat_outlined,
                    title: 'No seat matrix rows',
                    message: 'Active classes and sections will appear here.',
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
                        child: Icon(Icons.event_seat_outlined),
                      ),
                      title: Text('${row.className} · ${row.sectionName}'),
                      subtitle: Text(
                        '${row.occupied}/${row.capacity} occupied · ${row.available} available',
                      ),
                      trailing: row.overbooked
                          ? const Chip(label: Text('Overbooked'))
                          : Text('${row.available}'),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

class AdmissionApplicationForm extends StatefulWidget {
  const AdmissionApplicationForm({required this.options, super.key});

  final AdmissionOptions options;

  @override
  State<AdmissionApplicationForm> createState() =>
      _AdmissionApplicationFormState();
}

class _AdmissionApplicationFormState extends State<AdmissionApplicationForm> {
  final _formKey = GlobalKey<FormState>();
  final _applicant = TextEditingController();
  final _guardianFirst = TextEditingController();
  final _guardianLast = TextEditingController();
  final _relationship = TextEditingController(text: 'Parent');
  final _email = TextEditingController();
  final _phone = TextEditingController();
  DateTime? _dateOfBirth;
  String? _campusId;
  String? _yearId;
  String? _classId;
  String? _sectionId;
  String? _enquiryId;
  String? _gender;

  @override
  void initState() {
    super.initState();
    _campusId = widget.options.campuses.first.id;
    _yearId = widget.options.academicYears.first.id;
    _classId = widget.options.classes.first.id;
    _setFirstSection();
  }

  @override
  void dispose() {
    _applicant.dispose();
    _guardianFirst.dispose();
    _guardianLast.dispose();
    _relationship.dispose();
    _email.dispose();
    _phone.dispose();
    super.dispose();
  }

  void _setFirstSection() {
    final sections = widget.options.sections
        .where((section) => section.classId == _classId)
        .toList();
    _sectionId = sections.isEmpty ? null : sections.first.id;
  }

  Future<void> _pickDateOfBirth() async {
    final value = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 30)),
      lastDate: DateTime.now(),
      initialDate:
          _dateOfBirth ??
          DateTime.now().subtract(const Duration(days: 365 * 8)),
    );
    if (value == null) return;
    setState(() => _dateOfBirth = DateTime(value.year, value.month, value.day));
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() ||
        _campusId == null ||
        _yearId == null ||
        _classId == null ||
        _sectionId == null) {
      return;
    }
    try {
      await _api(context).createAdmissionApplication(
        campusId: _campusId!,
        applicantName: _applicant.text,
        academicYearId: _yearId!,
        classId: _classId!,
        sectionId: _sectionId!,
        guardianFirstName: _guardianFirst.text,
        guardianLastName: _guardianLast.text,
        guardianRelationship: _relationship.text,
        dateOfBirth: _dateOfBirth == null ? null : _dateKey(_dateOfBirth!),
        gender: _gender,
        guardianEmail: _email.text,
        guardianPhone: _phone.text,
        sourceEnquiryId: _enquiryId,
      );
      if (mounted) Navigator.pop(context, true);
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
    final sections = widget.options.sections
        .where((section) => section.classId == _classId)
        .toList(growable: false);
    return _AdmissionSheetFrame(
      title: 'Create admission application',
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButtonFormField<String>(
              initialValue: _campusId,
              decoration: const InputDecoration(labelText: 'Campus'),
              items: [
                for (final row in widget.options.campuses)
                  DropdownMenuItem(value: row.id, child: Text(row.name)),
              ],
              onChanged: (value) => setState(() => _campusId = value),
            ),
            const SizedBox(height: ErpSpacing.md),
            DropdownButtonFormField<String>(
              initialValue: _yearId,
              decoration: const InputDecoration(labelText: 'Academic year'),
              items: [
                for (final row in widget.options.academicYears)
                  DropdownMenuItem(value: row.id, child: Text(row.name)),
              ],
              onChanged: (value) => setState(() => _yearId = value),
            ),
            const SizedBox(height: ErpSpacing.md),
            DropdownButtonFormField<String>(
              initialValue: _classId,
              decoration: const InputDecoration(labelText: 'Class'),
              items: [
                for (final row in widget.options.classes)
                  DropdownMenuItem(value: row.id, child: Text(row.name)),
              ],
              onChanged: (value) => setState(() {
                _classId = value;
                _setFirstSection();
              }),
            ),
            const SizedBox(height: ErpSpacing.md),
            DropdownButtonFormField<String>(
              initialValue: sections.any((row) => row.id == _sectionId)
                  ? _sectionId
                  : null,
              decoration: const InputDecoration(labelText: 'Section'),
              items: [
                for (final row in sections)
                  DropdownMenuItem(value: row.id, child: Text(row.name)),
              ],
              onChanged: (value) => setState(() => _sectionId = value),
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _applicant,
              decoration: const InputDecoration(labelText: 'Applicant name'),
              validator: _required,
            ),
            const SizedBox(height: ErpSpacing.md),
            OutlinedButton(
              onPressed: _pickDateOfBirth,
              child: Text(
                _dateOfBirth == null
                    ? 'Date of birth (optional)'
                    : 'Born ${DateFormat('d MMM yyyy').format(_dateOfBirth!)}',
              ),
            ),
            const SizedBox(height: ErpSpacing.md),
            DropdownButtonFormField<String>(
              initialValue: _gender,
              decoration: const InputDecoration(labelText: 'Gender (optional)'),
              items: const [
                DropdownMenuItem(value: 'female', child: Text('Female')),
                DropdownMenuItem(value: 'male', child: Text('Male')),
                DropdownMenuItem(
                  value: 'non_binary',
                  child: Text('Non-binary'),
                ),
                DropdownMenuItem(
                  value: 'prefer_not_to_say',
                  child: Text('Prefer not to say'),
                ),
              ],
              onChanged: (value) => setState(() => _gender = value),
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _guardianFirst,
              decoration: const InputDecoration(
                labelText: 'Guardian first name',
              ),
              validator: _required,
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _guardianLast,
              decoration: const InputDecoration(
                labelText: 'Guardian last name',
              ),
              validator: _required,
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _relationship,
              decoration: const InputDecoration(labelText: 'Relationship'),
              validator: _required,
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Guardian email (optional)',
              ),
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Guardian phone (optional)',
              ),
            ),
            if (widget.options.enquiries.isNotEmpty) ...[
              const SizedBox(height: ErpSpacing.md),
              DropdownButtonFormField<String>(
                initialValue: _enquiryId,
                decoration: const InputDecoration(
                  labelText: 'Source enquiry (optional)',
                ),
                items: [
                  const DropdownMenuItem<String>(
                    value: null,
                    child: Text('No source enquiry'),
                  ),
                  for (final row in widget.options.enquiries)
                    DropdownMenuItem(value: row.id, child: Text(row.name)),
                ],
                onChanged: (value) => setState(() => _enquiryId = value),
              ),
            ],
            const SizedBox(height: ErpSpacing.lg),
            FilledButton(
              onPressed: _save,
              child: const Text('Create application'),
            ),
          ],
        ),
      ),
    );
  }
}

class AdmissionEnquiryActionsSheet extends ConsumerStatefulWidget {
  const AdmissionEnquiryActionsSheet({required this.row, super.key});

  final AdmissionEnquiry row;

  @override
  ConsumerState<AdmissionEnquiryActionsSheet> createState() =>
      _AdmissionEnquiryActionsSheetState();
}

class _AdmissionEnquiryActionsSheetState
    extends ConsumerState<AdmissionEnquiryActionsSheet> {
  final _campaign = TextEditingController();
  final _source = TextEditingController();
  final _guardian = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _notes = TextEditingController();
  final _lostReason = TextEditingController();
  final _followUpNote = TextEditingController();
  final _outcome = TextEditingController();
  String _status = 'new';
  DateTime? _followUpAt;

  @override
  void initState() {
    super.initState();
    final row = widget.row;
    _status = row.status;
    _source.text = row.source;
    _campaign.text = row.campaign ?? '';
    _guardian.text = row.guardianName ?? '';
    _email.text = row.guardianEmail ?? '';
    _phone.text = row.guardianPhone ?? '';
    _notes.text = row.notes ?? '';
    _lostReason.text = row.lostReason ?? '';
  }

  @override
  void dispose() {
    for (final controller in [
      _campaign,
      _source,
      _guardian,
      _email,
      _phone,
      _notes,
      _lostReason,
      _followUpNote,
      _outcome,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _pickFollowUp() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDate: _followUpAt ?? DateTime.now(),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_followUpAt ?? DateTime.now()),
    );
    if (time == null) return;
    setState(
      () => _followUpAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      ),
    );
  }

  Future<void> _savePipeline() async {
    try {
      await ref
          .read(apiClientProvider)
          .updateAdmissionEnquiry(
            id: widget.row.id,
            status: _status,
            source: _source.text,
            campaign: _campaign.text,
            lostReason: _lostReason.text,
            guardianName: _guardian.text,
            guardianEmail: _email.text,
            guardianPhone: _phone.text,
            notes: _notes.text,
            nextFollowUpAt: _followUpAt,
          );
      if (mounted) Navigator.pop(context, true);
    } on Object catch (error) {
      _show(error);
    }
  }

  Future<void> _schedule() async {
    if (_followUpAt == null || _followUpNote.text.trim().length < 2) return;
    try {
      await ref
          .read(apiClientProvider)
          .scheduleAdmissionFollowUp(
            enquiryId: widget.row.id,
            dueAt: _followUpAt!,
            note: _followUpNote.text,
          );
      if (mounted) Navigator.pop(context, true);
    } on Object catch (error) {
      _show(error);
    }
  }

  Future<void> _complete() async {
    if (widget.row.openFollowUp == null || _outcome.text.trim().length < 2) {
      return;
    }
    try {
      await ref
          .read(apiClientProvider)
          .completeAdmissionFollowUp(
            id: widget.row.openFollowUp!.id,
            outcome: _outcome.text,
          );
      if (mounted) Navigator.pop(context, true);
    } on Object catch (error) {
      _show(error);
    }
  }

  void _show(Object error) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
  }

  @override
  Widget build(BuildContext context) => _AdmissionSheetFrame(
    title: 'Manage enquiry',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DropdownButtonFormField<String>(
          initialValue: _status,
          decoration: const InputDecoration(labelText: 'Pipeline status'),
          items: const [
            DropdownMenuItem(value: 'new', child: Text('New')),
            DropdownMenuItem(value: 'contacted', child: Text('Contacted')),
            DropdownMenuItem(value: 'qualified', child: Text('Qualified')),
            DropdownMenuItem(value: 'lost', child: Text('Lost')),
            DropdownMenuItem(value: 'converted', child: Text('Converted')),
          ],
          onChanged: (value) => setState(() => _status = value ?? 'new'),
        ),
        const SizedBox(height: ErpSpacing.md),
        _Input(controller: _source, label: 'Source'),
        _Input(controller: _campaign, label: 'Campaign (optional)'),
        _Input(controller: _guardian, label: 'Guardian (optional)'),
        _Input(controller: _email, label: 'Guardian email (optional)'),
        _Input(controller: _phone, label: 'Guardian phone (optional)'),
        _Input(controller: _notes, label: 'Notes (optional)', maxLines: 3),
        if (_status == 'lost')
          _Input(controller: _lostReason, label: 'Lost reason'),
        const SizedBox(height: ErpSpacing.md),
        FilledButton(
          onPressed: _savePipeline,
          child: const Text('Save pipeline'),
        ),
        const Divider(height: ErpSpacing.xl),
        Text('Follow-up', style: Theme.of(context).textTheme.titleMedium),
        OutlinedButton(
          onPressed: _pickFollowUp,
          child: Text(
            _followUpAt == null
                ? 'Choose follow-up time'
                : DateFormat('d MMM yyyy, h:mm a').format(_followUpAt!),
          ),
        ),
        _Input(controller: _followUpNote, label: 'Follow-up note'),
        OutlinedButton(
          onPressed: _schedule,
          child: const Text('Schedule follow-up'),
        ),
        if (widget.row.openFollowUp != null) ...[
          Text('Open: ${widget.row.openFollowUp!.note}'),
          _Input(controller: _outcome, label: 'Outcome'),
          OutlinedButton(
            onPressed: _complete,
            child: const Text('Complete follow-up'),
          ),
        ],
      ],
    ),
  );
}

class AdmissionApplicationActionsSheet extends ConsumerStatefulWidget {
  const AdmissionApplicationActionsSheet({
    required this.row,
    required this.campusId,
    super.key,
  });
  final AdmissionApplication row;
  final String campusId;
  @override
  ConsumerState<AdmissionApplicationActionsSheet> createState() =>
      _AdmissionApplicationActionsSheetState();
}

class _AdmissionApplicationActionsSheetState
    extends ConsumerState<AdmissionApplicationActionsSheet> {
  final _notes = TextEditingController();
  final _score = TextEditingController();
  String _type = 'interview';
  String _outcome = 'passed';
  DateTime _scheduledAt = DateTime.now().add(const Duration(days: 1));
  @override
  void dispose() {
    _notes.dispose();
    _score.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDate: _scheduledAt,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_scheduledAt),
    );
    if (time == null) return;
    setState(
      () => _scheduledAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      ),
    );
  }

  Future<void> _schedule() async {
    try {
      await ref
          .read(apiClientProvider)
          .scheduleAdmissionAssessment(
            applicationId: widget.row.id,
            campusId: widget.campusId,
            assessmentType: _type,
            scheduledAt: _scheduledAt,
            notes: _notes.text,
          );
      if (mounted) Navigator.pop(context, true);
    } on Object catch (error) {
      _show(error);
    }
  }

  Future<void> _record() async {
    if (widget.row.openAssessment == null) return;
    try {
      await ref
          .read(apiClientProvider)
          .recordAdmissionAssessment(
            id: widget.row.openAssessment!.id,
            score: int.tryParse(_score.text.trim()),
            outcome: _outcome,
            notes: _notes.text,
          );
      if (mounted) Navigator.pop(context, true);
    } on Object catch (error) {
      _show(error);
    }
  }

  void _show(Object error) {
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
    }
  }

  @override
  Widget build(BuildContext context) => _AdmissionSheetFrame(
    title: 'Application assessment',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DropdownButtonFormField<String>(
          initialValue: _type,
          decoration: const InputDecoration(labelText: 'Assessment type'),
          items: const [
            DropdownMenuItem(
              value: 'entrance_test',
              child: Text('Entrance test'),
            ),
            DropdownMenuItem(value: 'interview', child: Text('Interview')),
            DropdownMenuItem(value: 'interaction', child: Text('Interaction')),
          ],
          onChanged: (value) => setState(() => _type = value ?? 'interview'),
        ),
        const SizedBox(height: ErpSpacing.md),
        OutlinedButton(
          onPressed: _pick,
          child: Text(
            'Scheduled ${DateFormat('d MMM yyyy, h:mm a').format(_scheduledAt)}',
          ),
        ),
        _Input(controller: _notes, label: 'Notes (optional)', maxLines: 2),
        FilledButton(
          onPressed: _schedule,
          child: const Text('Schedule assessment'),
        ),
        if (widget.row.openAssessment != null) ...[
          const Divider(height: ErpSpacing.xl),
          Text('Open ${widget.row.openAssessment!.assessmentType}'),
          _Input(controller: _score, label: 'Score (optional)', number: true),
          DropdownButtonFormField<String>(
            initialValue: _outcome,
            decoration: const InputDecoration(labelText: 'Outcome'),
            items: const [
              DropdownMenuItem(value: 'passed', child: Text('Passed')),
              DropdownMenuItem(value: 'failed', child: Text('Failed')),
              DropdownMenuItem(value: 'no_show', child: Text('No show')),
              DropdownMenuItem(value: 'pending', child: Text('Pending')),
            ],
            onChanged: (value) => setState(() => _outcome = value ?? 'pending'),
          ),
          FilledButton.tonal(
            onPressed: _record,
            child: const Text('Record result'),
          ),
        ],
      ],
    ),
  );
}

class _Input extends StatelessWidget {
  const _Input({
    required this.controller,
    required this.label,
    this.maxLines = 1,
    this.number = false,
  });
  final TextEditingController controller;
  final String label;
  final int maxLines;
  final bool number;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: ErpSpacing.md),
    child: TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: number ? TextInputType.number : TextInputType.text,
      decoration: InputDecoration(labelText: label),
    ),
  );
}

class _AdmissionSheetFrame extends StatelessWidget {
  const _AdmissionSheetFrame({required this.title, required this.child});
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

String? _required(String? value) =>
    value == null || value.trim().isEmpty ? 'Required' : null;
String _dateKey(DateTime date) =>
    '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
ApiClient _api(BuildContext context) =>
    ProviderScope.containerOf(context, listen: false).read(apiClientProvider);
