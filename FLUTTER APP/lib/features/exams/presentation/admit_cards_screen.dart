import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/exam_models.dart';
import '../../../shared/pdf/erp_pdf.dart';
import '../../../shared/widgets/erp_states.dart';

class AdmitCardsScreen extends ConsumerWidget {
  const AdmitCardsScreen({super.key});

  Future<void> _share(
    BuildContext context,
    WidgetRef ref,
    AdmitCard card,
  ) async {
    try {
      await shareErpPdf(
        bytes: await ErpPdfBuilder.admitCard(
          schoolName:
              ref.read(sessionProvider).valueOrNull?.organization.name ??
              'School ERP',
          card: card,
        ),
        filename: 'admit-card-${card.examId}.pdf',
        title: '${card.examName} admit card',
      );
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    }
  }

  Future<void> _print(
    BuildContext context,
    WidgetRef ref,
    AdmitCard card,
  ) async {
    try {
      final printed = await printErpPdf(
        bytes: await ErpPdfBuilder.admitCard(
          schoolName:
              ref.read(sessionProvider).valueOrNull?.organization.name ??
              'School ERP',
          card: card,
        ),
        filename: 'admit-card-${card.examId}.pdf',
      );
      if (context.mounted && !printed) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Printing was cancelled.')),
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
    final value = ref.watch(admitCardsProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(admitCardsProvider),
      ),
      data: (cards) {
        if (cards.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.confirmation_number_outlined,
            title: 'No admit cards available',
            message:
                'Published examination schedules and active enrollment are required before an admit card can be generated.',
          );
        }
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(admitCardsProvider);
            await ref.read(admitCardsProvider.future);
          },
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: cards.length,
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) => Card(
              child: ExpansionTile(
                leading: const CircleAvatar(
                  child: Icon(Icons.confirmation_number_outlined),
                ),
                title: Text(cards[index].examName),
                subtitle: Text(
                  _dateRange(cards[index].startsOn, cards[index].endsOn),
                ),
                childrenPadding: const EdgeInsets.fromLTRB(
                  ErpSpacing.lg,
                  0,
                  ErpSpacing.lg,
                  ErpSpacing.md,
                ),
                children: [
                  _studentSummary(cards[index].student),
                  const SizedBox(height: ErpSpacing.sm),
                  for (final subject in cards[index].subjects)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.event_note_outlined),
                      title: Text(subject.subjectName),
                      subtitle: Text(
                        '${DateFormat('d MMM yyyy, h:mm a').format(subject.startsAt.toLocal())} - ${DateFormat('h:mm a').format(subject.endsAt.toLocal())}\nRoom: ${subject.roomId ?? 'To be assigned'}',
                      ),
                      isThreeLine: true,
                    ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      IconButton(
                        tooltip: 'Print admit card',
                        onPressed: () => _print(context, ref, cards[index]),
                        icon: const Icon(Icons.print_outlined),
                      ),
                      FilledButton.tonalIcon(
                        onPressed: () => _share(context, ref, cards[index]),
                        icon: const Icon(Icons.share_outlined),
                        label: const Text('Share PDF'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _studentSummary(AdmitCardStudent student) => ListTile(
    contentPadding: EdgeInsets.zero,
    leading: const Icon(Icons.school_outlined),
    title: Text(student.name),
    subtitle: Text(
      '${student.className} ${student.sectionName} · Admission ${student.admissionNumber}${student.rollNumber == null ? '' : ' · Roll ${student.rollNumber}'}',
    ),
  );

  String _dateRange(DateTime? startsOn, DateTime? endsOn) {
    if (startsOn == null) return 'Date to be announced';
    final start = DateFormat('d MMM yyyy').format(startsOn.toLocal());
    if (endsOn == null || DateUtils.isSameDay(startsOn, endsOn)) return start;
    return '$start - ${DateFormat('d MMM yyyy').format(endsOn.toLocal())}';
  }
}
