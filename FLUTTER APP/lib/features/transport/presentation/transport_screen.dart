import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/transport_models.dart';
import '../../../shared/widgets/erp_states.dart';

class TransportScreen extends ConsumerWidget {
  const TransportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).valueOrNull;
    if (user?.can('transport:create') == true ||
        user?.can('transport:update') == true) {
      return const _TransportManagerWorkspace();
    }
    final transport = ref.watch(transportProvider);
    return transport.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(transportProvider),
      ),
      data: (allocations) {
        if (allocations.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.directions_bus_outlined,
            title: 'No transport allocation',
            message: 'Assigned routes and pickup stops will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(transportProvider);
            await ref.read(transportProvider.future);
          },
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: allocations.length,
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              final allocation = allocations[index];
              return _TransportAllocationCard(allocation: allocation);
            },
          ),
        );
      },
    );
  }
}

class _TransportAllocationCard extends ConsumerWidget {
  const _TransportAllocationCard({required this.allocation});

  final TransportAllocation allocation;

  Future<void> _openMap(
    BuildContext context,
    TransportLocation location,
  ) async {
    final opened = await launchUrl(
      Uri.parse(
        'https://maps.google.com/?q=${location.latitude},${location.longitude}',
      ),
      mode: LaunchMode.externalApplication,
    );
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('The map could not be opened.')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final latest = allocation.routeId == null
        ? const AsyncValue<TransportLocation?>.data(null)
        : ref.watch(transportLocationProvider(allocation.routeId!));
    final location = latest.valueOrNull;
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: ErpSpacing.lg,
          vertical: ErpSpacing.sm,
        ),
        leading: const CircleAvatar(
          child: Icon(Icons.directions_bus_outlined),
        ),
        title: Text(allocation.routeName),
        subtitle: Text(
          '${allocation.studentName} · Pickup ${allocation.stopName}\n'
          'Assigned ${DateFormat('d MMM yyyy').format(allocation.createdAt.toLocal())}\n'
          '${location == null ? 'Bus location unavailable' : location.stale ? 'Last bus location is stale' : 'Bus updated ${DateFormat('h:mm a').format(location.recordedAt.toLocal())}'}',
        ),
        isThreeLine: true,
        trailing: location == null
            ? const Icon(Icons.location_disabled_outlined)
            : IconButton(
                tooltip: 'Open bus location',
                onPressed: () => _openMap(context, location),
                icon: Icon(
                  location.stale
                      ? Icons.location_searching_outlined
                      : Icons.location_on_outlined,
                ),
              ),
      ),
    );
  }
}

class _TransportManagerWorkspace extends ConsumerWidget {
  const _TransportManagerWorkspace();

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(transportProvider);
    ref.invalidate(transportRoutesProvider);
    ref.invalidate(transportVehiclesProvider);
    ref.invalidate(transportStopsProvider);
    ref.invalidate(transportDocumentsProvider);
    ref.invalidate(transportStudentsProvider);
    await Future.wait([
      ref.read(transportProvider.future),
      ref.read(transportRoutesProvider.future),
      ref.read(transportVehiclesProvider.future),
      ref.read(transportStopsProvider.future),
      ref.read(transportDocumentsProvider.future),
    ]);
  }

  Future<void> _showForm(
    BuildContext context,
    WidgetRef ref,
    String kind,
  ) async {
    final result = await _openForm(context, kind);
    if (result == null || !context.mounted) return;
    try {
      final api = ref.read(apiClientProvider);
      switch (kind) {
        case 'vehicle':
          await api.createTransportVehicle(
            registrationNumber: result['registrationNumber']! as String,
            type: result['type']! as String,
            capacity: result['capacity']! as int,
          );
        case 'route':
          await api.createTransportRoute(
            name: result['name']! as String,
            capacity: result['capacity']! as int,
            vehicleId: result['vehicleId'] as String?,
          );
        case 'stop':
          await api.createTransportStop(
            name: result['name']! as String,
            address: result['address'] as String?,
          );
        case 'document':
          await api.createTransportDocument(
            vehicleId: result['vehicleId']! as String,
            documentType: result['documentType']! as String,
            expiresOn: result['expiresOn']! as DateTime,
          );
        case 'allocation':
          await api.allocateTransportStudent(
            routeId: result['routeId']! as String,
            studentId: result['studentId']! as String,
            stopId: result['stopId']! as String,
          );
      }
      await _refresh(ref);
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    }
  }

  Future<Map<String, Object?>?> _openForm(BuildContext context, String kind) =>
      switch (kind) {
        'vehicle' => showModalBottomSheet<Map<String, Object?>>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (_) => const _VehicleForm(),
        ),
        'route' => showModalBottomSheet<Map<String, Object?>>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (_) => const _RouteForm(),
        ),
        'stop' => showModalBottomSheet<Map<String, Object?>>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (_) => const _StopForm(),
        ),
        'document' => showModalBottomSheet<Map<String, Object?>>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (_) => const _DocumentForm(),
        ),
        'allocation' => showModalBottomSheet<Map<String, Object?>>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (_) => const _AllocationForm(),
        ),
        _ => Future<Map<String, Object?>?>.value(null),
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final canCreate = user?.can('transport:create') == true;
    final canUpdate = user?.can('transport:update') == true;
    return DefaultTabController(
      length: 5,
      child: Column(
        children: [
          if (canCreate || canUpdate)
            Padding(
              padding: const EdgeInsets.fromLTRB(
                ErpSpacing.lg,
                ErpSpacing.sm,
                ErpSpacing.lg,
                0,
              ),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    if (canUpdate)
                      _ManagerAction(
                        label: 'Allocate student',
                        icon: Icons.person_add_alt_1_outlined,
                        onPressed: () => _showForm(context, ref, 'allocation'),
                      ),
                    if (canCreate)
                      _ManagerAction(
                        label: 'Add vehicle',
                        icon: Icons.directions_bus_outlined,
                        onPressed: () => _showForm(context, ref, 'vehicle'),
                      ),
                    if (canCreate)
                      _ManagerAction(
                        label: 'Add route',
                        icon: Icons.alt_route_outlined,
                        onPressed: () => _showForm(context, ref, 'route'),
                      ),
                    if (canCreate)
                      _ManagerAction(
                        label: 'Add stop',
                        icon: Icons.location_on_outlined,
                        onPressed: () => _showForm(context, ref, 'stop'),
                      ),
                    if (canUpdate)
                      _ManagerAction(
                        label: 'Add document',
                        icon: Icons.description_outlined,
                        onPressed: () => _showForm(context, ref, 'document'),
                      ),
                  ],
                ),
              ),
            ),
          const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Allocations'),
              Tab(text: 'Routes'),
              Tab(text: 'Vehicles'),
              Tab(text: 'Stops'),
              Tab(text: 'Documents'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _TransportAllocationsTab(onRefresh: () => _refresh(ref)),
                _TransportRoutesTab(onRefresh: () => _refresh(ref)),
                _TransportVehiclesTab(onRefresh: () => _refresh(ref)),
                _TransportStopsTab(onRefresh: () => _refresh(ref)),
                _TransportDocumentsTab(onRefresh: () => _refresh(ref)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ManagerAction extends StatelessWidget {
  const _ManagerAction({
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(right: ErpSpacing.sm),
    child: OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon),
      label: Text(label),
    ),
  );
}

class _TransportAllocationsTab extends ConsumerWidget {
  const _TransportAllocationsTab({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(transportProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(transportProvider),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.assignment_outlined,
            title: 'No route allocations',
            message: 'Students assigned to transport routes will appear here.',
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
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(
                    child: Icon(Icons.directions_bus_outlined),
                  ),
                  title: Text(row.studentName),
                  subtitle: Text('${row.routeName} · ${row.stopName}'),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _TransportRoutesTab extends ConsumerWidget {
  const _TransportRoutesTab({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  Widget build(
    BuildContext context,
    WidgetRef ref,
  ) => _TransportListState<TransportRouteRow>(
    value: ref.watch(transportRoutesProvider),
    onRefresh: onRefresh,
    emptyIcon: Icons.alt_route_outlined,
    emptyTitle: 'No active routes',
    emptyMessage: 'Transport routes in your campus scope will appear here.',
    itemBuilder: (row) => ListTile(
      leading: const CircleAvatar(child: Icon(Icons.alt_route_outlined)),
      title: Text(row.name),
      subtitle: Text(
        '${row.capacity} seats${row.vehicleId == null ? '' : ' · Vehicle assigned'}',
      ),
      trailing: ErpStatusChip(row.status),
    ),
  );
}

class _TransportVehiclesTab extends ConsumerWidget {
  const _TransportVehiclesTab({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      _TransportListState<TransportVehicleRow>(
        value: ref.watch(transportVehiclesProvider),
        onRefresh: onRefresh,
        emptyIcon: Icons.directions_bus_filled_outlined,
        emptyTitle: 'No active vehicles',
        emptyMessage:
            'Registered vehicles in your campus scope will appear here.',
        itemBuilder: (row) => ListTile(
          leading: const CircleAvatar(
            child: Icon(Icons.directions_bus_filled_outlined),
          ),
          title: Text(row.registrationNumber),
          subtitle: Text('${row.type} · Capacity ${row.capacity}'),
          trailing: ErpStatusChip(row.status),
        ),
      );
}

class _TransportStopsTab extends ConsumerWidget {
  const _TransportStopsTab({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      _TransportListState<TransportStopRow>(
        value: ref.watch(transportStopsProvider),
        onRefresh: onRefresh,
        emptyIcon: Icons.location_on_outlined,
        emptyTitle: 'No active stops',
        emptyMessage:
            'Pickup and drop stops in your campus scope will appear here.',
        itemBuilder: (row) => ListTile(
          leading: const CircleAvatar(child: Icon(Icons.location_on_outlined)),
          title: Text(row.name),
          subtitle: Text(row.address ?? 'Address not recorded'),
          trailing: ErpStatusChip(row.status),
        ),
      );
}

class _TransportDocumentsTab extends ConsumerWidget {
  const _TransportDocumentsTab({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  Widget build(
    BuildContext context,
    WidgetRef ref,
  ) => _TransportListState<TransportDocumentRow>(
    value: ref.watch(transportDocumentsProvider),
    onRefresh: onRefresh,
    emptyIcon: Icons.description_outlined,
    emptyTitle: 'No vehicle documents',
    emptyMessage: 'Insurance, permit and fitness records will appear here.',
    itemBuilder: (row) => ListTile(
      leading: const CircleAvatar(child: Icon(Icons.description_outlined)),
      title: Text(row.name),
      subtitle: Text(
        '${row.registrationNumber}${row.expiresOn == null ? '' : ' - Expires ${DateFormat('d MMM yyyy').format(row.expiresOn!.toLocal())}'}',
      ),
      trailing: ErpStatusChip(row.status),
    ),
  );
}

class _TransportFormFrame extends StatelessWidget {
  const _TransportFormFrame({required this.title, required this.child});
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

class _VehicleForm extends StatefulWidget {
  const _VehicleForm();
  @override
  State<_VehicleForm> createState() => _VehicleFormState();
}

class _VehicleFormState extends State<_VehicleForm> {
  final _key = GlobalKey<FormState>();
  final _registration = TextEditingController();
  final _type = TextEditingController();
  final _capacity = TextEditingController(text: '40');

  @override
  void dispose() {
    _registration.dispose();
    _type.dispose();
    _capacity.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _TransportFormFrame(
    title: 'Add vehicle',
    child: Form(
      key: _key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _registration,
            decoration: const InputDecoration(labelText: 'Registration number'),
            validator: _required,
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _type,
            decoration: const InputDecoration(labelText: 'Vehicle type'),
            validator: _required,
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _capacity,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Capacity'),
            validator: _positiveInt,
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: () {
              if (!_key.currentState!.validate()) return;
              Navigator.pop(context, {
                'registrationNumber': _registration.text.trim(),
                'type': _type.text.trim(),
                'capacity': int.parse(_capacity.text.trim()),
              });
            },
            child: const Text('Save vehicle'),
          ),
        ],
      ),
    ),
  );
}

class _RouteForm extends ConsumerStatefulWidget {
  const _RouteForm();
  @override
  ConsumerState<_RouteForm> createState() => _RouteFormState();
}

class _RouteFormState extends ConsumerState<_RouteForm> {
  final _key = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _capacity = TextEditingController(text: '40');
  String? _vehicleId;

  @override
  void dispose() {
    _name.dispose();
    _capacity.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final vehicles =
        ref.watch(transportVehiclesProvider).valueOrNull ?? const [];
    return _TransportFormFrame(
      title: 'Add route',
      child: Form(
        key: _key,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Route name'),
              validator: _required,
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _capacity,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Seat capacity'),
              validator: _positiveInt,
            ),
            const SizedBox(height: ErpSpacing.md),
            DropdownButtonFormField<String?>(
              initialValue: _vehicleId,
              decoration: const InputDecoration(
                labelText: 'Vehicle (optional)',
              ),
              items: [
                const DropdownMenuItem<String?>(
                  value: null,
                  child: Text('No vehicle assigned'),
                ),
                for (final vehicle in vehicles)
                  DropdownMenuItem<String?>(
                    value: vehicle.id,
                    child: Text(vehicle.registrationNumber),
                  ),
              ],
              onChanged: (value) => setState(() => _vehicleId = value),
            ),
            const SizedBox(height: ErpSpacing.lg),
            FilledButton(
              onPressed: () {
                if (!_key.currentState!.validate()) return;
                Navigator.pop(context, {
                  'name': _name.text.trim(),
                  'capacity': int.parse(_capacity.text.trim()),
                  'vehicleId': _vehicleId,
                });
              },
              child: const Text('Save route'),
            ),
          ],
        ),
      ),
    );
  }
}

class _StopForm extends StatefulWidget {
  const _StopForm();
  @override
  State<_StopForm> createState() => _StopFormState();
}

class _StopFormState extends State<_StopForm> {
  final _key = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _address = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _address.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _TransportFormFrame(
    title: 'Add stop',
    child: Form(
      key: _key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Stop name'),
            validator: _required,
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _address,
            decoration: const InputDecoration(labelText: 'Address (optional)'),
            maxLines: 2,
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: () {
              if (!_key.currentState!.validate()) return;
              Navigator.pop(context, {
                'name': _name.text.trim(),
                'address': _address.text.trim(),
              });
            },
            child: const Text('Save stop'),
          ),
        ],
      ),
    ),
  );
}

class _DocumentForm extends ConsumerStatefulWidget {
  const _DocumentForm();
  @override
  ConsumerState<_DocumentForm> createState() => _DocumentFormState();
}

class _DocumentFormState extends ConsumerState<_DocumentForm> {
  final _key = GlobalKey<FormState>();
  final _type = TextEditingController();
  String? _vehicleId;
  DateTime _expiresOn = DateTime.now().add(const Duration(days: 365));

  @override
  void dispose() {
    _type.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 3650)),
      initialDate: _expiresOn,
    );
    if (picked != null && mounted) setState(() => _expiresOn = picked);
  }

  @override
  Widget build(BuildContext context) {
    final vehicles =
        ref.watch(transportVehiclesProvider).valueOrNull ?? const [];
    return _TransportFormFrame(
      title: 'Add vehicle document',
      child: Form(
        key: _key,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButtonFormField<String>(
              initialValue: _vehicleId,
              decoration: const InputDecoration(labelText: 'Vehicle'),
              items: [
                for (final vehicle in vehicles)
                  DropdownMenuItem(
                    value: vehicle.id,
                    child: Text(vehicle.registrationNumber),
                  ),
              ],
              onChanged: (value) => setState(() => _vehicleId = value),
              validator: (value) => value == null ? 'Select a vehicle' : null,
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _type,
              decoration: const InputDecoration(labelText: 'Document type'),
              validator: _required,
            ),
            const SizedBox(height: ErpSpacing.md),
            OutlinedButton.icon(
              onPressed: _pickDate,
              icon: const Icon(Icons.event_outlined),
              label: Text(
                'Expires ${DateFormat('d MMM yyyy').format(_expiresOn)}',
              ),
            ),
            const SizedBox(height: ErpSpacing.lg),
            FilledButton(
              onPressed: () {
                if (!_key.currentState!.validate()) return;
                Navigator.pop(context, {
                  'vehicleId': _vehicleId,
                  'documentType': _type.text.trim(),
                  'expiresOn': _expiresOn,
                });
              },
              child: const Text('Save document'),
            ),
          ],
        ),
      ),
    );
  }
}

class _AllocationForm extends ConsumerStatefulWidget {
  const _AllocationForm();
  @override
  ConsumerState<_AllocationForm> createState() => _AllocationFormState();
}

class _AllocationFormState extends ConsumerState<_AllocationForm> {
  final _key = GlobalKey<FormState>();
  String? _routeId;
  String? _studentId;
  String? _stopId;

  @override
  Widget build(BuildContext context) {
    final routes = ref.watch(transportRoutesProvider).valueOrNull ?? const [];
    final students =
        ref.watch(transportStudentsProvider).valueOrNull ?? const [];
    final stops = ref.watch(transportStopsProvider).valueOrNull ?? const [];
    return _TransportFormFrame(
      title: 'Allocate student',
      child: Form(
        key: _key,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _select<String>(
              label: 'Route',
              value: _routeId,
              items: routes.map((row) => (row.id, row.name)).toList(),
              onChanged: (value) => setState(() => _routeId = value),
            ),
            const SizedBox(height: ErpSpacing.md),
            _select<String>(
              label: 'Student',
              value: _studentId,
              items: students.map((row) => (row.id, row.name)).toList(),
              onChanged: (value) => setState(() => _studentId = value),
            ),
            const SizedBox(height: ErpSpacing.md),
            _select<String>(
              label: 'Stop',
              value: _stopId,
              items: stops.map((row) => (row.id, row.name)).toList(),
              onChanged: (value) => setState(() => _stopId = value),
            ),
            const SizedBox(height: ErpSpacing.lg),
            FilledButton(
              onPressed: routes.isEmpty || students.isEmpty || stops.isEmpty
                  ? null
                  : () {
                      if (_routeId == null ||
                          _studentId == null ||
                          _stopId == null) {
                        return;
                      }
                      Navigator.pop(context, {
                        'routeId': _routeId,
                        'studentId': _studentId,
                        'stopId': _stopId,
                      });
                    },
              child: const Text('Save allocation'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _select<T>({
    required String label,
    required T? value,
    required List<(T, String)> items,
    required ValueChanged<T?> onChanged,
  }) => DropdownButtonFormField<T>(
    initialValue: value,
    decoration: InputDecoration(labelText: label),
    items: [
      for (final item in items)
        DropdownMenuItem<T>(value: item.$1, child: Text(item.$2)),
    ],
    onChanged: onChanged,
    validator: (value) => value == null ? 'Select $label' : null,
  );
}

String? _required(String? value) =>
    value == null || value.trim().isEmpty ? 'Required' : null;

String? _positiveInt(String? value) {
  final parsed = int.tryParse(value?.trim() ?? '');
  return parsed == null || parsed < 1 ? 'Enter a positive number' : null;
}

class _TransportListState<T> extends StatelessWidget {
  const _TransportListState({
    required this.value,
    required this.onRefresh,
    required this.emptyIcon,
    required this.emptyTitle,
    required this.emptyMessage,
    required this.itemBuilder,
  });

  final AsyncValue<List<T>> value;
  final Future<void> Function() onRefresh;
  final IconData emptyIcon;
  final String emptyTitle;
  final String emptyMessage;
  final Widget Function(T row) itemBuilder;

  @override
  Widget build(BuildContext context) => value.when(
    loading: () => const ErpLoadingList(),
    error: (error, stack) => ErpErrorState(error: error, onRetry: onRefresh),
    data: (rows) => rows.isEmpty
        ? ErpEmptyState(
            icon: emptyIcon,
            title: emptyTitle,
            message: emptyMessage,
          )
        : RefreshIndicator(
            onRefresh: onRefresh,
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(ErpSpacing.lg),
              itemCount: rows.length,
              separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
              itemBuilder: (context, index) =>
                  Card(child: itemBuilder(rows[index])),
            ),
          ),
  );
}
