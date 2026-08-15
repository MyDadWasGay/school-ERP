import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../../shared/widgets/erp_states.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});
  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  final _updating = <String>{};

  Future<void> _markRead(String id) async {
    if (_updating.contains(id)) return;
    setState(() => _updating.add(id));
    try {
      await ref.read(apiClientProvider).markNotificationRead(id);
      ref.invalidate(notificationsProvider);
    } on Object {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not update this notification. Try again.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _updating.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(notificationsProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(notificationsProvider),
      ),
      data: (page) {
        if (page.rows.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.notifications_none,
            title: 'No notifications',
            message: 'Important school updates will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(notificationsProvider);
            await ref.read(notificationsProvider.future);
          },
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: page.rows.length,
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              final item = page.rows[index];
              final unread = item.readAt == null;
              return Card(
                color: unread
                    ? Theme.of(
                        context,
                      ).colorScheme.primaryContainer.withValues(alpha: 0.32)
                    : null,
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: ErpSpacing.lg,
                    vertical: ErpSpacing.sm,
                  ),
                  leading: CircleAvatar(
                    child: Icon(
                      unread
                          ? Icons.notifications_active_outlined
                          : Icons.notifications_none,
                    ),
                  ),
                  title: Text(
                    item.subject,
                    style: unread
                        ? const TextStyle(fontWeight: FontWeight.w700)
                        : null,
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: ErpSpacing.xs),
                      Text(
                        item.body,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (item.sentAt != null) ...[
                        const SizedBox(height: ErpSpacing.xs),
                        Text(
                          DateFormat(
                            'd MMM · h:mm a',
                          ).format(item.sentAt!.toLocal()),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ],
                  ),
                  trailing: unread
                      ? IconButton(
                          tooltip: 'Mark as read',
                          onPressed: _updating.contains(item.id)
                              ? null
                              : () => _markRead(item.id),
                          icon: _updating.contains(item.id)
                              ? const SizedBox.square(
                                  dimension: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.done),
                        )
                      : null,
                ),
              );
            },
          ),
        );
      },
    );
  }
}
