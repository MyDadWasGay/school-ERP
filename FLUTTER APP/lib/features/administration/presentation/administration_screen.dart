import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/admin_models.dart';
import '../../../shared/widgets/erp_states.dart';

class AdministrationScreen extends ConsumerWidget {
  const AdministrationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final tabs = <Tab>[];
    final views = <Widget>[];
    if (user?.can('campuses:read') == true) {
      tabs.add(const Tab(text: 'Campuses'));
      views.add(const _CampusesTab());
    }
    if (user?.can('settings:read') == true) {
      tabs.add(const Tab(text: 'Academic setup'));
      views.add(const _AcademicSetupWorkspace());
    }
    if (user?.can('users:read') == true) {
      tabs.add(const Tab(text: 'Users'));
      views.add(const _UsersTab());
    }
    if (tabs.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.admin_panel_settings_outlined,
        title: 'Administration is not available',
        message: 'Your account does not have administration permissions.',
      );
    }
    return DefaultTabController(
      length: tabs.length,
      child: Column(
        children: [
          TabBar(tabs: tabs, isScrollable: true),
          Expanded(child: TabBarView(children: views)),
        ],
      ),
    );
  }
}

class _CampusesTab extends ConsumerStatefulWidget {
  const _CampusesTab();
  @override
  ConsumerState<_CampusesTab> createState() => _CampusesTabState();
}

class _CampusesTabState extends ConsumerState<_CampusesTab> {
  Future<void> _create() async {
    final values = await showModalBottomSheet<_CampusValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _CampusForm(),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createCampus(
            name: values.name,
            code: values.code,
            address: values.address,
          );
      ref.invalidate(adminCampusesProvider);
      if (mounted) _show('Campus created.');
    } on Object catch (error) {
      if (mounted) _show(readableApiError(error));
    }
  }

  Future<void> _archive(AdminCampusRow row) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Archive campus?'),
        content: Text(
          '${row.name} can be archived only after its active dependencies are cleared.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Archive'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await ref.read(apiClientProvider).archiveCampus(row.id);
      ref.invalidate(adminCampusesProvider);
      if (mounted) _show('Campus archived.');
    } on Object catch (error) {
      if (mounted) _show(readableApiError(error));
    }
  }

  void _show(String message) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(message)));

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(adminCampusesProvider);
    final canCreate =
        ref.watch(sessionProvider).valueOrNull?.can('campuses:create') == true;
    final canUpdate =
        ref.watch(sessionProvider).valueOrNull?.can('campuses:update') == true;
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(adminCampusesProvider),
      ),
      data: (rows) => RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(adminCampusesProvider);
          await ref.read(adminCampusesProvider.future);
        },
        child: ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(ErpSpacing.lg),
          itemCount: rows.length + (canCreate ? 1 : 0),
          separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
          itemBuilder: (context, index) {
            if (canCreate && index == 0) {
              return FilledButton.icon(
                onPressed: _create,
                icon: const Icon(Icons.add_business_outlined),
                label: const Text('Add campus'),
              );
            }
            if (rows.isEmpty) {
              return const ErpEmptyState(
                icon: Icons.location_city_outlined,
                title: 'No campuses',
                message: 'Authorized campus records will appear here.',
              );
            }
            final row = rows[canCreate ? index - 1 : index];
            return Card(
              child: ListTile(
                leading: const CircleAvatar(
                  child: Icon(Icons.location_city_outlined),
                ),
                title: Text(row.name),
                subtitle: Text(row.detail),
                trailing: canUpdate && row.status != 'archived'
                    ? TextButton(
                        onPressed: () => _archive(row),
                        child: const Text('Archive'),
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

class _AcademicSetupWorkspace extends StatelessWidget {
  const _AcademicSetupWorkspace();
  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 4,
    child: Column(
      children: [
        const TabBar(
          tabs: [
            Tab(text: 'Years'),
            Tab(text: 'Classes'),
            Tab(text: 'Sections'),
            Tab(text: 'Subjects'),
          ],
        ),
        const Expanded(
          child: TabBarView(
            children: [
              _AcademicSetupTab(kind: 'academic_year'),
              _AcademicSetupTab(kind: 'class'),
              _AcademicSetupTab(kind: 'section'),
              _AcademicSetupTab(kind: 'subject'),
            ],
          ),
        ),
      ],
    ),
  );
}

class _AcademicSetupTab extends ConsumerStatefulWidget {
  const _AcademicSetupTab({required this.kind});
  final String kind;
  @override
  ConsumerState<_AcademicSetupTab> createState() => _AcademicSetupTabState();
}

class _AcademicSetupTabState extends ConsumerState<_AcademicSetupTab> {
  Future<void> _create(AcademicSetupOptions options) async {
    final values = await showModalBottomSheet<_AcademicSetupValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _AcademicSetupForm(kind: widget.kind, options: options),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createAcademicSetup(
            kind: widget.kind,
            campusId: values.campusId,
            name: values.name,
            code: values.code,
            startsOn: values.startsOn,
            endsOn: values.endsOn,
            isActive: values.isActive,
            sortOrder: values.sortOrder,
            classId: values.classId,
            capacity: values.capacity,
            isOptional: values.isOptional,
          );
      ref.invalidate(academicSetupProvider(widget.kind));
      ref.invalidate(academicSetupOptionsProvider);
      if (mounted) _show('Academic setup saved.');
    } on Object catch (error) {
      if (mounted) _show(readableApiError(error));
    }
  }

  Future<void> _archive(AcademicSetupRow row) async {
    try {
      await ref
          .read(apiClientProvider)
          .archiveAcademicSetup(widget.kind, row.id);
      ref.invalidate(academicSetupProvider(widget.kind));
      if (mounted) _show('Record archived.');
    } on Object catch (error) {
      if (mounted) _show(readableApiError(error));
    }
  }

  void _show(String message) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(message)));

  @override
  Widget build(BuildContext context) {
    final rows = ref.watch(academicSetupProvider(widget.kind));
    final options = ref.watch(academicSetupOptionsProvider);
    final canUpdate =
        ref.watch(sessionProvider).valueOrNull?.can('settings:update') == true;
    if (rows.isLoading || options.isLoading) return const ErpLoadingList();
    if (rows.hasError) {
      return ErpErrorState(
        error: rows.error!,
        onRetry: () => ref.invalidate(academicSetupProvider(widget.kind)),
      );
    }
    if (options.hasError) {
      return ErpErrorState(
        error: options.error!,
        onRetry: () => ref.invalidate(academicSetupOptionsProvider),
      );
    }
    final data = rows.valueOrNull ?? const <AcademicSetupRow>[];
    final setupOptions = options.valueOrNull;
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(academicSetupProvider(widget.kind));
        await ref.read(academicSetupProvider(widget.kind).future);
      },
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(ErpSpacing.lg),
        itemCount: data.length + (canUpdate ? 1 : 0),
        separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
        itemBuilder: (context, index) {
          if (canUpdate && index == 0) {
            return FilledButton.icon(
              onPressed: setupOptions == null
                  ? null
                  : () => _create(setupOptions),
              icon: const Icon(Icons.add),
              label: Text('Add ${_kindLabel(widget.kind)}'),
            );
          }
          if (data.isEmpty) {
            return ErpEmptyState(
              icon: _kindIcon(widget.kind),
              title: 'No ${_kindLabel(widget.kind)} records',
              message: 'Setup records in the active campus scope appear here.',
            );
          }
          final row = data[canUpdate ? index - 1 : index];
          return Card(
            child: ListTile(
              leading: CircleAvatar(child: Icon(_kindIcon(widget.kind))),
              title: Text(row.name),
              subtitle: Text(row.detail),
              trailing: canUpdate && row.status != 'archived'
                  ? TextButton(
                      onPressed: () => _archive(row),
                      child: const Text('Archive'),
                    )
                  : ErpStatusChip(row.status),
            ),
          );
        },
      ),
    );
  }
}

class _UsersTab extends ConsumerStatefulWidget {
  const _UsersTab();
  @override
  ConsumerState<_UsersTab> createState() => _UsersTabState();
}

class _UsersTabState extends ConsumerState<_UsersTab> {
  final _search = TextEditingController();
  String _query = '';
  @override
  void initState() {
    super.initState();
    _search.addListener(() => setState(() => _query = _search.text.trim()));
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(adminUsersProvider(_query));
    final canUpdate =
        ref.watch(sessionProvider).valueOrNull?.can('users:update') == true;
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(adminUsersProvider(_query)),
      ),
      data: (page) => RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(adminUsersProvider(_query));
          await ref.read(adminUsersProvider(_query).future);
        },
        child: ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(ErpSpacing.lg),
          itemCount: page.rows.length + 1,
          separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
          itemBuilder: (context, index) {
            if (index == 0) {
              return TextField(
                controller: _search,
                decoration: const InputDecoration(
                  labelText: 'Search users',
                  prefixIcon: Icon(Icons.search),
                ),
              );
            }
            if (page.rows.isEmpty) {
              return const ErpEmptyState(
                icon: Icons.people_outline,
                title: 'No users',
                message:
                    'Users in your authorized organization scope appear here.',
              );
            }
            final row = page.rows[index - 1];
            return Card(
              child: ListTile(
                leading: CircleAvatar(child: Text(_initials(row.displayName))),
                title: Text(row.displayName),
                subtitle: Text(
                  '${row.email}\n${row.role.replaceAll('_', ' ')}',
                ),
                isThreeLine: true,
                trailing: canUpdate
                    ? const Icon(Icons.chevron_right)
                    : ErpStatusChip(row.status),
                onTap: canUpdate ? () => _openAccess(row) : null,
              ),
            );
          },
        ),
      ),
    );
  }

  Future<void> _openAccess(AdminUserRow row) async {
    final detail = await showModalBottomSheet<AdminUserAccessDetail>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _UserAccessSheet(userId: row.id),
    );
    if (detail == null || !mounted) return;
    ref.invalidate(adminUsersProvider(_query));
  }

  String _initials(String name) => name
      .trim()
      .split(RegExp(r'\s+'))
      .take(2)
      .map((value) => value[0].toUpperCase())
      .join();
}

class _UserAccessSheet extends ConsumerStatefulWidget {
  const _UserAccessSheet({required this.userId});
  final String userId;
  @override
  ConsumerState<_UserAccessSheet> createState() => _UserAccessSheetState();
}

class _UserAccessSheetState extends ConsumerState<_UserAccessSheet> {
  final _name = TextEditingController();
  String? _role;
  String _status = 'active';
  String? _primaryCampusId;
  bool _saving = false;
  static const roles = [
    'super_admin',
    'management',
    'principal',
    'office_staff',
    'teacher',
    'accountant',
    'librarian',
    'transport_staff',
    'hostel_warden',
    'parent',
    'student',
    'alumni',
  ];

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save(AdminUserAccessDetail detail) async {
    if (_name.text.trim().length < 2 ||
        _role == null ||
        _primaryCampusId == null) {
      return;
    }
    setState(() => _saving = true);
    try {
      await ref
          .read(apiClientProvider)
          .updateAdminUserAccess(
            userId: detail.user.id,
            displayName: _name.text.trim(),
            role: _role!,
            status: _status,
            primaryCampusId: _primaryCampusId!,
            campusIds: detail.campusIds.isEmpty
                ? [_primaryCampusId!]
                : detail.campusIds,
            classSectionScopes: detail.classSectionScopes,
          );
      if (mounted) Navigator.pop(context, detail);
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
    final value = ref.watch(adminUserAccessProvider(widget.userId));
    return value.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(48),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(adminUserAccessProvider(widget.userId)),
      ),
      data: (detail) {
        _name.text = _name.text.isEmpty ? detail.user.displayName : _name.text;
        _role ??= detail.user.role;
        _status = detail.user.status;
        _primaryCampusId ??= detail.campusIds.isEmpty
            ? (detail.campusOptions.isEmpty
                  ? null
                  : detail.campusOptions.first.id)
            : detail.campusIds.first;
        return Padding(
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
                Text(
                  'User access',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: ErpSpacing.xs),
                Text(detail.user.email),
                const SizedBox(height: ErpSpacing.md),
                TextField(
                  controller: _name,
                  enabled: !_saving,
                  decoration: const InputDecoration(labelText: 'Display name'),
                ),
                const SizedBox(height: ErpSpacing.md),
                DropdownButtonFormField<String>(
                  initialValue: _role,
                  decoration: const InputDecoration(labelText: 'Role'),
                  items: [
                    for (final role in roles)
                      DropdownMenuItem(
                        value: role,
                        child: Text(role.replaceAll('_', ' ')),
                      ),
                  ],
                  onChanged: _saving
                      ? null
                      : (value) => setState(() => _role = value),
                ),
                const SizedBox(height: ErpSpacing.md),
                DropdownButtonFormField<String>(
                  initialValue: _status,
                  decoration: const InputDecoration(labelText: 'Status'),
                  items: const [
                    DropdownMenuItem(value: 'active', child: Text('Active')),
                    DropdownMenuItem(
                      value: 'inactive',
                      child: Text('Inactive'),
                    ),
                    DropdownMenuItem(
                      value: 'suspended',
                      child: Text('Suspended'),
                    ),
                  ],
                  onChanged: _saving
                      ? null
                      : (value) => setState(() => _status = value ?? 'active'),
                ),
                const SizedBox(height: ErpSpacing.md),
                DropdownButtonFormField<String>(
                  initialValue: _primaryCampusId,
                  decoration: const InputDecoration(
                    labelText: 'Primary campus',
                  ),
                  items: [
                    for (final campus in detail.campusOptions)
                      DropdownMenuItem(
                        value: campus.id,
                        child: Text(campus.name),
                      ),
                  ],
                  onChanged: _saving
                      ? null
                      : (value) => setState(() => _primaryCampusId = value),
                ),
                const SizedBox(height: ErpSpacing.sm),
                Text(
                  'Assigned campuses: ${detail.campusIds.length}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                Text(
                  'Class scopes retained: ${detail.classSectionScopes.length}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: ErpSpacing.lg),
                FilledButton(
                  onPressed: _saving ? null : () => _save(detail),
                  child: Text(_saving ? 'Saving…' : 'Save access'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _CampusValues {
  const _CampusValues({required this.name, required this.code, this.address});
  final String name;
  final String code;
  final String? address;
}

class _AcademicSetupValues {
  const _AcademicSetupValues({
    required this.campusId,
    required this.name,
    this.code,
    this.startsOn,
    this.endsOn,
    this.isActive = false,
    this.sortOrder,
    this.classId,
    this.capacity,
    this.isOptional = false,
  });
  final String campusId;
  final String name;
  final String? code;
  final DateTime? startsOn;
  final DateTime? endsOn;
  final bool isActive;
  final int? sortOrder;
  final String? classId;
  final int? capacity;
  final bool isOptional;
}

class _CampusForm extends StatefulWidget {
  const _CampusForm();
  @override
  State<_CampusForm> createState() => _CampusFormState();
}

class _CampusFormState extends State<_CampusForm> {
  final _name = TextEditingController();
  final _code = TextEditingController();
  final _address = TextEditingController();
  @override
  void dispose() {
    _name.dispose();
    _code.dispose();
    _address.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _AdminSheet(
    title: 'Add campus',
    child: Column(
      children: [
        TextField(
          controller: _name,
          decoration: const InputDecoration(labelText: 'Campus name'),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _code,
          decoration: const InputDecoration(labelText: 'Code'),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _address,
          maxLines: 2,
          decoration: const InputDecoration(labelText: 'Address (optional)'),
        ),
        const SizedBox(height: ErpSpacing.lg),
        FilledButton(
          onPressed: _name.text.trim().isEmpty || _code.text.trim().isEmpty
              ? null
              : () => Navigator.pop(
                  context,
                  _CampusValues(
                    name: _name.text.trim(),
                    code: _code.text.trim(),
                    address: _address.text.trim().isEmpty
                        ? null
                        : _address.text.trim(),
                  ),
                ),
          child: const Text('Create campus'),
        ),
      ],
    ),
  );
}

class _AcademicSetupForm extends StatefulWidget {
  const _AcademicSetupForm({required this.kind, required this.options});
  final String kind;
  final AcademicSetupOptions options;
  @override
  State<_AcademicSetupForm> createState() => _AcademicSetupFormState();
}

class _AcademicSetupFormState extends State<_AcademicSetupForm> {
  final _name = TextEditingController();
  final _code = TextEditingController();
  final _sort = TextEditingController(text: '0');
  final _capacity = TextEditingController(text: '30');
  String? _campusId;
  String? _classId;
  DateTime _start = DateTime.now();
  DateTime _end = DateTime.now().add(const Duration(days: 365));
  bool _active = false;
  bool _optional = false;
  @override
  void initState() {
    super.initState();
    _campusId = widget.options.campuses.isEmpty
        ? null
        : widget.options.campuses.first.id;
    _classId = widget.options.classes.isEmpty
        ? null
        : widget.options.classes.first.id;
  }

  @override
  void dispose() {
    for (final c in [_name, _code, _sort, _capacity]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pick(bool start) async {
    final initial = start ? _start : _end;
    final value = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 3650)),
      lastDate: DateTime.now().add(const Duration(days: 3650)),
      initialDate: initial,
    );
    if (value != null && mounted) {
      setState(() {
        if (start) {
          _start = value;
        } else {
          _end = value;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final year = widget.kind == 'academic_year';
    final section = widget.kind == 'section';
    final subject = widget.kind == 'subject';
    return _AdminSheet(
      title: 'Add ${_kindLabel(widget.kind)}',
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
          TextField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Name'),
          ),
          if (!year) ...[
            const SizedBox(height: ErpSpacing.md),
            TextField(
              controller: _code,
              decoration: const InputDecoration(labelText: 'Code'),
            ),
          ],
          if (section) ...[
            const SizedBox(height: ErpSpacing.md),
            DropdownButtonFormField<String>(
              initialValue: _classId,
              decoration: const InputDecoration(labelText: 'Class'),
              items: [
                for (final row in widget.options.classes)
                  DropdownMenuItem(value: row.id, child: Text(row.name)),
              ],
              onChanged: (value) => setState(() => _classId = value),
            ),
            const SizedBox(height: ErpSpacing.md),
            TextField(
              controller: _capacity,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Capacity'),
            ),
          ],
          if (widget.kind == 'class') ...[
            const SizedBox(height: ErpSpacing.md),
            TextField(
              controller: _sort,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Sort order'),
            ),
          ],
          if (year) ...[
            const SizedBox(height: ErpSpacing.md),
            OutlinedButton.icon(
              onPressed: () => _pick(true),
              icon: const Icon(Icons.event),
              label: Text('Starts ${DateFormat('d MMM yyyy').format(_start)}'),
            ),
            OutlinedButton.icon(
              onPressed: () => _pick(false),
              icon: const Icon(Icons.event_available),
              label: Text('Ends ${DateFormat('d MMM yyyy').format(_end)}'),
            ),
            SwitchListTile(
              value: _active,
              onChanged: (value) => setState(() => _active = value),
              title: const Text('Make active academic year'),
            ),
          ],
          if (subject)
            SwitchListTile(
              value: _optional,
              onChanged: (value) => setState(() => _optional = value),
              title: const Text('Optional subject'),
            ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: _campusId == null || _name.text.trim().isEmpty
                ? null
                : () => Navigator.pop(
                    context,
                    _AcademicSetupValues(
                      campusId: _campusId!,
                      name: _name.text.trim(),
                      code: _code.text.trim().isEmpty
                          ? null
                          : _code.text.trim(),
                      startsOn: year ? _start : null,
                      endsOn: year ? _end : null,
                      isActive: _active,
                      sortOrder: widget.kind == 'class'
                          ? int.tryParse(_sort.text.trim())
                          : null,
                      classId: section ? _classId : null,
                      capacity: section
                          ? int.tryParse(_capacity.text.trim())
                          : null,
                      isOptional: _optional,
                    ),
                  ),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}

class _AdminSheet extends StatelessWidget {
  const _AdminSheet({required this.title, required this.child});
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
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: ErpSpacing.md),
          child,
        ],
      ),
    ),
  );
}

String _kindLabel(String kind) => switch (kind) {
  'academic_year' => 'academic year',
  'class' => 'class',
  'section' => 'section',
  'subject' => 'subject',
  _ => kind,
};
IconData _kindIcon(String kind) => switch (kind) {
  'academic_year' => Icons.event_note_outlined,
  'class' => Icons.class_outlined,
  'section' => Icons.view_list_outlined,
  'subject' => Icons.menu_book_outlined,
  _ => Icons.settings_outlined,
};
