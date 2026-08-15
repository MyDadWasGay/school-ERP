import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../../shared/widgets/erp_states.dart';

class NoticesScreen extends ConsumerWidget {
  const NoticesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notices = ref.watch(noticesProvider);
    return notices.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(noticesProvider),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.campaign_outlined,
            title: 'No announcements yet',
            message:
                'Published school notices for your campus will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(noticesProvider);
            await ref.read(noticesProvider.future);
          },
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: rows.length,
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.md),
            itemBuilder: (context, index) {
              final notice = rows[index];
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(ErpSpacing.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              notice.title,
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                          const SizedBox(width: ErpSpacing.sm),
                          ErpStatusChip(notice.status),
                        ],
                      ),
                      const SizedBox(height: ErpSpacing.sm),
                      Text(
                        notice.body,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      const SizedBox(height: ErpSpacing.md),
                      Row(
                        children: [
                          const Icon(Icons.people_outline, size: 18),
                          const SizedBox(width: ErpSpacing.xs),
                          Text(
                            _audienceLabel(notice.audience),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          if (notice.publishedAt != null) ...[
                            const SizedBox(width: ErpSpacing.md),
                            const Icon(Icons.schedule_outlined, size: 18),
                            const SizedBox(width: ErpSpacing.xs),
                            Text(
                              DateFormat(
                                'd MMM yyyy, h:mm a',
                              ).format(notice.publishedAt!.toLocal()),
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ],
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

  static String _audienceLabel(String value) => switch (value) {
    'all' => 'Everyone',
    'students' => 'Students',
    'parents' => 'Parents',
    'teachers' => 'Teachers',
    'staff' => 'Staff',
    _ => value,
  };
}
