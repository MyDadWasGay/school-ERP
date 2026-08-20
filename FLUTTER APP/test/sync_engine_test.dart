import 'package:flutter_test/flutter_test.dart';
import 'package:school_erp_mobile/core/api/api_error.dart';
import 'package:school_erp_mobile/core/sync/mutation_queue.dart';
import 'package:school_erp_mobile/core/sync/sync_engine.dart';

void main() {
  final scope = const SyncScope(
    tenantId: 'tenant-1',
    campusId: 'campus-1',
    userId: 'user-1',
  );

  test('continues syncing valid mutations after a validation failure', () async {
    final queue = InMemoryMutationQueue([
      _mutation('1'),
      _mutation('2'),
      _mutation('3'),
      _mutation('4'),
      _mutation('5'),
    ]);
    final processed = <String>[];
    final engine = SyncEngine(
      queue: queue,
      retryPolicy: const RetryPolicy(
        baseDelay: Duration.zero,
        maxDelay: Duration.zero,
      ),
      executor: (mutation) async {
        processed.add(mutation.entityId);
        if (mutation.entityId == '3') {
          throw const ApiError(
            kind: ApiErrorKind.validation,
            message: 'The attendance date is locked.',
          );
        }
      },
    );

    final report = await engine.sync(scope);

    expect(processed, ['1', '2', '3', '4', '5']);
    expect(report.synced, 4);
    expect(report.failed, 1);
    expect(report.retryable, 0);
    expect(queue.byId('3').status, MutationStatus.failed);
    expect(queue.byId('4').status, MutationStatus.synced);
  });

  test('classifies gateway failures as retryable and preserves the mutation', () async {
    final queue = InMemoryMutationQueue([_mutation('gateway')]);
    var attempts = 0;
    final engine = SyncEngine(
      queue: queue,
      retryPolicy: const RetryPolicy(
        baseDelay: Duration.zero,
        maxDelay: Duration.zero,
      ),
      executor: (_) async {
        attempts++;
        if (attempts == 1) {
          throw const ApiError(
            kind: ApiErrorKind.serverFailure,
            statusCode: 503,
            message: 'Service unavailable.',
          );
        }
      },
    );

    final first = await engine.sync(scope);
    expect(first.retryable, 1);
    expect(queue.byId('gateway').status, MutationStatus.retryable);
    expect(queue.byId('gateway').attemptCount, 1);

    final second = await engine.sync(scope);
    expect(second.synced, 1);
    expect(queue.byId('gateway').status, MutationStatus.synced);
  });

  test('scopes queue storage by tenant, campus, and user', () {
    const otherScope = SyncScope(
      tenantId: 'tenant-2',
      campusId: 'campus-1',
      userId: 'user-1',
    );

    expect(scope.storageKey, isNot(otherScope.storageKey));
  });
}

QueuedMutation _mutation(String id) => QueuedMutation(
  id: 'mutation-$id',
  tenantId: 'tenant-1',
  campusId: 'campus-1',
  userId: 'user-1',
  entityType: 'attendance',
  entityId: id,
  operation: 'upsert',
  payload: {'state': 'present'},
  createdAt: DateTime.utc(2026, 8, 20),
  attemptCount: 0,
  status: MutationStatus.pending,
  idempotencyKey: 'idempotency-$id',
);

class InMemoryMutationQueue implements MutationQueue {
  InMemoryMutationQueue(Iterable<QueuedMutation> mutations)
    : _mutations = [...mutations];

  final List<QueuedMutation> _mutations;

  QueuedMutation byId(String entityId) => _mutations.firstWhere(
    (mutation) => mutation.entityId == entityId,
  );

  @override
  Future<List<QueuedMutation>> read(SyncScope scope) async => [..._mutations];

  @override
  Future<void> upsert(SyncScope scope, QueuedMutation mutation) async {
    final index = _mutations.indexWhere((item) => item.id == mutation.id);
    if (index == -1) {
      _mutations.add(mutation);
    } else {
      _mutations[index] = mutation;
    }
  }

  @override
  Future<void> remove(SyncScope scope, String mutationId) async {
    _mutations.removeWhere((mutation) => mutation.id == mutationId);
  }

  @override
  Future<void> clearCompleted(SyncScope scope) async {
    _mutations.removeWhere(
      (mutation) => mutation.status == MutationStatus.synced,
    );
  }
}
