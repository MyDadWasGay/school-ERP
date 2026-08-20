import '../api/api_error.dart';
import 'mutation_queue.dart';

typedef MutationExecutor = Future<void> Function(QueuedMutation mutation);

enum MutationFailureKind { retryable, failed, conflict }

class RetryPolicy {
  const RetryPolicy({
    this.maxAttempts = 5,
    this.baseDelay = const Duration(seconds: 2),
    this.maxDelay = const Duration(minutes: 5),
  });

  final int maxAttempts;
  final Duration baseDelay;
  final Duration maxDelay;

  bool canRetry(int attemptCount) => attemptCount < maxAttempts;

  Duration delayFor(int attemptCount) {
    if (attemptCount <= 0) return Duration.zero;
    final exponent = (attemptCount - 1).clamp(0, 30).toInt();
    final multiplier = 1 << exponent;
    final delay = baseDelay * multiplier;
    return delay > maxDelay ? maxDelay : delay;
  }

  MutationFailureKind classify(Object error) {
    if (error is ApiError) {
      if (error.kind == ApiErrorKind.conflict) {
        return MutationFailureKind.conflict;
      }
      if (error.kind == ApiErrorKind.networkUnavailable ||
          error.kind == ApiErrorKind.timeout ||
          error.kind == ApiErrorKind.rateLimited ||
          (error.kind == ApiErrorKind.serverFailure &&
              const {502, 503, 504}.contains(error.statusCode))) {
        return MutationFailureKind.retryable;
      }
    }
    return MutationFailureKind.failed;
  }

  String messageFor(Object error) =>
      error is ApiError ? error.message : 'The mutation could not be synced.';
}

class SyncReport {
  const SyncReport({
    required this.synced,
    required this.retryable,
    required this.failed,
    required this.conflict,
    required this.skipped,
  });

  final int synced;
  final int retryable;
  final int failed;
  final int conflict;
  final int skipped;

  int get processed => synced + retryable + failed + conflict;
}

class SyncEngine {
  const SyncEngine({
    required this.queue,
    required this.executor,
    this.retryPolicy = const RetryPolicy(),
    this.clock = _now,
  });

  final MutationQueue queue;
  final MutationExecutor executor;
  final RetryPolicy retryPolicy;
  final DateTime Function() clock;

  Future<SyncReport> sync(SyncScope scope) async {
    final now = clock();
    final mutations = await queue.read(scope);
    var synced = 0;
    var retryable = 0;
    var failed = 0;
    var conflict = 0;
    var skipped = 0;

    for (final mutation in mutations) {
        if (mutation.status != MutationStatus.pending &&
          mutation.status != MutationStatus.retryable &&
          mutation.status != MutationStatus.syncing) {
        continue;
      }
      if (!_isEligible(mutation, now)) {
        skipped++;
        continue;
      }
      final syncing = mutation.copyWith(
        status: MutationStatus.syncing,
        attemptCount: mutation.attemptCount + 1,
        lastAttemptAt: now,
        clearLastError: true,
      );
      await queue.upsert(scope, syncing);
      try {
        await executor(syncing);
        await queue.upsert(
          scope,
          syncing.copyWith(status: MutationStatus.synced, clearLastError: true),
        );
        synced++;
      } on Object catch (error) {
        final failure = retryPolicy.classify(error);
        final canRetry =
            failure == MutationFailureKind.retryable &&
            retryPolicy.canRetry(syncing.attemptCount);
        final status = canRetry
            ? MutationStatus.retryable
            : failure == MutationFailureKind.conflict
            ? MutationStatus.conflict
            : MutationStatus.failed;
        await queue.upsert(
          scope,
          syncing.copyWith(
            status: status,
            lastError: retryPolicy.messageFor(error),
          ),
        );
        switch (status) {
          case MutationStatus.retryable:
            retryable++;
          case MutationStatus.conflict:
            conflict++;
          case MutationStatus.failed:
            failed++;
          default:
            failed++;
        }
      }
    }
    return SyncReport(
      synced: synced,
      retryable: retryable,
      failed: failed,
      conflict: conflict,
      skipped: skipped,
    );
  }

  bool _isEligible(QueuedMutation mutation, DateTime now) {
    final lastAttemptAt = mutation.lastAttemptAt;
    if (lastAttemptAt == null) return true;
    return now.difference(lastAttemptAt) >=
        retryPolicy.delayFor(mutation.attemptCount);
  }

  static DateTime _now() => DateTime.now().toUtc();
}
