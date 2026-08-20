import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/academic_models.dart';
import '../../../shared/widgets/erp_states.dart';

class SyllabusProgressScreen extends ConsumerWidget {
  const SyllabusProgressScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(syllabusProgressProvider);
    final canUpdate =
        ref.watch(sessionProvider).valueOrNull?.can('academics:update') == true;
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(syllabusProgressProvider),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.menu_book_outlined,
            title: 'No syllabus lessons yet',
            message:
                'Published lesson plans will appear here as the academic team adds them.',
          );
        }
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(syllabusProgressProvider);
            await ref.read(syllabusProgressProvider.future);
          },
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: rows.length,
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) => _SubjectProgressCard(
              row: rows[index],
              canUpdate: canUpdate,
            ),
          ),
        );
      },
    );
  }
}

class _SubjectProgressCard extends ConsumerWidget {
  const _SubjectProgressCard({required this.row, required this.canUpdate});

  final SyllabusProgressRow row;
  final bool canUpdate;

  Future<void> _updateStatus(
    BuildContext context,
    WidgetRef ref,
    SyllabusLessonRow lesson,
    String status,
  ) async {
    try {
      await ref.read(apiClientProvider).updateLessonPlanStatus(
        lessonPlanId: lesson.id,
        status: status,
      );
      ref.invalidate(syllabusProgressProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${lesson.title} marked $status.')),
        );
      }
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progress = (row.completionPercentage / 100).clamp(0.0, 1.0);
    return Card(
      child: ExpansionTile(
        leading: CircleAvatar(
          child: Text('${row.completionPercentage.round()}%'),
        ),
        title: Text(row.subjectName),
        subtitle: Text(
          '${row.completedLessons}/${row.totalLessons} lessons complete · ${row.teacherName}',
        ),
        childrenPadding: const EdgeInsets.fromLTRB(
          ErpSpacing.lg,
          0,
          ErpSpacing.lg,
          ErpSpacing.md,
        ),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Updated ${DateFormat('d MMM yyyy').format(row.lastUpdated.toLocal())}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          const SizedBox(height: ErpSpacing.sm),
          LinearProgressIndicator(value: progress),
          const SizedBox(height: ErpSpacing.sm),
          for (final lesson in row.lessons)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                lesson.status == 'completed'
                    ? Icons.check_circle_outline
                    : Icons.radio_button_unchecked,
              ),
              title: Text(lesson.title),
              subtitle: Text(lesson.status.replaceAll('_', ' ')),
              trailing: canUpdate
                  ? PopupMenuButton<String>(
                      tooltip: 'Update lesson status',
                      onSelected: (status) =>
                          _updateStatus(context, ref, lesson, status),
                      itemBuilder: (_) => const [
                        PopupMenuItem(
                          value: 'in_progress',
                          child: Text('In progress'),
                        ),
                        PopupMenuItem(
                          value: 'completed',
                          child: Text('Completed'),
                        ),
                        PopupMenuItem(value: 'draft', child: Text('Draft')),
                      ],
                    )
                  : ErpStatusChip(lesson.status),
            ),
        ],
      ),
    );
  }
}
