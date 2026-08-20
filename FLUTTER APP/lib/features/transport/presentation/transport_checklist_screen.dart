import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../core/sync/mutation_queue.dart';
import '../../../core/sync/sync_engine.dart';
import '../../../core/transport/transport_location_broadcaster.dart';
import '../../../shared/models/identity_models.dart';
import '../../../shared/models/transport_models.dart';
import '../../../shared/widgets/erp_states.dart';

class TransportChecklistScreen extends ConsumerStatefulWidget {
  const TransportChecklistScreen({super.key});

  @override
  ConsumerState<TransportChecklistScreen> createState() =>
      _TransportChecklistScreenState();
}

class _TransportChecklistScreenState
    extends ConsumerState<TransportChecklistScreen> {
  DateTime _date = _today();
  String? _routeId;
  String _tripType = 'morning';
  final _saving = <String>{};
  bool _broadcasting = false;

  String _dateKey(DateTime value) =>
      '${value.year.toString().padLeft(4, '0')}-'
      '${value.month.toString().padLeft(2, '0')}-'
      '${value.day.toString().padLeft(2, '0')}';

  ({String routeId, DateTime eventDate, String tripType}) _input(
    String routeId,
  ) => (routeId: routeId, eventDate: _date, tripType: _tripType);

  SyncScope? _scope() {
    final user = ref.read(sessionProvider).valueOrNull;
    final campusId = user?.campus?.id;
    if (user == null || campusId == null) return null;
    return SyncScope(
      tenantId: user.organization.id,
      userId: user.id,
      campusId: campusId,
    );
  }

  String _mutationId(String studentId, String routeId) {
    final scope = ref.read(sessionProvider).valueOrNull;
    return '${scope?.id ?? 'user'}:$routeId:$studentId:${_dateKey(_date)}:$_tripType';
  }

  Future<void> _pickDate() async {
    final selected = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 14)),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      initialDate: _date,
      helpText: 'Checklist date',
    );
    if (selected == null) return;
    setState(() => _date = DateTime(selected.year, selected.month, selected.day));
  }

  Future<void> _toggleBroadcast(String routeId) async {
    final broadcaster = ref.read(transportLocationBroadcasterProvider);
    if (_broadcasting) {
      await broadcaster.stop();
      if (mounted) setState(() => _broadcasting = false);
      return;
    }
    try {
      await broadcaster.start(routeId);
      if (mounted) setState(() => _broadcasting = true);
    } on TransportLocationException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Route tracking could not start. $error')),
        );
      }
    }
  }

  Future<void> _record(
    TransportChecklistStudent student,
    String eventType,
    String routeId,
  ) async {
    final key = student.studentId;
    if (_saving.contains(key)) return;
    setState(() => _saving.add(key));
    try {
      await ref.read(apiClientProvider).recordTransportBoardingEvent(
        routeId: routeId,
        studentId: student.studentId,
        stopId: student.stopId,
        eventDate: _date,
        tripType: _tripType,
        eventType: eventType,
      );
      final scope = _scope();
      if (scope != null) {
        await ref.read(mutationQueueProvider).remove(
          scope,
          _mutationId(student.studentId, routeId),
        );
      }
      _invalidateChecklist(routeId);
    } on Object catch (error) {
      if (const RetryPolicy().classify(error) == MutationFailureKind.retryable) {
        final scope = _scope();
        final user = ref.read(sessionProvider).valueOrNull;
        if (scope != null && user != null) {
          await ref.read(mutationQueueProvider).upsert(
            scope,
            QueuedMutation(
              id: _mutationId(student.studentId, routeId),
              tenantId: user.organization.id,
              campusId: scope.campusId ?? 'all',
              userId: user.id,
              entityType: 'transport_boarding',
              entityId: student.studentId,
              operation: 'upsert',
              payload: {
                'routeId': routeId,
                'studentId': student.studentId,
                'stopId': student.stopId,
                'eventDate': _dateKey(_date),
                'tripType': _tripType,
                'eventType': eventType,
              },
              createdAt: DateTime.now().toUtc(),
              attemptCount: 0,
              status: MutationStatus.pending,
              idempotencyKey: _mutationId(student.studentId, routeId),
            ),
          );
        }
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Connection unavailable. This event is queued locally.'),
            ),
          );
        }
      } else if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    } finally {
      if (mounted) setState(() => _saving.remove(key));
    }
  }

  Future<void> _syncPending(String routeId) async {
    final scope = _scope();
    if (scope == null) return;
    final queue = ref.read(mutationQueueProvider);
    final filtered = FilteredMutationQueue(
      queue,
      (mutation) =>
          mutation.entityType == 'transport_boarding' &&
          mutation.payload['routeId'] == routeId &&
          mutation.payload['eventDate'] == _dateKey(_date) &&
          mutation.payload['tripType'] == _tripType,
    );
    final engine = SyncEngine(
      queue: filtered,
      executor: (mutation) async {
        final payload = mutation.payload;
        await ref.read(apiClientProvider).recordTransportBoardingEvent(
          routeId: asString(payload['routeId'], 'transport.routeId'),
          studentId: asString(payload['studentId'], 'transport.studentId'),
          stopId: asString(payload['stopId'], 'transport.stopId'),
          eventDate: DateTime.parse(
            asString(payload['eventDate'], 'transport.eventDate'),
          ),
          tripType: asString(payload['tripType'], 'transport.tripType'),
          eventType: asString(payload['eventType'], 'transport.eventType'),
        );
      },
    );
    final report = await engine.sync(scope);
    await filtered.clearCompleted(scope);
    _invalidateChecklist(routeId);
    if (mounted && report.processed > 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${report.synced} transport event(s) synced.')),
      );
    }
  }

  void _invalidateChecklist(String routeId) {
    ref.invalidate(transportChecklistProvider(_input(routeId)));
  }

  @override
  Widget build(BuildContext context) {
    final routes = ref.watch(transportRoutesProvider);
    return routes.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(transportRoutesProvider),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.directions_bus_outlined,
            title: 'No assigned routes',
            message: 'A transport route must be assigned before a checklist can be started.',
          );
        }
        final routeId = rows.any((route) => route.id == _routeId)
            ? _routeId!
            : rows.first.id;
        final checklist = ref.watch(transportChecklistProvider(_input(routeId)));
        final location = ref.watch(transportLocationProvider(routeId));
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                ErpSpacing.lg,
                ErpSpacing.md,
                ErpSpacing.lg,
                ErpSpacing.sm,
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: routeId,
                          decoration: const InputDecoration(
                            labelText: 'Route',
                            prefixIcon: Icon(Icons.alt_route_outlined),
                          ),
                          items: [
                            for (final route in rows)
                              DropdownMenuItem(
                                value: route.id,
                                child: Text(route.name),
                              ),
                          ],
                          onChanged: (value) => setState(() => _routeId = value),
                        ),
                      ),
                      const SizedBox(width: ErpSpacing.sm),
                      IconButton(
                        tooltip: 'Sync queued events',
                        onPressed: () => _syncPending(routeId),
                        icon: const Icon(Icons.sync_outlined),
                      ),
                    ],
                  ),
                  const SizedBox(height: ErpSpacing.sm),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _pickDate,
                          icon: const Icon(Icons.calendar_today_outlined),
                          label: Align(
                            alignment: Alignment.centerLeft,
                            child: Text(DateFormat('EEE, d MMM yyyy').format(_date)),
                          ),
                        ),
                      ),
                      const SizedBox(width: ErpSpacing.sm),
                      SegmentedButton<String>(
                        segments: const [
                          ButtonSegment(value: 'morning', label: Text('AM')),
                          ButtonSegment(value: 'afternoon', label: Text('PM')),
                        ],
                        selected: {_tripType},
                        onSelectionChanged: (value) =>
                            setState(() => _tripType = value.first),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            _LocationStatusCard(
              value: location,
              broadcasting: _broadcasting,
              onToggle: () => _toggleBroadcast(routeId),
            ),
            Expanded(
              child: checklist.when(
                loading: () => const ErpLoadingList(),
                error: (error, stack) => ErpErrorState(
                  error: error,
                  onRetry: () => _invalidateChecklist(routeId),
                ),
                data: (data) => _ChecklistList(
                  data: data,
                  saving: _saving,
                  onEvent: (student, event) =>
                      _record(student, event, routeId),
                  onRefresh: () async {
                    await _syncPending(routeId);
                    _invalidateChecklist(routeId);
                    await ref.read(transportChecklistProvider(_input(routeId)).future);
                  },
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  static DateTime _today() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }
}

class _LocationStatusCard extends StatelessWidget {
  const _LocationStatusCard({
    required this.value,
    required this.broadcasting,
    required this.onToggle,
  });

  final AsyncValue<TransportLocation?> value;
  final bool broadcasting;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final location = value.valueOrNull;
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        ErpSpacing.lg,
        0,
        ErpSpacing.lg,
        ErpSpacing.sm,
      ),
      child: Card(
        child: ListTile(
          leading: Icon(
            broadcasting
                ? Icons.gps_fixed_outlined
                : Icons.gps_not_fixed_outlined,
          ),
          title: Text(
            broadcasting ? 'Route location is broadcasting' : 'Route location',
          ),
          subtitle: Text(
            location == null
                ? 'No location has been received yet.'
                : location.stale
                ? 'Last update is stale. ${location.latitude.toStringAsFixed(5)}, ${location.longitude.toStringAsFixed(5)}'
                : 'Updated ${DateFormat('h:mm a').format(location.recordedAt.toLocal())} · ${location.latitude.toStringAsFixed(5)}, ${location.longitude.toStringAsFixed(5)}',
          ),
          trailing: FilledButton.tonal(
            onPressed: onToggle,
            child: Text(broadcasting ? 'Stop' : 'Start'),
          ),
        ),
      ),
    );
  }
}

class _ChecklistList extends StatelessWidget {
  const _ChecklistList({
    required this.data,
    required this.saving,
    required this.onEvent,
    required this.onRefresh,
  });

  final TransportChecklist data;
  final Set<String> saving;
  final Future<void> Function(TransportChecklistStudent student, String event)
  onEvent;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    if (data.students.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.groups_outlined,
        title: 'No students on this route',
        message: 'Active route allocations will appear in the driver checklist.',
      );
    }
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
          ErpSpacing.lg,
          ErpSpacing.sm,
          ErpSpacing.lg,
          ErpSpacing.xxl,
        ),
        itemCount: data.students.length,
        separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
        itemBuilder: (context, index) {
          final student = data.students[index];
          final selected = student.eventType;
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(ErpSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      child: Icon(
                        selected == 'boarded' || selected == 'dropped'
                            ? Icons.check
                            : Icons.person_outline,
                      ),
                    ),
                    title: Text(student.studentName),
                    subtitle: Text('Stop: ${student.stopName}'),
                    trailing: selected == null
                        ? const ErpStatusChip('pending')
                        : ErpStatusChip(selected),
                  ),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(
                        value: 'boarded',
                        label: Text('Boarded'),
                        icon: Icon(Icons.login_outlined),
                      ),
                      ButtonSegment(
                        value: 'absent',
                        label: Text('Absent'),
                        icon: Icon(Icons.person_off_outlined),
                      ),
                      ButtonSegment(
                        value: 'dropped',
                        label: Text('Dropped'),
                        icon: Icon(Icons.logout_outlined),
                      ),
                    ],
                    selected: selected == null ? <String>{} : {selected},
                    emptySelectionAllowed: true,
                    onSelectionChanged: saving.contains(student.studentId)
                        ? null
                        : (value) {
                            if (value.isNotEmpty) onEvent(student, value.first);
                          },
                  ),
                  if (saving.contains(student.studentId))
                    const Padding(
                      padding: EdgeInsets.only(top: ErpSpacing.sm),
                      child: LinearProgressIndicator(),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
