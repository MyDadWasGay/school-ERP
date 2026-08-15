import 'package:flutter/material.dart';

import '../../app/theme/app_theme.dart';
import '../../core/api/api_error.dart';

class ErpErrorState extends StatelessWidget {
  const ErpErrorState({super.key, required this.error, required this.onRetry});
  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final apiError = error is ApiError ? error as ApiError : null;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(ErpSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.cloud_off_outlined,
              size: 44,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: ErpSpacing.md),
            Text(
              apiError?.message ?? 'Could not load this information.',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            if (apiError?.requestId != null) ...[
              const SizedBox(height: ErpSpacing.sm),
              Text(
                'Support reference: ${apiError!.requestId}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: ErpSpacing.lg),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }
}

class ErpEmptyState extends StatelessWidget {
  const ErpEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
  });
  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(ErpSpacing.xl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 44, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: ErpSpacing.md),
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: ErpSpacing.xs),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    ),
  );
}

class ErpLoadingList extends StatelessWidget {
  const ErpLoadingList({super.key});
  @override
  Widget build(BuildContext context) => ListView.separated(
    physics: const NeverScrollableScrollPhysics(),
    padding: const EdgeInsets.all(ErpSpacing.lg),
    itemCount: 5,
    separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.md),
    itemBuilder: (context, index) => Container(
      height: index == 0 ? 112 : 76,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
    ),
  );
}

class ErpStatusChip extends StatelessWidget {
  const ErpStatusChip(this.status, {super.key});
  final String status;

  @override
  Widget build(BuildContext context) {
    final normalized = status.toLowerCase();
    final scheme = Theme.of(context).colorScheme;
    final (color, icon) = switch (normalized) {
      'present' ||
      'paid' ||
      'approved' ||
      'active' ||
      'published' => (Colors.green.shade700, Icons.check_circle_outline),
      'absent' ||
      'rejected' ||
      'overdue' => (scheme.error, Icons.error_outline),
      'late' ||
      'pending' ||
      'partially_paid' => (Colors.orange.shade800, Icons.schedule),
      _ => (scheme.primary, Icons.info_outline),
    };
    return Semantics(
      label: 'Status: $status',
      child: Chip(
        avatar: Icon(icon, size: 16, color: color),
        label: Text(status.replaceAll('_', ' ')),
        labelStyle: TextStyle(color: color),
        backgroundColor: color.withValues(alpha: 0.10),
        side: BorderSide(color: color.withValues(alpha: 0.22)),
        visualDensity: VisualDensity.compact,
      ),
    );
  }
}
