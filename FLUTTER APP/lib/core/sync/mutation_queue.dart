import 'dart:async';
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../shared/models/identity_models.dart';

enum MutationStatus {
  pending,
  syncing,
  synced,
  retryable,
  failed,
  conflict,
  cancelled,
}

class SyncScope {
  const SyncScope({
    required this.tenantId,
    required this.userId,
    this.campusId,
  });

  final String tenantId;
  final String userId;
  final String? campusId;

  String get storageKey => [
    'mutation_queue_v1',
    Uri.encodeComponent(tenantId),
    Uri.encodeComponent(campusId ?? 'all'),
    Uri.encodeComponent(userId),
  ].join(':');
}

class QueuedMutation {
  const QueuedMutation({
    required this.id,
    required this.tenantId,
    required this.campusId,
    required this.userId,
    required this.entityType,
    required this.entityId,
    required this.operation,
    required this.payload,
    required this.createdAt,
    required this.attemptCount,
    required this.status,
    required this.idempotencyKey,
    this.lastAttemptAt,
    this.lastError,
  });

  factory QueuedMutation.fromJson(Json json) => QueuedMutation(
    id: asString(json['id'], 'mutation.id'),
    tenantId: asString(json['tenantId'], 'mutation.tenantId'),
    campusId: asString(json['campusId'], 'mutation.campusId'),
    userId: asString(json['userId'], 'mutation.userId'),
    entityType: asString(json['entityType'], 'mutation.entityType'),
    entityId: asString(json['entityId'], 'mutation.entityId'),
    operation: asString(json['operation'], 'mutation.operation'),
    payload: asJson(json['payload'], 'mutation.payload'),
    createdAt: DateTime.parse(asString(json['createdAt'], 'mutation.createdAt')),
    attemptCount: asInt(json['attemptCount'], 'mutation.attemptCount'),
    status: MutationStatus.values.byName(
      asString(json['status'], 'mutation.status'),
    ),
    idempotencyKey: asString(
      json['idempotencyKey'],
      'mutation.idempotencyKey',
    ),
    lastAttemptAt: json['lastAttemptAt'] == null
        ? null
        : DateTime.parse(
            asString(json['lastAttemptAt'], 'mutation.lastAttemptAt'),
          ),
    lastError: json['lastError'] as String?,
  );

  Json toJson() => {
    'id': id,
    'tenantId': tenantId,
    'campusId': campusId,
    'userId': userId,
    'entityType': entityType,
    'entityId': entityId,
    'operation': operation,
    'payload': payload,
    'createdAt': createdAt.toIso8601String(),
    'attemptCount': attemptCount,
    'status': status.name,
    'idempotencyKey': idempotencyKey,
    if (lastAttemptAt != null)
      'lastAttemptAt': lastAttemptAt!.toIso8601String(),
    if (lastError != null) 'lastError': lastError,
  };

  QueuedMutation copyWith({
    MutationStatus? status,
    int? attemptCount,
    DateTime? lastAttemptAt,
    String? lastError,
    bool clearLastError = false,
  }) => QueuedMutation(
    id: id,
    tenantId: tenantId,
    campusId: campusId,
    userId: userId,
    entityType: entityType,
    entityId: entityId,
    operation: operation,
    payload: payload,
    createdAt: createdAt,
    attemptCount: attemptCount ?? this.attemptCount,
    status: status ?? this.status,
    idempotencyKey: idempotencyKey,
    lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
    lastError: clearLastError ? null : lastError ?? this.lastError,
  );

  final String id;
  final String tenantId;
  final String campusId;
  final String userId;
  final String entityType;
  final String entityId;
  final String operation;
  final Json payload;
  final DateTime createdAt;
  final int attemptCount;
  final DateTime? lastAttemptAt;
  final MutationStatus status;
  final String? lastError;
  final String idempotencyKey;
}

abstract interface class MutationQueue {
  Future<List<QueuedMutation>> read(SyncScope scope);
  Future<void> upsert(SyncScope scope, QueuedMutation mutation);
  Future<void> remove(SyncScope scope, String mutationId);
  Future<void> clearCompleted(SyncScope scope);
}

class FilteredMutationQueue implements MutationQueue {
  FilteredMutationQueue(this._delegate, this._matches);

  final MutationQueue _delegate;
  final bool Function(QueuedMutation mutation) _matches;

  @override
  Future<List<QueuedMutation>> read(SyncScope scope) async =>
      (await _delegate.read(scope)).where(_matches).toList(growable: false);

  @override
  Future<void> upsert(SyncScope scope, QueuedMutation mutation) {
    if (!_matches(mutation)) {
      throw StateError('Mutation is outside this queue view.');
    }
    return _delegate.upsert(scope, mutation);
  }

  @override
  Future<void> remove(SyncScope scope, String mutationId) =>
      _delegate.remove(scope, mutationId);

  @override
  Future<void> clearCompleted(SyncScope scope) async {
    final completed = (await read(scope)).where(
      (mutation) =>
          mutation.status == MutationStatus.synced ||
          mutation.status == MutationStatus.cancelled,
    );
    for (final mutation in completed) {
      await _delegate.remove(scope, mutation.id);
    }
  }
}

class MutationQueueStore implements MutationQueue {
  MutationQueueStore(this._preferences);

  final SharedPreferencesAsync _preferences;
  Future<void> _tail = Future<void>.value();

  @override
  Future<List<QueuedMutation>> read(SyncScope scope) => _withLock(() async {
    final mutations = await _readUnlocked(scope);
    return mutations
        .map(
          (mutation) => mutation.status == MutationStatus.syncing
              ? mutation.copyWith(status: MutationStatus.retryable)
              : mutation,
        )
        .toList(growable: false);
  });

  @override
  Future<void> upsert(SyncScope scope, QueuedMutation mutation) =>
      _withLock(() async {
        final mutations = await _readUnlocked(scope);
        final index = mutations.indexWhere((item) => item.id == mutation.id);
        if (index == -1) {
          mutations.add(mutation);
        } else {
          mutations[index] = mutation;
        }
        await _writeUnlocked(scope, mutations);
      });

  @override
  Future<void> remove(SyncScope scope, String mutationId) =>
      _withLock(() async {
        final mutations = await _readUnlocked(scope)
          ..removeWhere((mutation) => mutation.id == mutationId);
        await _writeUnlocked(scope, mutations);
      });

  @override
  Future<void> clearCompleted(SyncScope scope) => _withLock(() async {
    final mutations = await _readUnlocked(scope)
      ..removeWhere(
        (mutation) =>
            mutation.status == MutationStatus.synced ||
            mutation.status == MutationStatus.cancelled,
      );
    await _writeUnlocked(scope, mutations);
  });

  Future<List<QueuedMutation>> _readUnlocked(SyncScope scope) async {
    final raw = await _preferences.getString(scope.storageKey);
    if (raw == null || raw.trim().isEmpty) return [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return [];
      return decoded
          .whereType<Map>()
          .map((item) {
            try {
              return QueuedMutation.fromJson(
                item.map((key, value) => MapEntry(key.toString(), value)),
              );
            } on Object {
              return null;
            }
          })
          .whereType<QueuedMutation>()
          .toList(growable: true);
    } on Object {
      return [];
    }
  }

  Future<void> _writeUnlocked(
    SyncScope scope,
    List<QueuedMutation> mutations,
  ) async {
    if (mutations.isEmpty) {
      await _preferences.remove(scope.storageKey);
      return;
    }
    await _preferences.setString(
      scope.storageKey,
      jsonEncode(mutations.map((mutation) => mutation.toJson()).toList()),
    );
  }

  Future<T> _withLock<T>(Future<T> Function() action) {
    final previous = _tail;
    final gate = Completer<void>();
    _tail = gate.future;
    return () async {
      await previous;
      try {
        return await action();
      } finally {
        gate.complete();
      }
    }();
  }
}
