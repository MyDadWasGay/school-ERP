import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/workspace_models.dart';
import '../../../shared/widgets/erp_states.dart';
import 'admissions_extended_workspace.dart';

class AdmissionsScreen extends ConsumerStatefulWidget {
  const AdmissionsScreen({super.key});

  @override
  ConsumerState<AdmissionsScreen> createState() => _AdmissionsScreenState();
}

class _AdmissionsScreenState extends ConsumerState<AdmissionsScreen> {
  final _busy = <String>{};

  Future<void> _refresh() async {
    ref.invalidate(admissionApprovalsProvider);
    ref.invalidate(admissionOptionsProvider);
    ref.invalidate(admissionSeatMatrixProvider);
    ref.invalidate(admissionApplicationsProvider);
    ref.invalidate(admissionEnquiriesProvider(''));
    await Future.wait([
      ref.read(admissionApprovalsProvider.future),
      ref.read(admissionApplicationsProvider.future),
      ref.read(admissionEnquiriesProvider('').future),
    ]);
  }

  Future<void> _createEnquiry() async {
    final campusId = ref.read(sessionProvider).valueOrNull?.campus?.id;
    if (campusId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Select an active campus before creating an enquiry.'),
        ),
      );
      return;
    }
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _EnquiryForm(campusId: campusId),
    );
    if (created == true) await _refresh();
  }

  Future<void> _manageEnquiry(AdmissionEnquiry row) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => AdmissionEnquiryActionsSheet(row: row),
    );
    if (changed == true) await _refresh();
  }

  Future<void> _manageApplication(AdmissionApplication row) async {
    final campusId =
        row.campusId ?? ref.read(sessionProvider).valueOrNull?.campus?.id;
    if (campusId == null) return;
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) =>
          AdmissionApplicationActionsSheet(row: row, campusId: campusId),
    );
    if (changed == true) await _refresh();
  }

  Future<String?> _reasonDialog({required bool rejection}) async {
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(rejection ? 'Reject application' : 'Review application'),
        content: TextField(
          controller: controller,
          autofocus: true,
          minLines: rejection ? 2 : 1,
          maxLines: 4,
          maxLength: 500,
          decoration: InputDecoration(
            labelText: rejection ? 'Reason' : 'Note (optional)',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final value = controller.text.trim();
              if (rejection && value.isEmpty) return;
              Navigator.pop(context, value);
            },
            child: Text(rejection ? 'Reject' : 'Continue'),
          ),
        ],
      ),
    );
    controller.dispose();
    return result;
  }

  Future<String?> _rollNumberDialog() async {
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Approve admission'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.text,
          maxLength: 30,
          decoration: const InputDecoration(
            labelText: 'Roll number (optional)',
            prefixIcon: Icon(Icons.tag_outlined),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Approve'),
          ),
        ],
      ),
    );
    controller.dispose();
    return result;
  }

  Future<void> _approve(AdmissionApproval row) async {
    final rollNumber = await _rollNumberDialog();
    if (rollNumber == null || !mounted || _busy.contains(row.id)) return;
    setState(() => _busy.add(row.id));
    try {
      await ref
          .read(apiClientProvider)
          .approveAdmission(row.id, rollNumber: rollNumber);
      await _refresh();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Admission approved.')));
      }
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    } finally {
      if (mounted) setState(() => _busy.remove(row.id));
    }
  }

  Future<void> _review(AdmissionApproval row, String decision) async {
    final reason = await _reasonDialog(rejection: decision == 'rejected');
    if (reason == null || !mounted || _busy.contains(row.id)) return;
    setState(() => _busy.add(row.id));
    try {
      await ref
          .read(apiClientProvider)
          .reviewAdmission(row.id, decision, reason: reason);
      await _refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Application marked $decision.')),
        );
      }
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    } finally {
      if (mounted) setState(() => _busy.remove(row.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final canApprove = user?.can('admissions:approve') == true;
    final canUpdate = user?.can('admissions:update') == true;
    final canReject = user?.can('admissions:reject') == true;
    final canCreate = user?.can('admissions:create') == true;
    return DefaultTabController(
      length: 4,
      child: Column(
        children: [
          const TabBar(
            tabs: [
              Tab(text: 'Approvals'),
              Tab(text: 'Applications'),
              Tab(text: 'Enquiries'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _ApprovalQueue(
                  busy: _busy,
                  canApprove: canApprove,
                  canUpdate: canUpdate,
                  canReject: canReject,
                  onApprove: _approve,
                  onReview: _review,
                  onRefresh: _refresh,
                ),
                _ApplicationsList(
                  onRefresh: _refresh,
                  canManage: canUpdate,
                  onManage: _manageApplication,
                ),
                _EnquiriesList(
                  canCreate: canCreate,
                  canManage: canUpdate,
                  onCreate: _createEnquiry,
                  onManage: _manageEnquiry,
                  onRefresh: _refresh,
                ),
                AdmissionOperationsTab(onRefresh: _refresh),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ApprovalQueue extends ConsumerWidget {
  const _ApprovalQueue({
    required this.busy,
    required this.canApprove,
    required this.canUpdate,
    required this.canReject,
    required this.onApprove,
    required this.onReview,
    required this.onRefresh,
  });

  final Set<String> busy;
  final bool canApprove;
  final bool canUpdate;
  final bool canReject;
  final ValueChanged<AdmissionApproval> onApprove;
  final void Function(AdmissionApproval, String) onReview;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(admissionApprovalsProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(admissionApprovalsProvider),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.task_alt_outlined,
            title: 'No pending admissions',
            message: 'Applications needing a decision will appear here.',
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
              final isBusy = busy.contains(row.id);
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
                      const SizedBox(height: ErpSpacing.xs),
                      Text(row.applicationNumber),
                      if (canApprove || canUpdate || canReject) ...[
                        const SizedBox(height: ErpSpacing.md),
                        Wrap(
                          spacing: ErpSpacing.sm,
                          runSpacing: ErpSpacing.sm,
                          children: [
                            if (canReject)
                              OutlinedButton.icon(
                                onPressed: isBusy
                                    ? null
                                    : () => onReview(row, 'rejected'),
                                icon: const Icon(Icons.close),
                                label: const Text('Reject'),
                              ),
                            if (canUpdate)
                              OutlinedButton.icon(
                                onPressed: isBusy
                                    ? null
                                    : () => onReview(row, 'verified'),
                                icon: const Icon(Icons.verified_outlined),
                                label: const Text('Verify'),
                              ),
                            if (canApprove)
                              FilledButton.icon(
                                onPressed: isBusy ? null : () => onApprove(row),
                                icon: isBusy
                                    ? const SizedBox.square(
                                        dimension: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Icon(Icons.check),
                                label: const Text('Approve'),
                              ),
                          ],
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
}

class _ApplicationsList extends ConsumerWidget {
  const _ApplicationsList({
    required this.onRefresh,
    required this.canManage,
    required this.onManage,
  });
  final Future<void> Function() onRefresh;
  final bool canManage;
  final Future<void> Function(AdmissionApplication row) onManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(admissionApplicationsProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(admissionApplicationsProvider),
      ),
      data: (page) {
        if (page.rows.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.folder_open_outlined,
            title: 'No applications',
            message: 'New applications in your campus scope will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: page.rows.length,
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              final row = page.rows[index];
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(
                    child: Icon(Icons.person_add_alt_outlined),
                  ),
                  title: Text(row.name),
                  subtitle: Text(row.applicationNumber),
                  trailing: canManage
                      ? TextButton(
                          onPressed: () => onManage(row),
                          child: Text(
                            row.openAssessment == null ? 'Assess' : 'Open',
                          ),
                        )
                      : ErpStatusChip(row.status),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _EnquiriesList extends ConsumerWidget {
  const _EnquiriesList({
    required this.canCreate,
    required this.canManage,
    required this.onCreate,
    required this.onManage,
    required this.onRefresh,
  });
  final bool canCreate;
  final bool canManage;
  final VoidCallback onCreate;
  final Future<void> Function(AdmissionEnquiry row) onManage;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(admissionEnquiriesProvider(''));
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(admissionEnquiriesProvider('')),
      ),
      data: (page) {
        if (page.rows.isEmpty && !canCreate) {
          return const ErpEmptyState(
            icon: Icons.phone_in_talk_outlined,
            title: 'No enquiries',
            message:
                'Admission enquiries from the front desk will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: page.rows.length + (canCreate ? 1 : 0),
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              if (canCreate && index == 0) {
                return FilledButton.icon(
                  onPressed: onCreate,
                  icon: const Icon(Icons.add_call),
                  label: const Text('Record enquiry'),
                );
              }
              final row = page.rows[canCreate ? index - 1 : index];
              final contact = [
                if (row.guardianName?.isNotEmpty == true) row.guardianName!,
                if (row.guardianPhone?.isNotEmpty == true) row.guardianPhone!,
                if (row.guardianEmail?.isNotEmpty == true) row.guardianEmail!,
              ].join(' · ');
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(
                    child: Icon(Icons.phone_in_talk_outlined),
                  ),
                  title: Text(row.name),
                  subtitle: Text(
                    [row.detail, if (contact.isNotEmpty) contact].join('\n'),
                  ),
                  isThreeLine: contact.isNotEmpty,
                  trailing: canManage
                      ? TextButton(
                          onPressed: () => onManage(row),
                          child: const Text('Manage'),
                        )
                      : ErpStatusChip(row.status),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _EnquiryForm extends ConsumerStatefulWidget {
  const _EnquiryForm({required this.campusId});
  final String campusId;

  @override
  ConsumerState<_EnquiryForm> createState() => _EnquiryFormState();
}

class _EnquiryFormState extends ConsumerState<_EnquiryForm> {
  final _formKey = GlobalKey<FormState>();
  final _applicant = TextEditingController();
  final _guardian = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _source = TextEditingController(text: 'Front desk');
  final _notes = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _applicant.dispose();
    _guardian.dispose();
    _email.dispose();
    _phone.dispose();
    _source.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(apiClientProvider)
          .createAdmissionEnquiry(
            campusId: widget.campusId,
            applicantName: _applicant.text,
            guardianName: _guardian.text,
            guardianEmail: _email.text,
            guardianPhone: _phone.text,
            source: _source.text,
            notes: _notes.text,
          );
      if (mounted) Navigator.pop(context, true);
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
  Widget build(BuildContext context) => Padding(
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
              'Record admission enquiry',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: ErpSpacing.lg),
            TextFormField(
              controller: _applicant,
              enabled: !_saving,
              decoration: const InputDecoration(labelText: 'Applicant name'),
              validator: _enquiryRequired,
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _guardian,
              enabled: !_saving,
              decoration: const InputDecoration(labelText: 'Guardian name'),
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _phone,
              enabled: !_saving,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Guardian phone'),
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _email,
              enabled: !_saving,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Guardian email'),
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _source,
              enabled: !_saving,
              decoration: const InputDecoration(labelText: 'Source'),
              validator: _enquiryRequired,
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _notes,
              enabled: !_saving,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Notes (optional)'),
            ),
            const SizedBox(height: ErpSpacing.lg),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? 'Saving…' : 'Save enquiry'),
            ),
          ],
        ),
      ),
    ),
  );
}

String? _enquiryRequired(String? value) =>
    value == null || value.trim().isEmpty ? 'Required' : null;
