import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../../shared/models/student_models.dart';
import '../../../shared/models/workspace_models.dart';

class StudentCreateForm extends ConsumerStatefulWidget {
  const StudentCreateForm({super.key});

  @override
  ConsumerState<StudentCreateForm> createState() => _StudentCreateFormState();
}

class _StudentCreateFormState extends ConsumerState<StudentCreateForm> {
  final _key = GlobalKey<FormState>();
  final _admissionNumber = TextEditingController();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _rollNumber = TextEditingController();
  final _guardianFirstName = TextEditingController();
  final _guardianLastName = TextEditingController();
  final _guardianEmail = TextEditingController();
  final _guardianPhone = TextEditingController();
  String? _campusId;
  String? _academicYearId;
  String? _classId;
  String? _sectionId;
  String? _gender;
  String _guardianRelationship = 'father';
  DateTime? _dateOfBirth;

  @override
  void dispose() {
    for (final controller in [
      _admissionNumber,
      _firstName,
      _lastName,
      _email,
      _phone,
      _rollNumber,
      _guardianFirstName,
      _guardianLastName,
      _guardianEmail,
      _guardianPhone,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(1950),
      lastDate: DateTime.now(),
      initialDate: _dateOfBirth ?? DateTime(2012),
    );
    if (picked != null && mounted) setState(() => _dateOfBirth = picked);
  }

  @override
  Widget build(BuildContext context) {
    final optionsState = ref.watch(studentFormOptionsProvider);
    if (optionsState.isLoading) {
      return const _FormFrame(
        title: 'Add student',
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (optionsState.hasError) {
      return _FormFrame(
        title: 'Add student',
        child: Text('Could not load student form options. Try again later.'),
      );
    }
    final options = optionsState.valueOrNull;
    if (options == null) {
      return const _FormFrame(
        title: 'Add student',
        child: Text('Student form options are not available for this account.'),
      );
    }
    _campusId ??= options.campuses.isEmpty ? null : options.campuses.first.id;
    final classes = options.classes
        .where(
          (row) =>
              _campusId == null ||
              row.campusId == null ||
              row.campusId == _campusId,
        )
        .toList(growable: false);
    final years = options.academicYears
        .where(
          (row) =>
              _campusId == null ||
              row.campusId == null ||
              row.campusId == _campusId,
        )
        .toList(growable: false);
    final sections = options.sections
        .where(
          (row) =>
              _classId == null ||
              row.classId == null ||
              row.classId == _classId,
        )
        .toList(growable: false);
    return _FormFrame(
      title: 'Add student',
      child: Form(
        key: _key,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _text(_admissionNumber, 'Admission number', required: true),
            const SizedBox(height: ErpSpacing.md),
            _text(_firstName, 'First name', required: true),
            const SizedBox(height: ErpSpacing.md),
            _text(_lastName, 'Last name', required: true),
            const SizedBox(height: ErpSpacing.md),
            _select<String>(
              label: 'Campus',
              value: _campusId,
              items: options.campuses.map(_option).toList(),
              onChanged: (value) => setState(() {
                _campusId = value;
                _academicYearId = null;
                _classId = null;
                _sectionId = null;
              }),
              required: true,
            ),
            const SizedBox(height: ErpSpacing.md),
            _select<String?>(
              label: 'Gender',
              value: _gender,
              items: const [
                (null, 'Not specified'),
                ('female', 'Female'),
                ('male', 'Male'),
                ('non_binary', 'Non-binary'),
                ('prefer_not_to_say', 'Prefer not to say'),
              ],
              onChanged: (value) => setState(() => _gender = value),
            ),
            const SizedBox(height: ErpSpacing.md),
            OutlinedButton.icon(
              onPressed: _pickDate,
              icon: const Icon(Icons.event_outlined),
              label: Text(
                _dateOfBirth == null
                    ? 'Date of birth (optional)'
                    : 'Born ${_dateOfBirth!.day}/${_dateOfBirth!.month}/${_dateOfBirth!.year}',
              ),
            ),
            const SizedBox(height: ErpSpacing.md),
            _text(
              _email,
              'Email (optional)',
              keyboard: TextInputType.emailAddress,
            ),
            const SizedBox(height: ErpSpacing.md),
            _text(_phone, 'Phone (optional)', keyboard: TextInputType.phone),
            const SizedBox(height: ErpSpacing.lg),
            Text(
              'Initial enrollment (optional)',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: ErpSpacing.sm),
            _select<String?>(
              label: 'Academic year',
              value: _academicYearId,
              items: [(null, 'No enrollment yet'), ...years.map(_option)],
              onChanged: (value) => setState(() => _academicYearId = value),
            ),
            const SizedBox(height: ErpSpacing.md),
            _select<String?>(
              label: 'Class',
              value: _classId,
              items: [(null, 'No class yet'), ...classes.map(_option)],
              onChanged: (value) => setState(() {
                _classId = value;
                _sectionId = null;
              }),
            ),
            const SizedBox(height: ErpSpacing.md),
            _select<String?>(
              label: 'Section',
              value: _sectionId,
              items: [(null, 'No section yet'), ...sections.map(_option)],
              onChanged: (value) => setState(() => _sectionId = value),
            ),
            const SizedBox(height: ErpSpacing.md),
            _text(_rollNumber, 'Roll number (optional)'),
            const SizedBox(height: ErpSpacing.lg),
            Text(
              'Guardian (optional)',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: ErpSpacing.sm),
            _text(_guardianFirstName, 'Guardian first name'),
            const SizedBox(height: ErpSpacing.md),
            _text(_guardianLastName, 'Guardian last name'),
            const SizedBox(height: ErpSpacing.md),
            _select<String>(
              label: 'Relationship',
              value: _guardianRelationship,
              items: const [
                ('father', 'Father'),
                ('mother', 'Mother'),
                ('legal_guardian', 'Legal guardian'),
              ],
              onChanged: (value) =>
                  setState(() => _guardianRelationship = value ?? 'father'),
            ),
            const SizedBox(height: ErpSpacing.md),
            _text(_guardianEmail, 'Guardian email'),
            const SizedBox(height: ErpSpacing.md),
            _text(
              _guardianPhone,
              'Guardian phone',
              keyboard: TextInputType.phone,
            ),
            const SizedBox(height: ErpSpacing.lg),
            FilledButton(
              onPressed: () {
                if (!_key.currentState!.validate() || _campusId == null) return;
                final hasGuardian =
                    _guardianFirstName.text.trim().isNotEmpty ||
                    _guardianLastName.text.trim().isNotEmpty;
                if (hasGuardian &&
                    (_guardianFirstName.text.trim().isEmpty ||
                        _guardianLastName.text.trim().isEmpty)) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Enter both guardian names or leave the guardian blank.',
                      ),
                    ),
                  );
                  return;
                }
                final hasEnrollment =
                    _academicYearId != null ||
                    _classId != null ||
                    _sectionId != null;
                if (hasEnrollment &&
                    (_academicYearId == null ||
                        _classId == null ||
                        _sectionId == null)) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Select academic year, class and section together.',
                      ),
                    ),
                  );
                  return;
                }
                Navigator.pop(context, {
                  'admissionNumber': _admissionNumber.text.trim(),
                  'firstName': _firstName.text.trim(),
                  'lastName': _lastName.text.trim(),
                  'campusId': _campusId,
                  'gender': _gender,
                  'dateOfBirth': _dateOfBirth,
                  'email': _email.text.trim(),
                  'phone': _phone.text.trim(),
                  'academicYearId': _academicYearId,
                  'classId': _classId,
                  'sectionId': _sectionId,
                  'rollNumber': _rollNumber.text.trim(),
                  'guardianFirstName': hasGuardian
                      ? _guardianFirstName.text.trim()
                      : null,
                  'guardianLastName': hasGuardian
                      ? _guardianLastName.text.trim()
                      : null,
                  'guardianRelationship': hasGuardian
                      ? _guardianRelationship
                      : null,
                  'guardianEmail': hasGuardian
                      ? _guardianEmail.text.trim()
                      : null,
                  'guardianPhone': hasGuardian
                      ? _guardianPhone.text.trim()
                      : null,
                });
              },
              child: const Text('Create student'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _text(
    TextEditingController controller,
    String label, {
    bool required = false,
    TextInputType? keyboard,
  }) => TextFormField(
    controller: controller,
    keyboardType: keyboard,
    decoration: InputDecoration(labelText: label),
    validator: required
        ? (value) => value == null || value.trim().isEmpty ? 'Required' : null
        : null,
  );
}

class StudentEditForm extends StatefulWidget {
  const StudentEditForm({required this.profile, super.key});
  final StudentProfileSummary profile;

  @override
  State<StudentEditForm> createState() => _StudentEditFormState();
}

class _StudentEditFormState extends State<StudentEditForm> {
  final _key = GlobalKey<FormState>();
  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  late final TextEditingController _email;
  late final TextEditingController _phone;
  String? _gender;
  late String _status;

  @override
  void initState() {
    super.initState();
    final parts = widget.profile.name.trim().split(RegExp(r'\s+'));
    _firstName = TextEditingController(text: parts.first);
    _lastName = TextEditingController(
      text: parts.length > 1 ? parts.sublist(1).join(' ') : '-',
    );
    _email = TextEditingController(text: widget.profile.email ?? '');
    _phone = TextEditingController(text: widget.profile.phone ?? '');
    _gender = widget.profile.gender;
    _status = widget.profile.status;
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    _phone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _FormFrame(
    title: 'Edit student',
    child: Form(
      key: _key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _field(_firstName, 'First name'),
          const SizedBox(height: ErpSpacing.md),
          _field(_lastName, 'Last name'),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String?>(
            initialValue: _gender,
            decoration: const InputDecoration(labelText: 'Gender'),
            items: const [
              DropdownMenuItem<String?>(
                value: null,
                child: Text('Not specified'),
              ),
              DropdownMenuItem<String?>(value: 'female', child: Text('Female')),
              DropdownMenuItem<String?>(value: 'male', child: Text('Male')),
              DropdownMenuItem<String?>(
                value: 'non_binary',
                child: Text('Non-binary'),
              ),
              DropdownMenuItem<String?>(
                value: 'prefer_not_to_say',
                child: Text('Prefer not to say'),
              ),
            ],
            onChanged: (value) => setState(() => _gender = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          _field(_email, 'Email'),
          const SizedBox(height: ErpSpacing.md),
          _field(_phone, 'Phone', keyboard: TextInputType.phone),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _status,
            decoration: const InputDecoration(labelText: 'Status'),
            items: const [
              DropdownMenuItem(value: 'active', child: Text('Active')),
              DropdownMenuItem(value: 'inactive', child: Text('Inactive')),
              DropdownMenuItem(value: 'withdrawn', child: Text('Withdrawn')),
              DropdownMenuItem(value: 'graduated', child: Text('Graduated')),
            ],
            onChanged: (value) => setState(() => _status = value ?? 'active'),
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: () {
              if (!_key.currentState!.validate()) return;
              Navigator.pop(context, {
                'firstName': _firstName.text.trim(),
                'lastName': _lastName.text.trim(),
                'gender': _gender,
                'email': _email.text.trim(),
                'phone': _phone.text.trim(),
                'status': _status,
              });
            },
            child: const Text('Save changes'),
          ),
        ],
      ),
    ),
  );

  Widget _field(
    TextEditingController controller,
    String label, {
    TextInputType? keyboard,
  }) => TextFormField(
    controller: controller,
    keyboardType: keyboard,
    decoration: InputDecoration(labelText: label),
    validator: (value) =>
        value == null || value.trim().isEmpty ? 'Required' : null,
  );
}

class StudentGuardianForm extends StatefulWidget {
  const StudentGuardianForm({
    required this.studentId,
    this.existing,
    super.key,
  });
  final String studentId;
  final StudentGuardianSummary? existing;

  @override
  State<StudentGuardianForm> createState() => _StudentGuardianFormState();
}

class _StudentGuardianFormState extends State<StudentGuardianForm> {
  final _key = GlobalKey<FormState>();
  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  late final TextEditingController _email;
  late final TextEditingController _phone;
  late final TextEditingController _customRelationship;
  String _relationship = 'father';
  bool _primary = false;
  bool _emergency = false;
  bool _billing = false;

  @override
  void initState() {
    super.initState();
    final parts =
        widget.existing?.name.trim().split(RegExp(r'\s+')) ?? const [];
    _firstName = TextEditingController(text: parts.isEmpty ? '' : parts.first);
    _lastName = TextEditingController(
      text: parts.length > 1 ? parts.sublist(1).join(' ') : '',
    );
    _email = TextEditingController(text: widget.existing?.email ?? '');
    _phone = TextEditingController(text: widget.existing?.phone ?? '');
    _customRelationship = TextEditingController(
      text: widget.existing?.customRelationship ?? '',
    );
    _relationship = _normalizeRelationship(
      widget.existing?.relationshipCode ?? widget.existing?.relationship,
    );
    _primary = widget.existing?.primary ?? false;
    _emergency = widget.existing?.emergencyContact ?? false;
    _billing = widget.existing?.billingContact ?? false;
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    _phone.dispose();
    _customRelationship.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _FormFrame(
    title: widget.existing == null ? 'Add guardian' : 'Edit guardian',
    child: Form(
      key: _key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _field(_firstName, 'First name'),
          const SizedBox(height: ErpSpacing.md),
          _field(_lastName, 'Last name'),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _relationship,
            decoration: const InputDecoration(labelText: 'Relationship'),
            items: const [
              DropdownMenuItem(value: 'father', child: Text('Father')),
              DropdownMenuItem(value: 'mother', child: Text('Mother')),
              DropdownMenuItem(
                value: 'legal_guardian',
                child: Text('Legal guardian'),
              ),
              DropdownMenuItem(value: 'other', child: Text('Other')),
            ],
            onChanged: (value) =>
                setState(() => _relationship = value ?? 'father'),
          ),
          if (_relationship == 'other') ...[
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _customRelationship,
              decoration: const InputDecoration(
                labelText: 'Specify relationship',
              ),
              validator: (value) => value == null || value.trim().isEmpty
                  ? 'Specify the relationship'
                  : null,
            ),
          ],
          const SizedBox(height: ErpSpacing.md),
          _field(_email, 'Email'),
          const SizedBox(height: ErpSpacing.md),
          _field(_phone, 'Phone', keyboard: TextInputType.phone),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            title: const Text('Primary guardian'),
            value: _primary,
            onChanged: (value) => setState(() => _primary = value),
          ),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            title: const Text('Emergency contact'),
            value: _emergency,
            onChanged: (value) => setState(() => _emergency = value),
          ),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            title: const Text('Billing contact'),
            value: _billing,
            onChanged: (value) => setState(() => _billing = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          FilledButton(
            onPressed: () {
              if (!_key.currentState!.validate()) return;
              Navigator.pop(context, {
                'firstName': _firstName.text.trim(),
                'lastName': _lastName.text.trim(),
                'relationship': _relationship,
                'customRelationship': _customRelationship.text.trim(),
                'email': _email.text.trim(),
                'phone': _phone.text.trim(),
                'isPrimary': _primary,
                'isEmergencyContact': _emergency,
                'isBillingContact': _billing,
              });
            },
            child: Text(
              widget.existing == null ? 'Add guardian' : 'Save guardian',
            ),
          ),
        ],
      ),
    ),
  );

  Widget _field(
    TextEditingController controller,
    String label, {
    TextInputType? keyboard,
  }) => TextFormField(
    controller: controller,
    keyboardType: keyboard,
    decoration: InputDecoration(labelText: label),
    validator: (value) =>
        value == null || value.trim().isEmpty ? 'Required' : null,
  );

  static String _normalizeRelationship(String? value) => switch (value) {
    'father' || 'mother' || 'legal_guardian' || 'other' => value!,
    _ => 'other',
  };
}

class StudentMedicalForm extends StatefulWidget {
  const StudentMedicalForm({required this.profile, super.key});
  final StudentMedicalProfile? profile;

  @override
  State<StudentMedicalForm> createState() => _StudentMedicalFormState();
}

class _StudentMedicalFormState extends State<StudentMedicalForm> {
  final _allergies = TextEditingController();
  final _conditions = TextEditingController();
  final _medications = TextEditingController();
  final _emergencyNotes = TextEditingController();

  @override
  void initState() {
    super.initState();
    _allergies.text = widget.profile?.allergies ?? '';
    _conditions.text = widget.profile?.conditions ?? '';
    _medications.text = widget.profile?.medications ?? '';
    _emergencyNotes.text = widget.profile?.emergencyNotes ?? '';
  }

  @override
  void dispose() {
    _allergies.dispose();
    _conditions.dispose();
    _medications.dispose();
    _emergencyNotes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _FormFrame(
    title: 'Medical profile',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'This information is sensitive and should only be edited when authorized.',
        ),
        const SizedBox(height: ErpSpacing.md),
        _field(_allergies, 'Allergies'),
        const SizedBox(height: ErpSpacing.md),
        _field(_conditions, 'Conditions'),
        const SizedBox(height: ErpSpacing.md),
        _field(_medications, 'Medications'),
        const SizedBox(height: ErpSpacing.md),
        _field(_emergencyNotes, 'Emergency notes'),
        const SizedBox(height: ErpSpacing.lg),
        FilledButton(
          onPressed: () => Navigator.pop(context, {
            'allergies': _allergies.text.trim(),
            'conditions': _conditions.text.trim(),
            'medications': _medications.text.trim(),
            'emergencyNotes': _emergencyNotes.text.trim(),
          }),
          child: const Text('Save medical profile'),
        ),
      ],
    ),
  );

  Widget _field(TextEditingController controller, String label) => TextField(
    controller: controller,
    minLines: 2,
    maxLines: 5,
    decoration: InputDecoration(labelText: label),
  );
}

class StudentCertificateForm extends StatefulWidget {
  const StudentCertificateForm({super.key});
  @override
  State<StudentCertificateForm> createState() => _StudentCertificateFormState();
}

class StudentEnrollmentForm extends ConsumerStatefulWidget {
  const StudentEnrollmentForm({super.key});

  @override
  ConsumerState<StudentEnrollmentForm> createState() =>
      _StudentEnrollmentFormState();
}

class _StudentEnrollmentFormState extends ConsumerState<StudentEnrollmentForm> {
  final _key = GlobalKey<FormState>();
  final _rollNumber = TextEditingController();
  String? _academicYearId;
  String? _classId;
  String? _sectionId;

  @override
  void dispose() {
    _rollNumber.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(studentFormOptionsProvider);
    if (state.isLoading) {
      return const _FormFrame(
        title: 'Transfer enrollment',
        child: Center(child: CircularProgressIndicator()),
      );
    }
    final options = state.valueOrNull;
    if (options == null) {
      return const _FormFrame(
        title: 'Transfer enrollment',
        child: Text('Enrollment options are not available for this account.'),
      );
    }
    final classes = options.classes.toList(growable: false);
    final sections = options.sections
        .where(
          (row) =>
              _classId == null ||
              row.classId == null ||
              row.classId == _classId,
        )
        .toList(growable: false);
    return _FormFrame(
      title: 'Transfer enrollment',
      child: Form(
        key: _key,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _dropdown(
              label: 'Academic year',
              value: _academicYearId,
              items: options.academicYears.map(_option).toList(),
              onChanged: (value) => setState(() => _academicYearId = value),
            ),
            const SizedBox(height: ErpSpacing.md),
            _dropdown(
              label: 'Class',
              value: _classId,
              items: classes.map(_option).toList(),
              onChanged: (value) => setState(() {
                _classId = value;
                _sectionId = null;
              }),
            ),
            const SizedBox(height: ErpSpacing.md),
            _dropdown(
              label: 'Section',
              value: _sectionId,
              items: sections.map(_option).toList(),
              onChanged: (value) => setState(() => _sectionId = value),
            ),
            const SizedBox(height: ErpSpacing.md),
            TextField(
              controller: _rollNumber,
              decoration: const InputDecoration(
                labelText: 'Roll number (optional)',
              ),
            ),
            const SizedBox(height: ErpSpacing.lg),
            FilledButton(
              onPressed: () {
                if (!_key.currentState!.validate()) return;
                Navigator.pop(context, {
                  'academicYearId': _academicYearId,
                  'classId': _classId,
                  'sectionId': _sectionId,
                  'rollNumber': _rollNumber.text.trim(),
                });
              },
              child: const Text('Transfer enrollment'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _dropdown({
    required String label,
    required String? value,
    required List<(String, String)> items,
    required ValueChanged<String?> onChanged,
  }) => DropdownButtonFormField<String>(
    initialValue: value,
    decoration: InputDecoration(labelText: label),
    items: [for (final item in items) _item(item.$1, item.$2)],
    onChanged: onChanged,
    validator: (value) => value == null ? 'Select $label' : null,
  );
}

class _StudentCertificateFormState extends State<StudentCertificateForm> {
  final _key = GlobalKey<FormState>();
  final _type = TextEditingController();

  @override
  void dispose() {
    _type.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _FormFrame(
    title: 'Issue certificate',
    child: Form(
      key: _key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _type,
            decoration: const InputDecoration(labelText: 'Certificate type'),
            validator: (value) => value == null || value.trim().length < 2
                ? 'Enter a certificate type'
                : null,
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: () {
              if (!_key.currentState!.validate()) return;
              Navigator.pop(context, {'certificateType': _type.text.trim()});
            },
            child: const Text('Issue certificate'),
          ),
        ],
      ),
    ),
  );
}

class _FormFrame extends StatelessWidget {
  const _FormFrame({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      ErpSpacing.lg,
      ErpSpacing.lg,
      ErpSpacing.lg,
      MediaQuery.viewInsetsOf(context).bottom + ErpSpacing.lg,
    ),
    child: SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: ErpSpacing.lg),
          child,
        ],
      ),
    ),
  );
}

DropdownMenuItem<T> _item<T>(T value, String label) => DropdownMenuItem<T>(
  value: value,
  child: Text(label, overflow: TextOverflow.ellipsis),
);

(String, String) _option(StudentFormOption option) => (option.id, option.name);

extension on _StudentCreateFormState {
  Widget _select<T>({
    required String label,
    required T? value,
    required List<(T, String)> items,
    required ValueChanged<T?> onChanged,
    bool required = false,
  }) => DropdownButtonFormField<T>(
    initialValue: value,
    decoration: InputDecoration(labelText: label),
    items: [for (final item in items) _item(item.$1, item.$2)],
    onChanged: onChanged,
    validator: required
        ? (value) => value == null ? 'Select $label' : null
        : null,
  );
}
