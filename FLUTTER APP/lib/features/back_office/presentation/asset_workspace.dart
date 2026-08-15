import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/asset_models.dart';
import '../../../shared/models/student_models.dart';
import '../../../shared/models/workspace_models.dart';
import '../../../shared/widgets/erp_states.dart';

class AssetWorkspace extends ConsumerStatefulWidget {
  const AssetWorkspace({required this.onRefresh, super.key});

  final Future<void> Function() onRefresh;

  @override
  ConsumerState<AssetWorkspace> createState() => _AssetWorkspaceState();
}

class _AssetWorkspaceState extends ConsumerState<AssetWorkspace> {
  bool _can(String permission) =>
      ref.read(sessionProvider).valueOrNull?.can(permission) == true;

  void _showError(Object error) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
  }

  void _showSuccess(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _after(Future<void> Function() action, String message) async {
    try {
      await action();
      await widget.onRefresh();
      _showSuccess(message);
    } on Object catch (error) {
      _showError(error);
    }
  }

  Future<void> _createAsset() async {
    final values = await showModalBottomSheet<_AssetValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _AssetFormSheet(),
    );
    if (values == null || !mounted) return;
    await _after(
      () => ref
          .read(apiClientProvider)
          .createAsset(
            name: values.name,
            code: values.code,
            category: values.category,
            serialNumber: values.serialNumber,
            acquisitionMinor: values.acquisitionMinor,
            usefulLifeMonths: values.usefulLifeMonths,
          ),
      'Asset registered.',
    );
  }

  Future<void> _transitionAsset(AssetRow row) async {
    final statuses = switch (row.status) {
      'active' => const ['retired', 'disposed'],
      'retired' => const ['active', 'disposed'],
      _ => const <String>[],
    };
    final status = await _chooseStatus(
      title: 'Update ${row.code}',
      statuses: statuses,
    );
    if (status == null || !mounted) return;
    await _after(
      () => ref.read(apiClientProvider).transitionAsset(row.id, status),
      'Asset status updated.',
    );
  }

  Future<void> _assignAsset(List<AssetRow> assets) async {
    final activeAssets = assets.where((row) => row.status == 'active').toList();
    if (activeAssets.isEmpty) {
      _showSuccess('Register an active asset before assigning it.');
      return;
    }
    final values = await _loadAssignmentValues(activeAssets);
    if (values == null || !mounted) return;
    await _after(
      () => ref
          .read(apiClientProvider)
          .assignAsset(
            assetId: values.assetId,
            assigneeType: values.assigneeType,
            assigneeId: values.assigneeId,
            notes: values.notes,
          ),
      'Asset assigned.',
    );
  }

  Future<_AssetAssignmentValues?> _loadAssignmentValues(
    List<AssetRow> assets,
  ) async {
    try {
      final results = await Future.wait<Object?>([
        _can('students:read')
            ? ref.read(studentDirectoryProvider('').future)
            : Future.value(null),
        _can('hr:read')
            ? ref.read(employeesSearchProvider('').future)
            : Future.value(null),
      ]);
      if (!mounted) return null;
      final students = results[0] is PagedRows<StudentDirectoryRow>
          ? (results[0] as PagedRows<StudentDirectoryRow>).rows
          : const <StudentDirectoryRow>[];
      final employees = results[1] is List<EmployeeRow>
          ? results[1] as List<EmployeeRow>
          : const <EmployeeRow>[];
      if (students.isEmpty && employees.isEmpty) {
        _showSuccess(
          'Student or employee directory access is required to assign an asset.',
        );
        return null;
      }
      return showModalBottomSheet<_AssetAssignmentValues>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        builder: (_) => _AssetAssignmentSheet(
          assets: assets,
          students: students,
          employees: employees,
        ),
      );
    } on Object catch (error) {
      _showError(error);
      return null;
    }
  }

  Future<void> _transitionAssignment(AssetAssignmentRow row) async {
    final status = await _chooseStatus(
      title: 'Update assignment',
      statuses: const ['returned', 'cancelled'],
    );
    if (status == null || !mounted) return;
    await _after(
      () =>
          ref.read(apiClientProvider).transitionAssetAssignment(row.id, status),
      'Assignment status updated.',
    );
  }

  Future<void> _createMaintenance(List<AssetRow> assets) async {
    final available = assets.where((row) => row.status != 'disposed').toList();
    if (available.isEmpty) {
      _showSuccess('An active or retired asset is required for maintenance.');
      return;
    }
    final values = await showModalBottomSheet<_AssetMaintenanceValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _AssetMaintenanceSheet(assets: available),
    );
    if (values == null || !mounted) return;
    await _after(
      () => ref
          .read(apiClientProvider)
          .createAssetMaintenance(
            assetId: values.assetId,
            title: values.title,
            costMinor: values.costMinor,
            notes: values.notes,
          ),
      'Maintenance ticket created.',
    );
  }

  Future<void> _transitionMaintenance(AssetMaintenanceRow row) async {
    final statuses = switch (row.status) {
      'open' => const ['in_progress', 'cancelled'],
      'in_progress' => const ['completed', 'cancelled'],
      _ => const <String>[],
    };
    final status = await _chooseStatus(
      title: 'Update maintenance ticket',
      statuses: statuses,
    );
    if (status == null || !mounted) return;
    await _after(
      () => ref
          .read(apiClientProvider)
          .transitionAssetMaintenance(row.id, status),
      'Maintenance status updated.',
    );
  }

  Future<void> _postDepreciation(List<AssetRow> assets) async {
    final available = assets.where((row) => row.status != 'disposed').toList();
    if (available.isEmpty) {
      _showSuccess('An active or retired asset is required for depreciation.');
      return;
    }
    final values = await showModalBottomSheet<_AssetDepreciationValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _AssetDepreciationSheet(assets: available),
    );
    if (values == null || !mounted) return;
    await _after(
      () => ref
          .read(apiClientProvider)
          .postAssetDepreciation(
            assetId: values.assetId,
            period: values.period,
            amountMinor: values.amountMinor,
          ),
      'Depreciation posted.',
    );
  }

  Future<String?> _chooseStatus({
    required String title,
    required List<String> statuses,
  }) async {
    if (statuses.isEmpty) return null;
    return showModalBottomSheet<String>(
      context: context,
      useSafeArea: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.all(ErpSpacing.lg),
              child: Text(title, style: Theme.of(context).textTheme.titleLarge),
            ),
            for (final status in statuses)
              ListTile(
                leading: const Icon(Icons.arrow_forward),
                title: Text(_assetTitle(status)),
                onTap: () => Navigator.pop(context, status),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final canCreate = user?.can('assets:create') == true;
    final canUpdate = user?.can('assets:update') == true;
    return DefaultTabController(
      length: 4,
      child: Column(
        children: [
          const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Assets'),
              Tab(text: 'Assignments'),
              Tab(text: 'Maintenance'),
              Tab(text: 'Depreciation'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _AssetsTab(
                  onRefresh: widget.onRefresh,
                  canCreate: canCreate,
                  canUpdate: canUpdate,
                  onCreate: _createAsset,
                  onTransition: _transitionAsset,
                ),
                _AssetAssignmentsTab(
                  onRefresh: widget.onRefresh,
                  canUpdate: canUpdate,
                  onAssign: () async {
                    final assets = await ref.read(assetsProvider.future);
                    if (mounted) await _assignAsset(assets);
                  },
                  onTransition: _transitionAssignment,
                ),
                _AssetMaintenanceTab(
                  onRefresh: widget.onRefresh,
                  canUpdate: canUpdate,
                  onCreate: () async {
                    final assets = await ref.read(assetsProvider.future);
                    if (mounted) await _createMaintenance(assets);
                  },
                  onTransition: _transitionMaintenance,
                ),
                _AssetDepreciationTab(
                  onRefresh: widget.onRefresh,
                  canUpdate: canUpdate,
                  onCreate: () async {
                    final assets = await ref.read(assetsProvider.future);
                    if (mounted) await _postDepreciation(assets);
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AssetsTab extends ConsumerWidget {
  const _AssetsTab({
    required this.onRefresh,
    required this.canCreate,
    required this.canUpdate,
    required this.onCreate,
    required this.onTransition,
  });

  final Future<void> Function() onRefresh;
  final bool canCreate;
  final bool canUpdate;
  final VoidCallback onCreate;
  final Future<void> Function(AssetRow row) onTransition;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(assetsProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(error: error, onRetry: onRefresh),
      data: (rows) => RefreshIndicator(
        onRefresh: onRefresh,
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
                  onPressed: canCreate ? onCreate : null,
                  icon: const Icon(Icons.add),
                  label: const Text('Register asset'),
                ),
              );
            }
            if (rows.isEmpty) {
              return const ErpEmptyState(
                icon: Icons.business_center_outlined,
                title: 'No assets',
                message: 'Registered assets will appear here.',
              );
            }
            final row = rows[index - 1];
            return Card(
              child: ListTile(
                leading: const CircleAvatar(
                  child: Icon(Icons.business_center_outlined),
                ),
                title: Text('${row.code} · ${row.name}'),
                subtitle: Text(
                  '${row.category} · ${_assetMoney(row.bookValueMinor)} book value'
                  '${row.serialNumber == null ? '' : '\nSerial: ${row.serialNumber}'}',
                ),
                isThreeLine: row.serialNumber != null,
                trailing: canUpdate && row.status != 'disposed'
                    ? TextButton(
                        onPressed: () => onTransition(row),
                        child: Text(_assetTitle(row.status)),
                      )
                    : ErpStatusChip(row.status),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _AssetAssignmentsTab extends ConsumerWidget {
  const _AssetAssignmentsTab({
    required this.onRefresh,
    required this.canUpdate,
    required this.onAssign,
    required this.onTransition,
  });

  final Future<void> Function() onRefresh;
  final bool canUpdate;
  final VoidCallback onAssign;
  final Future<void> Function(AssetAssignmentRow row) onTransition;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(assetAssignmentsProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(error: error, onRetry: onRefresh),
      data: (rows) => RefreshIndicator(
        onRefresh: onRefresh,
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
                  onPressed: canUpdate ? onAssign : null,
                  icon: const Icon(Icons.assignment_ind_outlined),
                  label: const Text('Assign asset'),
                ),
              );
            }
            if (rows.isEmpty) {
              return const ErpEmptyState(
                icon: Icons.assignment_outlined,
                title: 'No assignments',
                message: 'Asset assignments and returns will appear here.',
              );
            }
            final row = rows[index - 1];
            return Card(
              child: ListTile(
                leading: const CircleAvatar(
                  child: Icon(Icons.assignment_outlined),
                ),
                title: Text('${row.assetCode} · ${row.assetName}'),
                subtitle: Text(
                  '${_assetTitle(row.assigneeType)} · '
                  '${row.assigneeName ?? row.assigneeId}\n'
                  '${DateFormat('d MMM yyyy').format(row.effectiveAt.toLocal())}',
                ),
                isThreeLine: true,
                trailing: row.status == 'active' && canUpdate
                    ? TextButton(
                        onPressed: () => onTransition(row),
                        child: const Text('Close'),
                      )
                    : ErpStatusChip(row.status),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _AssetMaintenanceTab extends ConsumerWidget {
  const _AssetMaintenanceTab({
    required this.onRefresh,
    required this.canUpdate,
    required this.onCreate,
    required this.onTransition,
  });

  final Future<void> Function() onRefresh;
  final bool canUpdate;
  final VoidCallback onCreate;
  final Future<void> Function(AssetMaintenanceRow row) onTransition;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(assetMaintenanceProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(error: error, onRetry: onRefresh),
      data: (rows) => RefreshIndicator(
        onRefresh: onRefresh,
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
                  onPressed: canUpdate ? onCreate : null,
                  icon: const Icon(Icons.add_task),
                  label: const Text('Create ticket'),
                ),
              );
            }
            if (rows.isEmpty) {
              return const ErpEmptyState(
                icon: Icons.build_outlined,
                title: 'No maintenance tickets',
                message: 'Asset maintenance work will appear here.',
              );
            }
            final row = rows[index - 1];
            return Card(
              child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.build_outlined)),
                title: Text(row.title),
                subtitle: Text(
                  '${row.assetName} · ${_assetMoney(row.costMinor)}\n'
                  '${DateFormat('d MMM yyyy').format(row.createdAt.toLocal())}',
                ),
                isThreeLine: true,
                trailing: canUpdate && row.status != 'completed'
                    ? TextButton(
                        onPressed: () => onTransition(row),
                        child: Text(_assetTitle(row.status)),
                      )
                    : ErpStatusChip(row.status),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _AssetDepreciationTab extends ConsumerWidget {
  const _AssetDepreciationTab({
    required this.onRefresh,
    required this.canUpdate,
    required this.onCreate,
  });

  final Future<void> Function() onRefresh;
  final bool canUpdate;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(assetDepreciationProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(error: error, onRetry: onRefresh),
      data: (rows) => RefreshIndicator(
        onRefresh: onRefresh,
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
                  onPressed: canUpdate ? onCreate : null,
                  icon: const Icon(Icons.post_add_outlined),
                  label: const Text('Post depreciation'),
                ),
              );
            }
            if (rows.isEmpty) {
              return const ErpEmptyState(
                icon: Icons.trending_down_outlined,
                title: 'No depreciation entries',
                message: 'Posted asset depreciation will appear here.',
              );
            }
            final row = rows[index - 1];
            return Card(
              child: ListTile(
                leading: const CircleAvatar(
                  child: Icon(Icons.trending_down_outlined),
                ),
                title: Text('${row.assetName} · ${row.period}'),
                subtitle: Text(
                  '${_assetMoney(row.amountMinor)} · '
                  '${_assetMoney(row.bookValueBeforeMinor)} → '
                  '${_assetMoney(row.bookValueAfterMinor)}',
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

class _AssetFormSheet extends StatefulWidget {
  const _AssetFormSheet();

  @override
  State<_AssetFormSheet> createState() => _AssetFormSheetState();
}

class _AssetFormSheetState extends State<_AssetFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _code = TextEditingController();
  final _category = TextEditingController();
  final _serialNumber = TextEditingController();
  final _acquisitionMinor = TextEditingController();
  final _usefulLifeMonths = TextEditingController(text: '60');

  @override
  void dispose() {
    _name.dispose();
    _code.dispose();
    _category.dispose();
    _serialNumber.dispose();
    _acquisitionMinor.dispose();
    _usefulLifeMonths.dispose();
    super.dispose();
  }

  String? _required(String? value, String label) =>
      value == null || value.trim().isEmpty ? 'Enter $label.' : null;

  String? _number(String? value, String label, {bool positive = false}) {
    final parsed = int.tryParse(value?.trim() ?? '');
    if (parsed == null || (positive ? parsed < 1 : parsed < 0)) {
      return positive ? 'Enter a positive $label.' : 'Enter a valid $label.';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) => _AssetSheetFrame(
    title: 'Register asset',
    child: Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _AssetTextField(
            controller: _name,
            label: 'Asset name',
            validator: (v) => _required(v, 'an asset name'),
          ),
          _AssetTextField(
            controller: _code,
            label: 'Asset code',
            validator: (v) => _required(v, 'an asset code'),
          ),
          _AssetTextField(
            controller: _category,
            label: 'Category',
            validator: (v) => _required(v, 'a category'),
          ),
          _AssetTextField(
            controller: _serialNumber,
            label: 'Serial number (optional)',
          ),
          _AssetTextField(
            controller: _acquisitionMinor,
            label: 'Acquisition amount in paise',
            number: true,
            validator: (v) => _number(v, 'amount'),
          ),
          _AssetTextField(
            controller: _usefulLifeMonths,
            label: 'Useful life in months',
            number: true,
            validator: (v) => _number(v, 'useful life', positive: true),
          ),
          const SizedBox(height: ErpSpacing.md),
          FilledButton(
            onPressed: () {
              if (!_formKey.currentState!.validate()) return;
              Navigator.pop(
                context,
                _AssetValues(
                  name: _name.text.trim(),
                  code: _code.text.trim(),
                  category: _category.text.trim(),
                  serialNumber: _serialNumber.text.trim().isEmpty
                      ? null
                      : _serialNumber.text.trim(),
                  acquisitionMinor: int.parse(_acquisitionMinor.text.trim()),
                  usefulLifeMonths: int.parse(_usefulLifeMonths.text.trim()),
                ),
              );
            },
            child: const Text('Register asset'),
          ),
        ],
      ),
    ),
  );
}

class _AssetAssignmentSheet extends StatefulWidget {
  const _AssetAssignmentSheet({
    required this.assets,
    required this.students,
    required this.employees,
  });

  final List<AssetRow> assets;
  final List<StudentDirectoryRow> students;
  final List<EmployeeRow> employees;

  @override
  State<_AssetAssignmentSheet> createState() => _AssetAssignmentSheetState();
}

class _AssetAssignmentSheetState extends State<_AssetAssignmentSheet> {
  final _notes = TextEditingController();
  String _type = 'student';
  String? _assetId;
  String? _assigneeId;

  @override
  void initState() {
    super.initState();
    _assetId = widget.assets.first.id;
    _setFirstAssignee();
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  void _setFirstAssignee() {
    _assigneeId = _type == 'student'
        ? (widget.students.isEmpty ? null : widget.students.first.id)
        : (widget.employees.isEmpty ? null : widget.employees.first.id);
  }

  @override
  Widget build(BuildContext context) {
    final assignees = _type == 'student'
        ? widget.students
              .map(
                (row) => DropdownMenuItem(value: row.id, child: Text(row.name)),
              )
              .toList()
        : widget.employees
              .map(
                (row) => DropdownMenuItem(value: row.id, child: Text(row.name)),
              )
              .toList();
    return _AssetSheetFrame(
      title: 'Assign asset',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _assetId,
            decoration: const InputDecoration(labelText: 'Asset'),
            items: [
              for (final row in widget.assets)
                DropdownMenuItem(
                  value: row.id,
                  child: Text('${row.code} · ${row.name}'),
                ),
            ],
            onChanged: (value) => setState(() => _assetId = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _type,
            decoration: const InputDecoration(labelText: 'Assignee type'),
            items: const [
              DropdownMenuItem(value: 'student', child: Text('Student')),
              DropdownMenuItem(value: 'employee', child: Text('Employee')),
            ],
            onChanged: (value) => setState(() {
              _type = value ?? 'student';
              _setFirstAssignee();
            }),
          ),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: assignees.any((item) => item.value == _assigneeId)
                ? _assigneeId
                : null,
            decoration: InputDecoration(
              labelText: _type == 'student' ? 'Student' : 'Employee',
            ),
            items: assignees,
            onChanged: (value) => setState(() => _assigneeId = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          TextField(
            controller: _notes,
            maxLines: 2,
            decoration: const InputDecoration(labelText: 'Notes (optional)'),
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: _assetId == null || _assigneeId == null
                ? null
                : () => Navigator.pop(
                    context,
                    _AssetAssignmentValues(
                      assetId: _assetId!,
                      assigneeType: _type,
                      assigneeId: _assigneeId!,
                      notes: _notes.text.trim().isEmpty
                          ? null
                          : _notes.text.trim(),
                    ),
                  ),
            child: const Text('Assign asset'),
          ),
        ],
      ),
    );
  }
}

class _AssetMaintenanceSheet extends StatefulWidget {
  const _AssetMaintenanceSheet({required this.assets});

  final List<AssetRow> assets;

  @override
  State<_AssetMaintenanceSheet> createState() => _AssetMaintenanceSheetState();
}

class _AssetMaintenanceSheetState extends State<_AssetMaintenanceSheet> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _cost = TextEditingController(text: '0');
  final _notes = TextEditingController();
  String? _assetId;

  @override
  void initState() {
    super.initState();
    _assetId = widget.assets.first.id;
  }

  @override
  void dispose() {
    _title.dispose();
    _cost.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _AssetSheetFrame(
    title: 'Create maintenance ticket',
    child: Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _assetId,
            decoration: const InputDecoration(labelText: 'Asset'),
            items: [
              for (final row in widget.assets)
                DropdownMenuItem(
                  value: row.id,
                  child: Text('${row.code} · ${row.name}'),
                ),
            ],
            onChanged: (value) => setState(() => _assetId = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          _AssetTextField(
            controller: _title,
            label: 'Work description',
            validator: (value) => value == null || value.trim().isEmpty
                ? 'Enter a work description.'
                : null,
          ),
          _AssetTextField(
            controller: _cost,
            label: 'Estimated cost in paise',
            number: true,
            validator: (value) {
              final parsed = int.tryParse(value?.trim() ?? '');
              return parsed == null || parsed < 0
                  ? 'Enter a valid cost.'
                  : null;
            },
          ),
          TextField(
            controller: _notes,
            maxLines: 2,
            decoration: const InputDecoration(labelText: 'Notes (optional)'),
          ),
          const SizedBox(height: ErpSpacing.md),
          FilledButton(
            onPressed: () {
              if (!_formKey.currentState!.validate() || _assetId == null) {
                return;
              }
              Navigator.pop(
                context,
                _AssetMaintenanceValues(
                  assetId: _assetId!,
                  title: _title.text.trim(),
                  costMinor: int.parse(_cost.text.trim()),
                  notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
                ),
              );
            },
            child: const Text('Create ticket'),
          ),
        ],
      ),
    ),
  );
}

class _AssetDepreciationSheet extends StatefulWidget {
  const _AssetDepreciationSheet({required this.assets});

  final List<AssetRow> assets;

  @override
  State<_AssetDepreciationSheet> createState() =>
      _AssetDepreciationSheetState();
}

class _AssetDepreciationSheetState extends State<_AssetDepreciationSheet> {
  final _formKey = GlobalKey<FormState>();
  final _period = TextEditingController();
  final _amount = TextEditingController();
  String? _assetId;

  @override
  void initState() {
    super.initState();
    _assetId = widget.assets.first.id;
    final now = DateTime.now();
    _period.text =
        '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _period.dispose();
    _amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _AssetSheetFrame(
    title: 'Post depreciation',
    child: Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _assetId,
            decoration: const InputDecoration(labelText: 'Asset'),
            items: [
              for (final row in widget.assets)
                DropdownMenuItem(
                  value: row.id,
                  child: Text(
                    '${row.code} · ${row.name} · ${_assetMoney(row.bookValueMinor)}',
                  ),
                ),
            ],
            onChanged: (value) => setState(() => _assetId = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          _AssetTextField(
            controller: _period,
            label: 'Period (YYYY-MM)',
            validator: (value) =>
                RegExp(r'^\d{4}-(0[1-9]|1[0-2])$').hasMatch(value?.trim() ?? '')
                ? null
                : 'Use YYYY-MM.',
          ),
          _AssetTextField(
            controller: _amount,
            label: 'Amount in paise',
            number: true,
            validator: (value) {
              final parsed = int.tryParse(value?.trim() ?? '');
              return parsed == null || parsed < 1
                  ? 'Enter a positive amount.'
                  : null;
            },
          ),
          const SizedBox(height: ErpSpacing.md),
          FilledButton(
            onPressed: () {
              if (!_formKey.currentState!.validate() || _assetId == null) {
                return;
              }
              Navigator.pop(
                context,
                _AssetDepreciationValues(
                  assetId: _assetId!,
                  period: _period.text.trim(),
                  amountMinor: int.parse(_amount.text.trim()),
                ),
              );
            },
            child: const Text('Post depreciation'),
          ),
        ],
      ),
    ),
  );
}

class _AssetTextField extends StatelessWidget {
  const _AssetTextField({
    required this.controller,
    required this.label,
    this.number = false,
    this.validator,
  });

  final TextEditingController controller;
  final String label;
  final bool number;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: ErpSpacing.md),
    child: TextFormField(
      controller: controller,
      keyboardType: number ? TextInputType.number : TextInputType.text,
      decoration: InputDecoration(labelText: label),
      validator: validator,
    ),
  );
}

class _AssetSheetFrame extends StatelessWidget {
  const _AssetSheetFrame({required this.title, required this.child});

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

class _AssetValues {
  const _AssetValues({
    required this.name,
    required this.code,
    required this.category,
    required this.serialNumber,
    required this.acquisitionMinor,
    required this.usefulLifeMonths,
  });
  final String name;
  final String code;
  final String category;
  final String? serialNumber;
  final int acquisitionMinor;
  final int usefulLifeMonths;
}

class _AssetAssignmentValues {
  const _AssetAssignmentValues({
    required this.assetId,
    required this.assigneeType,
    required this.assigneeId,
    this.notes,
  });
  final String assetId;
  final String assigneeType;
  final String assigneeId;
  final String? notes;
}

class _AssetMaintenanceValues {
  const _AssetMaintenanceValues({
    required this.assetId,
    required this.title,
    required this.costMinor,
    this.notes,
  });
  final String assetId;
  final String title;
  final int costMinor;
  final String? notes;
}

class _AssetDepreciationValues {
  const _AssetDepreciationValues({
    required this.assetId,
    required this.period,
    required this.amountMinor,
  });
  final String assetId;
  final String period;
  final int amountMinor;
}

String _assetMoney(int minor) => NumberFormat.currency(
  locale: 'en_IN',
  symbol: '₹',
  decimalDigits: 2,
).format(minor / 100);

String _assetTitle(String value) => value
    .replaceAll('_', ' ')
    .split(' ')
    .map(
      (word) =>
          word.isEmpty ? word : '${word[0].toUpperCase()}${word.substring(1)}',
    )
    .join(' ');
