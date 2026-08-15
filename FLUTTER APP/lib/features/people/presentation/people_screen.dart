import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/workspace_models.dart';
import 'student_management_forms.dart';
import '../../../shared/widgets/erp_states.dart';

class PeopleScreen extends ConsumerWidget {
  const PeopleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final canStudents = user?.can('students:read') == true;
    final canStaff = user?.can('hr:read') == true;
    final tabs = <Widget>[
      if (canStudents) const Tab(text: 'Students'),
      if (canStaff) const Tab(text: 'Staff'),
    ];
    final views = <Widget>[
      if (canStudents) const _StudentDirectory(),
      if (canStaff) const _StaffDirectory(),
    ];
    if (tabs.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.lock_outline,
        title: 'People is not available',
        message: 'Your account does not have people-directory access.',
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

class _StudentDirectory extends ConsumerStatefulWidget {
  const _StudentDirectory();

  @override
  ConsumerState<_StudentDirectory> createState() => _StudentDirectoryState();
}

class _StudentDirectoryState extends ConsumerState<_StudentDirectory> {
  final _searchController = TextEditingController();
  String _search = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _submitSearch(String value) {
    setState(() => _search = value.trim());
  }

  Future<void> _createStudent() async {
    final values = await showModalBottomSheet<Map<String, Object?>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const StudentCreateForm(),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createStudent(
            admissionNumber: values['admissionNumber']! as String,
            firstName: values['firstName']! as String,
            lastName: values['lastName']! as String,
            campusId: values['campusId']! as String,
            gender: values['gender'] as String?,
            dateOfBirth: values['dateOfBirth'] as DateTime?,
            email: values['email'] as String?,
            phone: values['phone'] as String?,
            academicYearId: values['academicYearId'] as String?,
            classId: values['classId'] as String?,
            sectionId: values['sectionId'] as String?,
            rollNumber: values['rollNumber'] as String?,
            guardianFirstName: values['guardianFirstName'] as String?,
            guardianLastName: values['guardianLastName'] as String?,
            guardianRelationship: values['guardianRelationship'] as String?,
            guardianEmail: values['guardianEmail'] as String?,
            guardianPhone: values['guardianPhone'] as String?,
          );
      ref.invalidate(studentDirectoryProvider);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Student created.')));
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
    final value = ref.watch(studentDirectoryProvider(_search));
    final canCreate =
        ref.watch(sessionProvider).valueOrNull?.can('students:create') == true;
    return Column(
      children: [
        if (canCreate)
          Padding(
            padding: const EdgeInsets.fromLTRB(
              ErpSpacing.lg,
              ErpSpacing.lg,
              ErpSpacing.lg,
              0,
            ),
            child: Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: _createStudent,
                icon: const Icon(Icons.person_add_alt_1_outlined),
                label: const Text('Add student'),
              ),
            ),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(
            ErpSpacing.lg,
            ErpSpacing.lg,
            ErpSpacing.lg,
            ErpSpacing.sm,
          ),
          child: TextField(
            controller: _searchController,
            textInputAction: TextInputAction.search,
            onSubmitted: _submitSearch,
            decoration: InputDecoration(
              labelText: 'Search students',
              hintText: 'Name or admission number',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _search.isEmpty
                  ? null
                  : IconButton(
                      tooltip: 'Clear search',
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        _submitSearch('');
                      },
                    ),
            ),
          ),
        ),
        Expanded(
          child: value.when(
            loading: () => const ErpLoadingList(),
            error: (error, stack) => ErpErrorState(
              error: error,
              onRetry: () => ref.invalidate(studentDirectoryProvider(_search)),
            ),
            data: (page) {
              if (page.rows.isEmpty) {
                return ErpEmptyState(
                  icon: Icons.school_outlined,
                  title: _search.isEmpty
                      ? 'No students found'
                      : 'No matching students',
                  message: _search.isEmpty
                      ? 'Students in your authorized scope will appear here.'
                      : 'Try a different name or admission number.',
                );
              }
              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(studentDirectoryProvider(_search));
                  await ref.read(studentDirectoryProvider(_search).future);
                },
                child: ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(
                    ErpSpacing.lg,
                    ErpSpacing.sm,
                    ErpSpacing.lg,
                    ErpSpacing.lg,
                  ),
                  itemCount: page.rows.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(height: ErpSpacing.sm),
                  itemBuilder: (context, index) {
                    final row = page.rows[index];
                    return Card(
                      child: ListTile(
                        leading: const CircleAvatar(
                          child: Icon(Icons.school_outlined),
                        ),
                        title: Text(row.name),
                        subtitle: Text(row.detail),
                        trailing: ErpStatusChip(row.status),
                        onTap: () => showModalBottomSheet<void>(
                          context: context,
                          isScrollControlled: true,
                          useSafeArea: true,
                          builder: (_) =>
                              _StudentProfileSheet(studentId: row.id),
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _StudentProfileSheet extends ConsumerWidget {
  const _StudentProfileSheet({required this.studentId});
  final String studentId;

  Future<void> _editStudent(
    BuildContext context,
    WidgetRef ref,
    StudentProfileSummary profile,
  ) async {
    final values = await showModalBottomSheet<Map<String, Object?>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => StudentEditForm(profile: profile),
    );
    if (values == null || !context.mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .updateStudent(
            id: profile.id,
            firstName: values['firstName']! as String,
            lastName: values['lastName']! as String,
            gender: values['gender'] as String?,
            email: values['email'] as String?,
            phone: values['phone'] as String?,
            status: values['status']! as String,
          );
      ref.invalidate(studentProfileProvider(profile.id));
      ref.invalidate(studentDirectoryProvider);
    } on Object catch (error) {
      if (context.mounted) _showError(context, error);
    }
  }

  Future<void> _editGuardian(
    BuildContext context,
    WidgetRef ref,
    StudentProfileSummary profile,
    StudentGuardianSummary? existing,
  ) async {
    final values = await showModalBottomSheet<Map<String, Object?>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) =>
          StudentGuardianForm(studentId: profile.id, existing: existing),
    );
    if (values == null || !context.mounted) return;
    try {
      final api = ref.read(apiClientProvider);
      final linkId = existing?.linkId ?? existing?.id;
      if (linkId == null) {
        await api.createStudentGuardian(
          studentId: profile.id,
          firstName: values['firstName']! as String,
          lastName: values['lastName']! as String,
          relationship: values['relationship']! as String,
          customRelationship: values['customRelationship'] as String?,
          email: values['email'] as String?,
          phone: values['phone'] as String?,
          isPrimary: values['isPrimary']! as bool,
          isEmergencyContact: values['isEmergencyContact']! as bool,
          isBillingContact: values['isBillingContact']! as bool,
        );
      } else {
        await api.updateStudentGuardian(
          studentId: profile.id,
          linkId: linkId,
          firstName: values['firstName']! as String,
          lastName: values['lastName']! as String,
          relationship: values['relationship']! as String,
          customRelationship: values['customRelationship'] as String?,
          email: values['email'] as String?,
          phone: values['phone'] as String?,
          isPrimary: values['isPrimary']! as bool,
          isEmergencyContact: values['isEmergencyContact']! as bool,
          isBillingContact: values['isBillingContact']! as bool,
        );
      }
      ref.invalidate(studentProfileProvider(profile.id));
    } on Object catch (error) {
      if (context.mounted) _showError(context, error);
    }
  }

  Future<void> _unlinkGuardian(
    BuildContext context,
    WidgetRef ref,
    StudentProfileSummary profile,
    StudentGuardianSummary guardian,
  ) async {
    final guardianId = guardian.linkId ?? guardian.id;
    if (guardianId == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Unlink guardian?'),
        content: Text('Remove ${guardian.name} from this student profile?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Unlink'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .unlinkStudentGuardian(studentId: profile.id, guardianId: guardianId);
      ref.invalidate(studentProfileProvider(profile.id));
    } on Object catch (error) {
      if (context.mounted) _showError(context, error);
    }
  }

  Future<void> _editMedical(
    BuildContext context,
    WidgetRef ref,
    StudentProfileSummary profile,
  ) async {
    try {
      final medical = await ref.read(studentMedicalProvider(profile.id).future);
      if (!context.mounted) return;
      final values = await showModalBottomSheet<Map<String, String>>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        builder: (_) => StudentMedicalForm(profile: medical),
      );
      if (values == null || !context.mounted) return;
      await ref
          .read(apiClientProvider)
          .saveStudentMedical(
            studentId: profile.id,
            allergies: values['allergies'],
            conditions: values['conditions'],
            medications: values['medications'],
            emergencyNotes: values['emergencyNotes'],
          );
      ref.invalidate(studentMedicalProvider(profile.id));
    } on Object catch (error) {
      if (context.mounted) _showError(context, error);
    }
  }

  Future<void> _issueCertificate(
    BuildContext context,
    WidgetRef ref,
    StudentProfileSummary profile,
  ) async {
    final values = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const StudentCertificateForm(),
    );
    if (values == null || !context.mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .issueStudentCertificate(
            studentId: profile.id,
            certificateType: values['certificateType']!,
          );
      ref.invalidate(studentProfileProvider(profile.id));
    } on Object catch (error) {
      if (context.mounted) _showError(context, error);
    }
  }

  Future<void> _transferEnrollment(
    BuildContext context,
    WidgetRef ref,
    StudentProfileSummary profile,
  ) async {
    final values = await showModalBottomSheet<Map<String, Object?>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const StudentEnrollmentForm(),
    );
    if (values == null || !context.mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .transferStudentEnrollment(
            studentId: profile.id,
            academicYearId: values['academicYearId']! as String,
            classId: values['classId']! as String,
            sectionId: values['sectionId']! as String,
            rollNumber: values['rollNumber'] as String?,
          );
      ref.invalidate(studentProfileProvider(profile.id));
    } on Object catch (error) {
      if (context.mounted) _showError(context, error);
    }
  }

  static void _showError(BuildContext context, Object error) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(studentProfileProvider(studentId));
    return ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * .9,
      ),
      child: value.when(
        loading: () => const SizedBox(height: 240, child: ErpLoadingList()),
        error: (error, stack) => ErpErrorState(
          error: error,
          onRetry: () => ref.invalidate(studentProfileProvider(studentId)),
        ),
        data: (profile) {
          final user = ref.watch(sessionProvider).valueOrNull;
          final canUpdate = user?.can('students:update') == true;
          final canSensitive = user?.can('students:view_sensitive') == true;
          return ListView(
            padding: const EdgeInsets.all(ErpSpacing.lg),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      profile.name,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                  ErpStatusChip(profile.status),
                ],
              ),
              const SizedBox(height: ErpSpacing.xs),
              Text('Admission ${profile.admissionNumber}'),
              if (canUpdate || canSensitive) ...[
                const SizedBox(height: ErpSpacing.md),
                Wrap(
                  spacing: ErpSpacing.sm,
                  runSpacing: ErpSpacing.sm,
                  children: [
                    if (canUpdate)
                      OutlinedButton.icon(
                        onPressed: () => _editStudent(context, ref, profile),
                        icon: const Icon(Icons.edit_outlined),
                        label: const Text('Edit student'),
                      ),
                    if (canUpdate)
                      OutlinedButton.icon(
                        onPressed: () =>
                            _editGuardian(context, ref, profile, null),
                        icon: const Icon(Icons.person_add_outlined),
                        label: const Text('Add guardian'),
                      ),
                    if (canSensitive)
                      OutlinedButton.icon(
                        onPressed: () => _editMedical(context, ref, profile),
                        icon: const Icon(Icons.medical_information_outlined),
                        label: const Text('Medical'),
                      ),
                    if (canUpdate)
                      OutlinedButton.icon(
                        onPressed: () =>
                            _issueCertificate(context, ref, profile),
                        icon: const Icon(Icons.verified_outlined),
                        label: const Text('Issue certificate'),
                      ),
                    if (canUpdate && user?.can('students:create') == true)
                      OutlinedButton.icon(
                        onPressed: () =>
                            _transferEnrollment(context, ref, profile),
                        icon: const Icon(Icons.swap_horiz_outlined),
                        label: const Text('Transfer class'),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: ErpSpacing.lg),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(ErpSpacing.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _SheetSectionTitle('Student details'),
                      _InfoLine('Joined', _friendlyDate(profile.joinedOn)),
                      if (profile.dateOfBirth != null)
                        _InfoLine(
                          'Date of birth',
                          _friendlyDate(profile.dateOfBirth!),
                        ),
                      if (profile.gender?.isNotEmpty == true)
                        _InfoLine('Gender', profile.gender!),
                      if (profile.bloodGroup?.isNotEmpty == true)
                        _InfoLine('Blood group', profile.bloodGroup!),
                      if (profile.email?.isNotEmpty == true)
                        _InfoLine('Email', profile.email!),
                      if (profile.phone?.isNotEmpty == true)
                        _InfoLine('Phone', profile.phone!),
                    ],
                  ),
                ),
              ),
              if (profile.guardians.isNotEmpty) ...[
                const SizedBox(height: ErpSpacing.md),
                const _SheetSectionTitle('Guardians and contacts'),
                for (final guardian in profile.guardians)
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.contact_phone_outlined),
                      title: Text(guardian.name),
                      subtitle: Text(
                        [
                          guardian.relationship,
                          if (guardian.phone?.isNotEmpty == true)
                            guardian.phone!,
                          if (guardian.email?.isNotEmpty == true)
                            guardian.email!,
                        ].join(' · '),
                      ),
                      trailing: canUpdate
                          ? PopupMenuButton<String>(
                              tooltip: 'Guardian actions',
                              onSelected: (action) {
                                if (action == 'edit') {
                                  _editGuardian(
                                    context,
                                    ref,
                                    profile,
                                    guardian,
                                  );
                                } else if (action == 'unlink') {
                                  _unlinkGuardian(
                                    context,
                                    ref,
                                    profile,
                                    guardian,
                                  );
                                }
                              },
                              itemBuilder: (_) => const [
                                PopupMenuItem(
                                  value: 'edit',
                                  child: Text('Edit'),
                                ),
                                PopupMenuItem(
                                  value: 'unlink',
                                  child: Text('Unlink'),
                                ),
                              ],
                            )
                          : guardian.emergencyContact
                          ? const Tooltip(
                              message: 'Emergency contact',
                              child: Icon(Icons.emergency_outlined),
                            )
                          : guardian.primary
                          ? const Tooltip(
                              message: 'Primary guardian',
                              child: Icon(Icons.star_outline),
                            )
                          : null,
                    ),
                  ),
              ],
              if (profile.enrollments.isNotEmpty) ...[
                const SizedBox(height: ErpSpacing.md),
                const _SheetSectionTitle('Enrollment'),
                for (final enrollment in profile.enrollments)
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.class_outlined),
                      title: Text(
                        enrollment.rollNumber == null
                            ? 'Enrollment'
                            : 'Roll ${enrollment.rollNumber}',
                      ),
                      subtitle: Text(
                        [
                          if (enrollment.classId != null)
                            'Class ${enrollment.classId}',
                          if (enrollment.sectionId != null)
                            'Section ${enrollment.sectionId}',
                          _friendlyDate(enrollment.startsOn),
                        ].join(' · '),
                      ),
                      trailing: ErpStatusChip(enrollment.status),
                    ),
                  ),
              ],
              if (profile.timeline.isNotEmpty) ...[
                const SizedBox(height: ErpSpacing.md),
                const _SheetSectionTitle('Recent activity'),
                for (final event in profile.timeline.take(8))
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.history_outlined),
                    title: Text(event.title),
                    subtitle: Text(_friendlyDate(event.occurredAt)),
                    trailing: ErpStatusChip(event.status),
                  ),
              ],
              if (profile.certificates.isNotEmpty) ...[
                const SizedBox(height: ErpSpacing.md),
                const _SheetSectionTitle('Certificates'),
                for (final certificate in profile.certificates)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.verified_outlined),
                    title: Text(certificate.type),
                    subtitle: Text(
                      '${certificate.number} · ${_friendlyDate(certificate.issuedAt)}',
                    ),
                    trailing: ErpStatusChip(certificate.status),
                  ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _SheetSectionTitle extends StatelessWidget {
  const _SheetSectionTitle(this.title);
  final String title;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: ErpSpacing.sm),
    child: Text(
      title,
      style: Theme.of(
        context,
      ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
    ),
  );
}

class _InfoLine extends StatelessWidget {
  const _InfoLine(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: ErpSpacing.sm),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 112,
          child: Text(label, style: Theme.of(context).textTheme.bodySmall),
        ),
        Expanded(child: Text(value)),
      ],
    ),
  );
}

class _StaffDirectory extends ConsumerStatefulWidget {
  const _StaffDirectory();

  @override
  ConsumerState<_StaffDirectory> createState() => _StaffDirectoryState();
}

class _StaffDirectoryState extends ConsumerState<_StaffDirectory> {
  final _searchController = TextEditingController();
  String _search = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(employeesSearchProvider(_search));
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            ErpSpacing.lg,
            ErpSpacing.lg,
            ErpSpacing.lg,
            ErpSpacing.sm,
          ),
          child: TextField(
            controller: _searchController,
            textInputAction: TextInputAction.search,
            onSubmitted: (value) => setState(() => _search = value.trim()),
            decoration: InputDecoration(
              labelText: 'Search staff',
              hintText: 'Name, employee number or email',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _search.isEmpty
                  ? null
                  : IconButton(
                      tooltip: 'Clear search',
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _search = '');
                      },
                    ),
            ),
          ),
        ),
        Expanded(
          child: value.when(
            loading: () => const ErpLoadingList(),
            error: (error, stack) => ErpErrorState(
              error: error,
              onRetry: () => ref.invalidate(employeesSearchProvider(_search)),
            ),
            data: (rows) {
              if (rows.isEmpty) {
                return const ErpEmptyState(
                  icon: Icons.badge_outlined,
                  title: 'No staff found',
                  message:
                      'Active staff in your authorized scope will appear here.',
                );
              }
              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(employeesSearchProvider(_search));
                  await ref.read(employeesSearchProvider(_search).future);
                },
                child: ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(
                    ErpSpacing.lg,
                    ErpSpacing.sm,
                    ErpSpacing.lg,
                    ErpSpacing.lg,
                  ),
                  itemCount: rows.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(height: ErpSpacing.sm),
                  itemBuilder: (context, index) {
                    final row = rows[index];
                    return Card(
                      child: ListTile(
                        leading: const CircleAvatar(
                          child: Icon(Icons.person_outline),
                        ),
                        title: Text(row.name),
                        subtitle: Text(
                          [
                            row.employeeNumber,
                            if (row.jobTitle?.isNotEmpty == true) row.jobTitle!,
                            if (row.email?.isNotEmpty == true) row.email!,
                          ].join(' · '),
                        ),
                        trailing: ErpStatusChip(row.status),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

String _friendlyDate(String value) {
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value;
  return DateFormat('d MMM yyyy').format(parsed.toLocal());
}
