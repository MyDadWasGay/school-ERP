import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:flutter/services.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../../shared/models/student_models.dart';
import '../../../shared/widgets/erp_states.dart';

class StudentOverviewScreen extends ConsumerWidget {
  const StudentOverviewScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final portal = ref.watch(portalProvider).valueOrNull;
    final selectedId = ref.watch(selectedStudentIdProvider);
    final overview = ref.watch(studentOverviewProvider);
    return DefaultTabController(
      length: 4,
      child: Column(
        children: [
          if (portal != null && portal.students.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(
                ErpSpacing.lg,
                ErpSpacing.sm,
                ErpSpacing.lg,
                ErpSpacing.md,
              ),
              child: DropdownButtonFormField<String>(
                initialValue:
                    portal.students.any((student) => student.id == selectedId)
                    ? selectedId
                    : portal.students.first.id,
                decoration: const InputDecoration(
                  labelText: 'Student',
                  prefixIcon: Icon(Icons.school_outlined),
                ),
                items: [
                  for (final student in portal.students)
                    DropdownMenuItem(
                      value: student.id,
                      child: Text(
                        '${student.name} · ${student.detail}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
                onChanged: (value) {
                  ref.read(selectedStudentIdProvider.notifier).state = value;
                  ref.invalidate(studentOverviewProvider);
                },
              ),
            ),
          const TabBar(
            tabs: [
              Tab(text: 'Attendance'),
              Tab(text: 'Results'),
              Tab(text: 'Fees'),
              Tab(text: 'Documents'),
            ],
          ),
          Expanded(
            child: overview.when(
              loading: () => const ErpLoadingList(),
              error: (error, stack) => ErpErrorState(
                error: error,
                onRetry: () => ref.invalidate(studentOverviewProvider),
              ),
              data: (data) => TabBarView(
                children: [
                  _AttendanceList(data.attendance),
                  _ResultsList(data.results),
                  _InvoiceList(data.invoices),
                  _DocumentsList(data.documents),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DocumentsList extends StatelessWidget {
  const _DocumentsList(this.rows);
  final List<DocumentRow>? rows;

  @override
  Widget build(BuildContext context) {
    if (rows == null) {
      return const ErpEmptyState(
        icon: Icons.lock_outline,
        title: 'Documents are not available',
        message: 'Your account does not have access to student documents.',
      );
    }
    if (rows!.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.folder_open_outlined,
        title: 'No documents',
        message: 'Student documents will appear here when they are uploaded.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(ErpSpacing.lg),
      itemCount: rows!.length,
      separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
      itemBuilder: (context, index) {
        final row = rows![index];
        return Card(
          child: ListTile(
            leading: const Icon(Icons.description_outlined),
            title: Text(row.originalFilename ?? row.category),
            subtitle: Text(
              '${row.category.replaceAll('_', ' ')} · ${DateFormat('d MMM yyyy').format(row.createdAt.toLocal())}',
            ),
            trailing: IconButton(
              tooltip: 'Copy secure document link',
              icon: const Icon(Icons.link_outlined),
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: row.secureUrl));
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Document link copied.')),
                  );
                }
              },
            ),
          ),
        );
      },
    );
  }
}

class _AttendanceList extends StatelessWidget {
  const _AttendanceList(this.data);
  final PagedRows<AttendanceRow>? data;
  @override
  Widget build(BuildContext context) {
    final rows = data?.rows ?? const <AttendanceRow>[];
    if (data == null) {
      return const ErpEmptyState(
        icon: Icons.lock_outline,
        title: 'Attendance is not available',
        message: 'Your account does not have access to student attendance.',
      );
    }
    if (rows.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.event_available_outlined,
        title: 'No attendance recorded',
        message: 'Attendance entries will appear here after they are marked.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(ErpSpacing.lg),
      itemCount: rows.length,
      separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
      itemBuilder: (context, index) {
        final row = rows[index];
        return Card(
          child: ListTile(
            leading: const Icon(Icons.calendar_today_outlined),
            title: Text(DateFormat('EEE, d MMM yyyy').format(row.date)),
            subtitle: Text(
              row.note == null ? row.period : '${row.period} · ${row.note}',
            ),
            trailing: ErpStatusChip(row.state),
          ),
        );
      },
    );
  }
}

class _ResultsList extends StatelessWidget {
  const _ResultsList(this.data);
  final PagedRows<ResultRow>? data;
  @override
  Widget build(BuildContext context) {
    final rows = data?.rows ?? const <ResultRow>[];
    if (data == null) {
      return const ErpEmptyState(
        icon: Icons.lock_outline,
        title: 'Results are not available',
        message: 'Your account does not have access to published results.',
      );
    }
    if (rows.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.workspace_premium_outlined,
        title: 'No published results',
        message: 'Published exam results will appear here.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(ErpSpacing.lg),
      itemCount: rows.length,
      separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
      itemBuilder: (context, index) {
        final row = rows[index];
        final score = row.marks == null
            ? 'Absent'
            : '${row.marks} / ${row.maximumMarks}';
        return Card(
          child: ListTile(
            leading: CircleAvatar(child: Text(row.marks?.toString() ?? '—')),
            title: Text(row.subjectName),
            subtitle: Text(row.examName),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(score, style: Theme.of(context).textTheme.titleSmall),
                Text(row.state, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _InvoiceList extends StatelessWidget {
  const _InvoiceList(this.data);
  final PagedRows<InvoiceRow>? data;
  @override
  Widget build(BuildContext context) {
    final rows = data?.rows ?? const <InvoiceRow>[];
    if (data == null) {
      return const ErpEmptyState(
        icon: Icons.lock_outline,
        title: 'Fees are not available',
        message: 'Your account does not have access to fee information.',
      );
    }
    if (rows.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.receipt_long_outlined,
        title: 'No fee invoices',
        message: 'Fee invoices will appear here when issued.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(ErpSpacing.lg),
      itemCount: rows.length,
      separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
      itemBuilder: (context, index) {
        final row = rows[index];
        final amount = NumberFormat.simpleCurrency(
          name: row.currency,
        ).format(row.balanceMinor / 100);
        return Card(
          child: ListTile(
            leading: const Icon(Icons.receipt_long_outlined),
            title: Text(row.invoiceNumber),
            subtitle: Text('Due ${DateFormat('d MMM yyyy').format(row.dueOn)}'),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(amount, style: Theme.of(context).textTheme.titleSmall),
                Text(
                  row.status.replaceAll('_', ' '),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
