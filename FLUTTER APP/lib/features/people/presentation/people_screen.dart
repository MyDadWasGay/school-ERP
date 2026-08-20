import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

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
            inviteStudent: values['inviteStudent'] as bool?,
            inviteGuardian: values['inviteGuardian'] as bool?,
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
                          showDragHandle: true,
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
        maxHeight: MediaQuery.sizeOf(context).height * .92,
        maxWidth: 720,
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
          final currentEnrollment = _currentEnrollment(profile.enrollments);
          final recentEvents = profile.timeline.take(8).toList(growable: false);
          final moreActions = <PopupMenuEntry<String>>[
            if (canUpdate)
              const PopupMenuItem(
                value: 'guardian',
                child: Text('Add guardian'),
              ),
            if (canSensitive)
              const PopupMenuItem(
                value: 'medical',
                child: Text('Medical profile'),
              ),
            if (canUpdate)
              const PopupMenuItem(
                value: 'certificate',
                child: Text('Issue certificate'),
              ),
            if (canUpdate && user?.can('students:create') == true)
              const PopupMenuItem(
                value: 'transfer',
                child: Text('Transfer class'),
              ),
          ];
          return ListView(
            padding: const EdgeInsets.fromLTRB(
              ErpSpacing.lg,
              ErpSpacing.sm,
              ErpSpacing.lg,
              ErpSpacing.xl,
            ),
            children: [
              _ProfileHeader(profile: profile, enrollment: currentEnrollment),
              if (canUpdate || canSensitive) ...[
                const SizedBox(height: ErpSpacing.md),
                Row(
                  children: [
                    if (canUpdate)
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _editStudent(context, ref, profile),
                          icon: const Icon(Icons.edit_outlined),
                          label: const Text('Edit student'),
                        ),
                      ),
                    if (moreActions.isNotEmpty) ...[
                      if (canUpdate) const SizedBox(width: ErpSpacing.sm),
                      PopupMenuButton<String>(
                        tooltip: 'More profile actions',
                        onSelected: (action) {
                          switch (action) {
                            case 'guardian':
                              _editGuardian(context, ref, profile, null);
                            case 'medical':
                              _editMedical(context, ref, profile);
                            case 'certificate':
                              _issueCertificate(context, ref, profile);
                            case 'transfer':
                              _transferEnrollment(context, ref, profile);
                          }
                        },
                        itemBuilder: (_) => moreActions,
                      ),
                    ],
                  ],
                ),
              ],
              const SizedBox(height: ErpSpacing.lg),
              _ProfileSection(
                title: 'Personal information',
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(ErpSpacing.md),
                    child: Column(
                      children: [
                        _InfoLine('Admission no.', profile.admissionNumber),
                        _InfoLine('Joined', _friendlyDate(profile.joinedOn)),
                        _InfoLine(
                          'Date of birth',
                          _friendlyDate(profile.dateOfBirth),
                        ),
                        _InfoLine('Gender', _humanize(profile.gender)),
                        _InfoLine(
                          'Blood group',
                          _displayValue(profile.bloodGroup),
                        ),
                        _InfoLine('Email', _displayValue(profile.email)),
                        _InfoLine('Phone', _displayValue(profile.phone)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: ErpSpacing.lg),
              _ProfileSection(
                title: 'Guardians and contacts',
                child: profile.guardians.isEmpty
                    ? const _ProfileEmptyCard(
                        icon: Icons.contact_phone_outlined,
                        title: 'No guardian added',
                        message:
                            'Guardian contact details will appear here when linked.',
                      )
                    : Column(
                        children: [
                          for (
                            var index = 0;
                            index < profile.guardians.length;
                            index++
                          ) ...[
                            _GuardianCard(
                              guardian: profile.guardians[index],
                              canUpdate: canUpdate,
                              onEdit: () => _editGuardian(
                                context,
                                ref,
                                profile,
                                profile.guardians[index],
                              ),
                              onUnlink: () => _unlinkGuardian(
                                context,
                                ref,
                                profile,
                                profile.guardians[index],
                              ),
                              onContact: (scheme, value) =>
                                  _openContact(context, scheme, value),
                            ),
                            if (index < profile.guardians.length - 1)
                              const SizedBox(height: ErpSpacing.sm),
                          ],
                        ],
                      ),
              ),
              const SizedBox(height: ErpSpacing.lg),
              _ProfileSection(
                title: 'Enrollment',
                child: profile.enrollments.isEmpty
                    ? const _ProfileEmptyCard(
                        icon: Icons.class_outlined,
                        title: 'Enrollment information unavailable',
                        message:
                            'Class, section and roll details will appear here when enrolled.',
                      )
                    : Column(
                        children: [
                          for (
                            var index = 0;
                            index < profile.enrollments.length;
                            index++
                          ) ...[
                            _EnrollmentCard(
                              enrollment: profile.enrollments[index],
                            ),
                            if (index < profile.enrollments.length - 1)
                              const SizedBox(height: ErpSpacing.sm),
                          ],
                        ],
                      ),
              ),
              const SizedBox(height: ErpSpacing.lg),
              _ProfileSection(
                title: 'Recent activity',
                child: profile.timeline.isEmpty
                    ? const _ProfileEmptyCard(
                        icon: Icons.history_outlined,
                        title: 'No recent activity',
                        message: 'New profile events will appear here.',
                      )
                    : Card(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            vertical: ErpSpacing.xs,
                          ),
                          child: Column(
                            children: [
                              for (
                                var index = 0;
                                index < recentEvents.length;
                                index++
                              ) ...[
                                _ActivityTile(event: recentEvents[index]),
                                if (index < recentEvents.length - 1)
                                  const Divider(height: 1, indent: 56),
                              ],
                            ],
                          ),
                        ),
                      ),
              ),
              const SizedBox(height: ErpSpacing.lg),
              if (profile.certificates.isNotEmpty) ...[
                _ProfileSection(
                  title: 'Certificates',
                  child: Card(
                    child: Column(
                      children: [
                        for (final certificate in profile.certificates)
                          ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: ErpSpacing.md,
                            ),
                            leading: const Icon(Icons.verified_outlined),
                            title: Text(_humanize(certificate.type)),
                            subtitle: Text(
                              '${certificate.number} · ${_friendlyDate(certificate.issuedAt)}',
                            ),
                            trailing: ErpStatusChip(
                              _humanize(certificate.status),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.profile, required this.enrollment});

  final StudentProfileSummary profile;
  final StudentEnrollmentSummary? enrollment;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final photoUrl = profile.photoUrl?.trim();
    return Card(
      color: scheme.surfaceContainerLow,
      child: Padding(
        padding: const EdgeInsets.all(ErpSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: scheme.primaryContainer,
                  foregroundImage: photoUrl == null || photoUrl.isEmpty
                      ? null
                      : NetworkImage(photoUrl),
                  child: Text(
                    _initials(profile.name),
                    style: TextStyle(
                      color: scheme.onPrimaryContainer,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(width: ErpSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _displayName(profile.name),
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: ErpSpacing.xs),
                      Text(
                        _studentRoleLine(enrollment),
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: ErpSpacing.md),
            Row(
              children: [
                Icon(
                  Icons.location_city_outlined,
                  size: 18,
                  color: scheme.onSurfaceVariant,
                ),
                const SizedBox(width: ErpSpacing.sm),
                Expanded(
                  child: Text(
                    _displayValue(profile.campusName, 'Campus not provided'),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
                const SizedBox(width: ErpSpacing.sm),
                ErpStatusChip(_humanize(profile.status)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileSection extends StatelessWidget {
  const _ProfileSection({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Padding(
        padding: const EdgeInsets.only(left: ErpSpacing.xs),
        child: Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
      ),
      const SizedBox(height: ErpSpacing.sm),
      child,
    ],
  );
}

class _InfoLine extends StatelessWidget {
  const _InfoLine(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: ErpSpacing.xs),
    child: LayoutBuilder(
      builder: (context, constraints) {
        final labelWidth = (constraints.maxWidth * .3)
            .clamp(96.0, 128.0)
            .toDouble();
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: labelWidth,
              child: Text(label, style: Theme.of(context).textTheme.bodySmall),
            ),
            const SizedBox(width: ErpSpacing.sm),
            Expanded(child: Text(value, softWrap: true)),
          ],
        );
      },
    ),
  );
}

class _GuardianCard extends StatelessWidget {
  const _GuardianCard({
    required this.guardian,
    required this.canUpdate,
    required this.onEdit,
    required this.onUnlink,
    required this.onContact,
  });

  final StudentGuardianSummary guardian;
  final bool canUpdate;
  final VoidCallback onEdit;
  final VoidCallback onUnlink;
  final void Function(String scheme, String value) onContact;

  @override
  Widget build(BuildContext context) {
    final phone = guardian.phone?.trim();
    final email = guardian.email?.trim();
    final flags = [
      if (guardian.primary) 'Primary guardian',
      if (guardian.emergencyContact) 'Emergency contact',
      if (guardian.billingContact) 'Billing contact',
    ];
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          ErpSpacing.md,
          ErpSpacing.sm,
          ErpSpacing.xs,
          ErpSpacing.sm,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(radius: 22, child: Text(_initials(guardian.name))),
            const SizedBox(width: ErpSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _displayName(guardian.name),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(_humanize(guardian.relationship)),
                  if (flags.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      flags.join(' / '),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                  if (phone == null && email == null)
                    Padding(
                      padding: const EdgeInsets.only(top: ErpSpacing.xs),
                      child: Text(
                        'No contact details provided',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    )
                  else ...[
                    if (phone != null)
                      _ContactRow(
                        icon: Icons.phone_outlined,
                        value: phone,
                        actionLabel: 'Call $phone',
                        onTap: () => onContact('tel', phone),
                      ),
                    if (email != null)
                      _ContactRow(
                        icon: Icons.email_outlined,
                        value: email,
                        actionLabel: 'Email $email',
                        onTap: () => onContact('mailto', email),
                      ),
                  ],
                ],
              ),
            ),
            if (canUpdate)
              PopupMenuButton<String>(
                tooltip: 'Guardian actions',
                onSelected: (action) {
                  if (action == 'edit') {
                    onEdit();
                  } else if (action == 'unlink') {
                    onUnlink();
                  }
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'edit', child: Text('Edit')),
                  PopupMenuItem(value: 'unlink', child: Text('Unlink')),
                ],
              )
            else if (flags.isNotEmpty)
              Padding(
                padding: const EdgeInsets.all(ErpSpacing.sm),
                child: Tooltip(
                  message: flags.join(' / '),
                  child: Icon(
                    guardian.emergencyContact
                        ? Icons.emergency_outlined
                        : Icons.star_outline,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ContactRow extends StatelessWidget {
  const _ContactRow({
    required this.icon,
    required this.value,
    required this.actionLabel,
    required this.onTap,
  });

  final IconData icon;
  final String value;
  final String actionLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: actionLabel,
    child: ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 48),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 18),
              const SizedBox(width: ErpSpacing.sm),
              Expanded(child: Text(value, softWrap: true)),
            ],
          ),
        ),
      ),
    ),
  );
}

class _EnrollmentCard extends StatelessWidget {
  const _EnrollmentCard({required this.enrollment});

  final StudentEnrollmentSummary enrollment;

  @override
  Widget build(BuildContext context) {
    final status = enrollment.status.trim();
    final roll = enrollment.rollNumber?.trim();
    final endsOn = enrollment.endsOn?.trim();
    final metadata = <String>[
      _academicLabel('Section', enrollment.sectionName),
      if (roll != null && roll.isNotEmpty) 'Roll No. $roll',
      'Joined ${_friendlyDate(enrollment.startsOn)}',
      if (endsOn != null && endsOn.isNotEmpty) 'Ended ${_friendlyDate(endsOn)}',
    ];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(ErpSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              runSpacing: ErpSpacing.xs,
              children: [
                Text(
                  _academicLabel('Class', enrollment.className),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (status.isNotEmpty) ErpStatusChip(_humanize(status)),
              ],
            ),
            const SizedBox(height: ErpSpacing.sm),
            for (final item in metadata) _EnrollmentMeta(item),
          ],
        ),
      ),
    );
  }
}

class _EnrollmentMeta extends StatelessWidget {
  const _EnrollmentMeta(this.value);
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: ErpSpacing.xs),
    child: Text(value, style: Theme.of(context).textTheme.bodyMedium),
  );
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({required this.event});
  final StudentTimelineEvent event;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(
      horizontal: ErpSpacing.md,
      vertical: ErpSpacing.sm,
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          Icons.history_outlined,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: ErpSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                event.title,
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 2),
              Text(
                _friendlyDateTime(event.occurredAt),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _ProfileEmptyCard extends StatelessWidget {
  const _ProfileEmptyCard({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(ErpSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(width: ErpSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(message, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
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

Future<void> _openContact(
  BuildContext context,
  String scheme,
  String value,
) async {
  final launched = await launchUrl(
    Uri(scheme: scheme, path: value),
    mode: LaunchMode.externalApplication,
  );
  if (!launched && context.mounted) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('Could not open $scheme contact.')));
  }
}

StudentEnrollmentSummary? _currentEnrollment(
  List<StudentEnrollmentSummary> enrollments,
) {
  for (final enrollment in enrollments) {
    if (enrollment.status.toLowerCase() == 'active') return enrollment;
  }
  return enrollments.isEmpty ? null : enrollments.first;
}

String _studentRoleLine(StudentEnrollmentSummary? enrollment) {
  final roll = enrollment?.rollNumber?.trim();
  return roll == null || roll.isEmpty ? 'Student' : 'Student · Roll $roll';
}

String _displayValue(String? value, [String fallback = 'Not provided']) {
  final trimmed = value?.trim();
  if (trimmed == null || trimmed.isEmpty || trimmed.toLowerCase() == 'null') {
    return fallback;
  }
  return trimmed;
}

String _displayName(String value) => _humanize(value);

String _humanize(String? value) {
  final display = _displayValue(value);
  if (display == 'Not provided') return display;
  return display
      .replaceAll('_', ' ')
      .replaceAll('-', ' ')
      .split(RegExp(r'\s+'))
      .where((word) => word.isNotEmpty)
      .map(
        (word) =>
            '${word.substring(0, 1).toUpperCase()}${word.substring(1).toLowerCase()}',
      )
      .join(' ');
}

String _initials(String value) {
  final words = value
      .trim()
      .split(RegExp(r'\s+'))
      .where((word) => word.isNotEmpty)
      .toList(growable: false);
  if (words.isEmpty) return '?';
  return words.take(2).map((word) => word.substring(0, 1).toUpperCase()).join();
}

String _academicLabel(String label, String? value) {
  final display = _humanize(value);
  if (display == 'Not provided') return '$label not provided';
  final lowerDisplay = display.toLowerCase();
  final lowerLabel = label.toLowerCase();
  if (lowerDisplay.startsWith('$lowerLabel ')) return display;
  if (label == 'Class' && lowerDisplay.startsWith('grade ')) return display;
  return '$label $display';
}

String _friendlyDate(String? value) {
  final display = _displayValue(value);
  if (display == 'Not provided') return display;
  final parsed = DateTime.tryParse(display);
  if (parsed == null) return display;
  return DateFormat('d MMM yyyy').format(parsed.toLocal());
}

String _friendlyDateTime(String? value) {
  final display = _displayValue(value);
  if (display == 'Not provided') return display;
  final parsed = DateTime.tryParse(display);
  if (parsed == null) return display;
  return DateFormat('d MMM yyyy · h:mm a').format(parsed.toLocal());
}
