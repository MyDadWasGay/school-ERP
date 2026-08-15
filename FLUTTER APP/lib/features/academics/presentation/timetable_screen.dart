import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../../shared/widgets/erp_states.dart';

class TimetableScreen extends ConsumerWidget {
  const TimetableScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final records = ref.watch(academicRecordsProvider('timetable'));
    return records.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(academicRecordsProvider('timetable')),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.calendar_month_outlined,
            title: 'No timetable published',
            message:
                'Your campus timetable will appear here when it is available.',
          );
        }
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(academicRecordsProvider('timetable'));
            await ref.read(academicRecordsProvider('timetable').future);
          },
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: rows.length,
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              final row = rows[index];
              return Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: ErpSpacing.lg,
                    vertical: ErpSpacing.sm,
                  ),
                  leading: CircleAvatar(
                    child: const Icon(Icons.event_note_outlined),
                  ),
                  title: Text(row.name),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: ErpSpacing.xs),
                    child: Text(row.detail),
                  ),
                  trailing: ErpStatusChip(row.status),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
