import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/operations_models.dart';
import '../../../shared/widgets/erp_states.dart';

class OperationsScreen extends ConsumerWidget {
  const OperationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final canSafety = user?.can('safety:read') == true;
    final canHealth = user?.can('health:read') == true;
    final tabs = <Widget>[
      if (canSafety) const Tab(text: 'Safety'),
      if (canHealth) const Tab(text: 'Health'),
    ];
    final views = <Widget>[
      if (canSafety) const _SafetyWorkspace(),
      if (canHealth) const _HealthWorkspace(),
    ];
    if (tabs.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.lock_outline,
        title: 'Operations is not available',
        message: 'Your account does not have operational access.',
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

class _SafetyWorkspace extends ConsumerStatefulWidget {
  const _SafetyWorkspace();

  @override
  ConsumerState<_SafetyWorkspace> createState() => _SafetyWorkspaceState();
}

class _SafetyWorkspaceState extends ConsumerState<_SafetyWorkspace> {
  Future<void> _refresh() async {
    ref.invalidate(safetyVisitorsProvider);
    ref.invalidate(safetyGatePassesProvider);
    ref.invalidate(safetyIncidentsProvider);
    await Future.wait([
      ref.read(safetyVisitorsProvider.future),
      ref.read(safetyGatePassesProvider.future),
      ref.read(safetyIncidentsProvider.future),
    ]);
  }

  Future<void> _openVisitorForm() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _VisitorForm(),
    );
    if (created == true) await _refresh();
  }

  Future<void> _openGatePassForm(List<SafetyVisitorRow> visitors) async {
    if (visitors.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Register a visitor before creating a gate pass.'),
        ),
      );
      return;
    }
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _GatePassForm(visitors: visitors),
    );
    if (created == true) await _refresh();
  }

  Future<void> _openIncidentForm() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _IncidentForm(),
    );
    if (created == true) await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final canCreate = user?.can('safety:create') == true;
    final canApprove = user?.can('safety:approve') == true;
    final canUpdate = user?.can('safety:update') == true;
    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          const TabBar(
            tabs: [
              Tab(text: 'Visitors'),
              Tab(text: 'Gate passes'),
              Tab(text: 'Incidents'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _VisitorsTab(
                  canCreate: canCreate,
                  onCreate: _openVisitorForm,
                  onRefresh: _refresh,
                ),
                _GatePassesTab(
                  canCreate: canCreate,
                  canApprove: canApprove,
                  onCreate: () async {
                    final visitors = await ref.read(
                      safetyVisitorsProvider.future,
                    );
                    if (mounted) await _openGatePassForm(visitors);
                  },
                  onRefresh: _refresh,
                ),
                _IncidentsTab(
                  canCreate: canCreate,
                  canUpdate: canUpdate,
                  onCreate: _openIncidentForm,
                  onRefresh: _refresh,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _VisitorsTab extends ConsumerWidget {
  const _VisitorsTab({
    required this.canCreate,
    required this.onCreate,
    required this.onRefresh,
  });
  final bool canCreate;
  final VoidCallback onCreate;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(safetyVisitorsProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(safetyVisitorsProvider),
      ),
      data: (rows) {
        if (rows.isEmpty && !canCreate) {
          return const ErpEmptyState(
            icon: Icons.badge_outlined,
            title: 'No visitor records',
            message: 'Expected and recent visitors will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: rows.length + (canCreate ? 1 : 0),
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              if (canCreate && index == 0) {
                return FilledButton.icon(
                  onPressed: onCreate,
                  icon: const Icon(Icons.person_add_alt_1_outlined),
                  label: const Text('Register visitor'),
                );
              }
              final row = rows[canCreate ? index - 1 : index];
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(
                    child: Icon(Icons.person_pin_circle_outlined),
                  ),
                  title: Text(row.name),
                  subtitle: Text(
                    [
                      if (row.purpose?.isNotEmpty == true) row.purpose!,
                      if (row.hostName?.isNotEmpty == true)
                        'Host: ${row.hostName}',
                      DateFormat(
                        'd MMM yyyy, h:mm a',
                      ).format(row.effectiveAt.toLocal()),
                    ].join(' · '),
                  ),
                  isThreeLine: true,
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

class _GatePassesTab extends ConsumerWidget {
  const _GatePassesTab({
    required this.canCreate,
    required this.canApprove,
    required this.onCreate,
    required this.onRefresh,
  });
  final bool canCreate;
  final bool canApprove;
  final VoidCallback onCreate;
  final Future<void> Function() onRefresh;

  Future<void> _transition(
    BuildContext context,
    WidgetRef ref,
    SafetyGatePassRow row,
    String next,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('$next gate pass?'),
        content: Text('Update the pass for ${row.name} to $next.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(next),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await ref.read(apiClientProvider).transitionGatePass(row.id, next);
      await onRefresh();
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
    final value = ref.watch(safetyGatePassesProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(safetyGatePassesProvider),
      ),
      data: (rows) {
        if (rows.isEmpty && !canCreate) {
          return const ErpEmptyState(
            icon: Icons.qr_code_2_outlined,
            title: 'No gate passes',
            message: 'Gate-pass requests will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: rows.length + (canCreate ? 1 : 0),
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              if (canCreate && index == 0) {
                return FilledButton.icon(
                  onPressed: onCreate,
                  icon: const Icon(Icons.add_moderator_outlined),
                  label: const Text('Create gate pass'),
                );
              }
              final row = rows[canCreate ? index - 1 : index];
              final actions = <Widget>[];
              if (canApprove && row.status == 'requested') {
                actions.add(
                  TextButton(
                    onPressed: () => _transition(context, ref, row, 'approved'),
                    child: const Text('Approve'),
                  ),
                );
                actions.add(
                  TextButton(
                    onPressed: () => _transition(context, ref, row, 'rejected'),
                    child: const Text('Reject'),
                  ),
                );
              } else if (canApprove && row.status == 'approved') {
                actions.add(
                  TextButton(
                    onPressed: () => _transition(context, ref, row, 'used'),
                    child: const Text('Mark used'),
                  ),
                );
              }
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(ErpSpacing.sm),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: ErpSpacing.sm,
                        ),
                        leading: const CircleAvatar(
                          child: Icon(Icons.qr_code_2_outlined),
                        ),
                        title: Text(row.name),
                        subtitle: Text(
                          [
                            if (row.reason?.isNotEmpty == true) row.reason!,
                            'Valid until ${DateFormat('d MMM yyyy, h:mm a').format(row.validUntil.toLocal())}',
                          ].join(' · '),
                        ),
                        trailing: ErpStatusChip(row.status),
                      ),
                      if (actions.isNotEmpty)
                        Align(
                          alignment: Alignment.centerRight,
                          child: Wrap(
                            spacing: ErpSpacing.xs,
                            children: actions,
                          ),
                        ),
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

class _IncidentsTab extends ConsumerWidget {
  const _IncidentsTab({
    required this.canCreate,
    required this.canUpdate,
    required this.onCreate,
    required this.onRefresh,
  });
  final bool canCreate;
  final bool canUpdate;
  final VoidCallback onCreate;
  final Future<void> Function() onRefresh;

  Future<void> _transition(
    BuildContext context,
    WidgetRef ref,
    SafetyIncidentRow row,
    String next,
  ) async {
    try {
      await ref
          .read(apiClientProvider)
          .transitionSecurityIncident(row.id, next);
      await onRefresh();
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
    final value = ref.watch(safetyIncidentsProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(safetyIncidentsProvider),
      ),
      data: (rows) {
        if (rows.isEmpty && !canCreate) {
          return const ErpEmptyState(
            icon: Icons.warning_amber_outlined,
            title: 'No security incidents',
            message: 'Reported safety incidents will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: rows.length + (canCreate ? 1 : 0),
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              if (canCreate && index == 0) {
                return FilledButton.icon(
                  onPressed: onCreate,
                  icon: const Icon(Icons.report_problem_outlined),
                  label: const Text('Record incident'),
                );
              }
              final row = rows[canCreate ? index - 1 : index];
              final next = switch (row.status) {
                'open' => 'investigating',
                'investigating' => 'resolved',
                'resolved' => 'closed',
                _ => null,
              };
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(
                    child: Icon(Icons.warning_amber_outlined),
                  ),
                  title: Text(row.title),
                  subtitle: Text(
                    '${row.severity} · ${DateFormat('d MMM yyyy, h:mm a').format(row.occurredAt.toLocal())}'
                    '${row.details == null ? '' : '\n${row.details}'}',
                  ),
                  isThreeLine: row.details != null,
                  trailing: canUpdate && next != null
                      ? TextButton(
                          onPressed: () => _transition(context, ref, row, next),
                          child: Text(next),
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

class _HealthWorkspace extends ConsumerStatefulWidget {
  const _HealthWorkspace();

  @override
  ConsumerState<_HealthWorkspace> createState() => _HealthWorkspaceState();
}

class _HealthWorkspaceState extends ConsumerState<_HealthWorkspace> {
  Future<void> _refresh() async {
    ref.invalidate(healthStudentsProvider);
    ref.invalidate(healthProfilesProvider);
    ref.invalidate(clinicVisitsProvider);
    await Future.wait([
      ref.read(healthStudentsProvider.future),
      ref.read(healthProfilesProvider.future),
      ref.read(clinicVisitsProvider.future),
    ]);
  }

  Future<void> _openProfileForm() async {
    try {
      final students = await ref.read(healthStudentsProvider.future);
      if (!mounted) return;
      if (students.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No active students are available.')),
        );
        return;
      }
      final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        builder: (_) => _HealthProfileForm(students: students),
      );
      if (saved == true) await _refresh();
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    }
  }

  Future<void> _openVisitForm() async {
    try {
      final students = await ref.read(healthStudentsProvider.future);
      if (!mounted) return;
      if (students.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No active students are available.')),
        );
        return;
      }
      final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        builder: (_) => _ClinicVisitForm(students: students),
      );
      if (saved == true) await _refresh();
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
    final canUpdate =
        ref.watch(sessionProvider).valueOrNull?.can('health:update') == true;
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          const TabBar(
            tabs: [
              Tab(text: 'Medical profiles'),
              Tab(text: 'Clinic visits'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _HealthProfilesTab(
                  canUpdate: canUpdate,
                  onCreate: _openProfileForm,
                  onRefresh: _refresh,
                ),
                _ClinicVisitsTab(
                  canUpdate: canUpdate,
                  onCreate: _openVisitForm,
                  onRefresh: _refresh,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HealthProfilesTab extends ConsumerWidget {
  const _HealthProfilesTab({
    required this.canUpdate,
    required this.onCreate,
    required this.onRefresh,
  });
  final bool canUpdate;
  final VoidCallback onCreate;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(healthProfilesProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(healthProfilesProvider),
      ),
      data: (rows) {
        if (rows.isEmpty && !canUpdate) {
          return const ErpEmptyState(
            icon: Icons.medical_information_outlined,
            title: 'No medical profiles',
            message: 'Authorized health summaries will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: rows.length + (canUpdate ? 1 : 0),
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              if (canUpdate && index == 0) {
                return FilledButton.icon(
                  onPressed: onCreate,
                  icon: const Icon(Icons.add_moderator_outlined),
                  label: const Text('Add or update profile'),
                );
              }
              final row = rows[canUpdate ? index - 1 : index];
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(
                    child: Icon(Icons.medical_information_outlined),
                  ),
                  title: Text(row.studentName),
                  subtitle: Text(
                    [
                      if (row.allergies?.isNotEmpty == true)
                        'Allergies: ${row.allergies}',
                      if (row.conditions?.isNotEmpty == true)
                        'Conditions: ${row.conditions}',
                      'Updated ${DateFormat('d MMM yyyy').format(row.updatedAt.toLocal())}',
                    ].join('\n'),
                  ),
                  isThreeLine: true,
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _ClinicVisitsTab extends ConsumerWidget {
  const _ClinicVisitsTab({
    required this.canUpdate,
    required this.onCreate,
    required this.onRefresh,
  });
  final bool canUpdate;
  final VoidCallback onCreate;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(clinicVisitsProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(clinicVisitsProvider),
      ),
      data: (rows) {
        if (rows.isEmpty && !canUpdate) {
          return const ErpEmptyState(
            icon: Icons.local_hospital_outlined,
            title: 'No clinic visits',
            message: 'Clinic visits recorded in your scope will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: rows.length + (canUpdate ? 1 : 0),
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              if (canUpdate && index == 0) {
                return FilledButton.icon(
                  onPressed: onCreate,
                  icon: const Icon(Icons.add_circle_outline),
                  label: const Text('Record clinic visit'),
                );
              }
              final row = rows[canUpdate ? index - 1 : index];
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(
                    child: Icon(Icons.local_hospital_outlined),
                  ),
                  title: Text(row.studentName),
                  subtitle: Text(
                    '${DateFormat('d MMM yyyy, h:mm a').format(row.visitedAt.toLocal())}\n${row.summary}',
                  ),
                  isThreeLine: true,
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

class _VisitorForm extends ConsumerStatefulWidget {
  const _VisitorForm();

  @override
  ConsumerState<_VisitorForm> createState() => _VisitorFormState();
}

class _VisitorFormState extends ConsumerState<_VisitorForm> {
  final _formKey = GlobalKey<FormState>();
  final _visitor = TextEditingController();
  final _purpose = TextEditingController();
  final _host = TextEditingController();
  DateTime _visitAt = DateTime.now();
  bool _saving = false;

  @override
  void dispose() {
    _visitor.dispose();
    _purpose.dispose();
    _host.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDate: _visitAt,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_visitAt),
    );
    if (time == null || !mounted) return;
    setState(
      () => _visitAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      ),
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(apiClientProvider)
          .createVisitor(
            visitorName: _visitor.text,
            purpose: _purpose.text,
            hostName: _host.text,
            visitAt: _visitAt,
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
  Widget build(BuildContext context) => _FormSheet(
    title: 'Register visitor',
    formKey: _formKey,
    saving: _saving,
    onSave: _save,
    children: [
      TextFormField(
        controller: _visitor,
        enabled: !_saving,
        decoration: const InputDecoration(labelText: 'Visitor name'),
        validator: _required,
      ),
      const SizedBox(height: ErpSpacing.md),
      TextFormField(
        controller: _purpose,
        enabled: !_saving,
        decoration: const InputDecoration(labelText: 'Purpose'),
        validator: _required,
      ),
      const SizedBox(height: ErpSpacing.md),
      TextFormField(
        controller: _host,
        enabled: !_saving,
        decoration: const InputDecoration(labelText: 'Host name'),
        validator: _required,
      ),
      const SizedBox(height: ErpSpacing.md),
      _DateButton(
        label: 'Visit time',
        value: _visitAt,
        onPressed: _pickDateTime,
      ),
    ],
  );
}

class _GatePassForm extends ConsumerStatefulWidget {
  const _GatePassForm({required this.visitors});
  final List<SafetyVisitorRow> visitors;

  @override
  ConsumerState<_GatePassForm> createState() => _GatePassFormState();
}

class _GatePassFormState extends ConsumerState<_GatePassForm> {
  final _formKey = GlobalKey<FormState>();
  final _reason = TextEditingController();
  String? _visitorId;
  DateTime _validUntil = DateTime.now().add(const Duration(days: 1));
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _visitorId = widget.visitors.first.id;
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDate: _validUntil,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_validUntil),
    );
    if (time == null || !mounted) return;
    setState(
      () => _validUntil = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      ),
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() || _visitorId == null) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(apiClientProvider)
          .createGatePass(
            visitorId: _visitorId!,
            reason: _reason.text,
            validUntil: _validUntil,
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
  Widget build(BuildContext context) => _FormSheet(
    title: 'Create gate pass',
    formKey: _formKey,
    saving: _saving,
    onSave: _save,
    children: [
      DropdownButtonFormField<String>(
        initialValue: _visitorId,
        decoration: const InputDecoration(labelText: 'Visitor'),
        items: [
          for (final visitor in widget.visitors)
            DropdownMenuItem(value: visitor.id, child: Text(visitor.name)),
        ],
        onChanged: _saving
            ? null
            : (value) => setState(() => _visitorId = value),
      ),
      const SizedBox(height: ErpSpacing.md),
      TextFormField(
        controller: _reason,
        enabled: !_saving,
        decoration: const InputDecoration(labelText: 'Reason'),
        validator: _required,
      ),
      const SizedBox(height: ErpSpacing.md),
      _DateButton(
        label: 'Valid until',
        value: _validUntil,
        onPressed: _pickDateTime,
      ),
    ],
  );
}

class _IncidentForm extends ConsumerStatefulWidget {
  const _IncidentForm();

  @override
  ConsumerState<_IncidentForm> createState() => _IncidentFormState();
}

class _IncidentFormState extends ConsumerState<_IncidentForm> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _details = TextEditingController();
  String _severity = 'medium';
  DateTime _occurredAt = DateTime.now();
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    _details.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDate: _occurredAt,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_occurredAt),
    );
    if (time == null || !mounted) return;
    setState(
      () => _occurredAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      ),
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(apiClientProvider)
          .createSecurityIncident(
            title: _title.text,
            severity: _severity,
            occurredAt: _occurredAt,
            details: _details.text,
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
  Widget build(BuildContext context) => _FormSheet(
    title: 'Record incident',
    formKey: _formKey,
    saving: _saving,
    onSave: _save,
    children: [
      TextFormField(
        controller: _title,
        enabled: !_saving,
        decoration: const InputDecoration(labelText: 'Title'),
        validator: _required,
      ),
      const SizedBox(height: ErpSpacing.md),
      DropdownButtonFormField<String>(
        initialValue: _severity,
        decoration: const InputDecoration(labelText: 'Severity'),
        items: const [
          DropdownMenuItem(value: 'low', child: Text('Low')),
          DropdownMenuItem(value: 'medium', child: Text('Medium')),
          DropdownMenuItem(value: 'high', child: Text('High')),
          DropdownMenuItem(value: 'critical', child: Text('Critical')),
        ],
        onChanged: _saving
            ? null
            : (value) => setState(() => _severity = value ?? 'medium'),
      ),
      const SizedBox(height: ErpSpacing.md),
      TextFormField(
        controller: _details,
        enabled: !_saving,
        minLines: 3,
        maxLines: 5,
        decoration: const InputDecoration(labelText: 'Details'),
        validator: _required,
      ),
      const SizedBox(height: ErpSpacing.md),
      _DateButton(
        label: 'Occurred at',
        value: _occurredAt,
        onPressed: _pickDateTime,
      ),
    ],
  );
}

class _HealthProfileForm extends ConsumerStatefulWidget {
  const _HealthProfileForm({required this.students});
  final List<HealthStudentOption> students;

  @override
  ConsumerState<_HealthProfileForm> createState() => _HealthProfileFormState();
}

class _HealthProfileFormState extends ConsumerState<_HealthProfileForm> {
  final _formKey = GlobalKey<FormState>();
  final _allergies = TextEditingController();
  final _conditions = TextEditingController();
  String? _studentId;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _studentId = widget.students.first.id;
  }

  @override
  void dispose() {
    _allergies.dispose();
    _conditions.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() || _studentId == null) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(apiClientProvider)
          .saveHealthProfile(
            studentId: _studentId!,
            allergies: _allergies.text,
            conditions: _conditions.text,
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
  Widget build(BuildContext context) => _FormSheet(
    title: 'Medical profile',
    formKey: _formKey,
    saving: _saving,
    onSave: _save,
    children: [
      DropdownButtonFormField<String>(
        initialValue: _studentId,
        decoration: const InputDecoration(labelText: 'Student'),
        items: [
          for (final student in widget.students)
            DropdownMenuItem(value: student.id, child: Text(student.name)),
        ],
        onChanged: _saving
            ? null
            : (value) => setState(() => _studentId = value),
      ),
      const SizedBox(height: ErpSpacing.md),
      TextFormField(
        controller: _allergies,
        enabled: !_saving,
        decoration: const InputDecoration(labelText: 'Allergies'),
        maxLines: 3,
      ),
      const SizedBox(height: ErpSpacing.md),
      TextFormField(
        controller: _conditions,
        enabled: !_saving,
        decoration: const InputDecoration(labelText: 'Medical conditions'),
        maxLines: 3,
      ),
    ],
  );
}

class _ClinicVisitForm extends ConsumerStatefulWidget {
  const _ClinicVisitForm({required this.students});
  final List<HealthStudentOption> students;

  @override
  ConsumerState<_ClinicVisitForm> createState() => _ClinicVisitFormState();
}

class _ClinicVisitFormState extends ConsumerState<_ClinicVisitForm> {
  final _formKey = GlobalKey<FormState>();
  final _summary = TextEditingController();
  String? _studentId;
  DateTime _visitedAt = DateTime.now();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _studentId = widget.students.first.id;
  }

  @override
  void dispose() {
    _summary.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDate: _visitedAt,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_visitedAt),
    );
    if (time == null || !mounted) return;
    setState(
      () => _visitedAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      ),
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() || _studentId == null) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(apiClientProvider)
          .createClinicVisit(
            studentId: _studentId!,
            visitedAt: _visitedAt,
            summary: _summary.text,
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
  Widget build(BuildContext context) => _FormSheet(
    title: 'Record clinic visit',
    formKey: _formKey,
    saving: _saving,
    onSave: _save,
    children: [
      DropdownButtonFormField<String>(
        initialValue: _studentId,
        decoration: const InputDecoration(labelText: 'Student'),
        items: [
          for (final student in widget.students)
            DropdownMenuItem(value: student.id, child: Text(student.name)),
        ],
        onChanged: _saving
            ? null
            : (value) => setState(() => _studentId = value),
      ),
      const SizedBox(height: ErpSpacing.md),
      TextFormField(
        controller: _summary,
        enabled: !_saving,
        minLines: 3,
        maxLines: 5,
        decoration: const InputDecoration(labelText: 'Visit summary'),
        validator: _required,
      ),
      const SizedBox(height: ErpSpacing.md),
      _DateButton(
        label: 'Visited at',
        value: _visitedAt,
        onPressed: _pickDateTime,
      ),
    ],
  );
}

class _FormSheet extends StatelessWidget {
  const _FormSheet({
    required this.title,
    required this.formKey,
    required this.saving,
    required this.onSave,
    required this.children,
  });
  final String title;
  final GlobalKey<FormState> formKey;
  final bool saving;
  final VoidCallback onSave;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(
      left: ErpSpacing.lg,
      right: ErpSpacing.lg,
      top: ErpSpacing.lg,
      bottom: MediaQuery.viewInsetsOf(context).bottom + ErpSpacing.lg,
    ),
    child: Form(
      key: formKey,
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
            ...children,
            const SizedBox(height: ErpSpacing.lg),
            FilledButton(
              onPressed: saving ? null : onSave,
              child: Text(saving ? 'Saving…' : 'Save'),
            ),
          ],
        ),
      ),
    ),
  );
}

class _DateButton extends StatelessWidget {
  const _DateButton({
    required this.label,
    required this.value,
    required this.onPressed,
  });
  final String label;
  final DateTime value;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => OutlinedButton.icon(
    onPressed: onPressed,
    icon: const Icon(Icons.schedule_outlined),
    label: Align(
      alignment: Alignment.centerLeft,
      child: Text('$label: ${DateFormat('d MMM yyyy, h:mm a').format(value)}'),
    ),
  );
}

String? _required(String? value) =>
    value == null || value.trim().isEmpty ? 'Required' : null;
