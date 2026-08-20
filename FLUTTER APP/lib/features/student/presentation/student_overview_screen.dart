import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:flutter/services.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../../core/api/api_error.dart';
import '../../../shared/models/attendance_models.dart';
import '../../../shared/models/finance_models.dart';
import '../../../shared/models/identity_models.dart';
import '../../../shared/pdf/erp_pdf.dart';
import '../../../shared/models/student_models.dart';
import '../../../shared/widgets/erp_states.dart';

class StudentOverviewScreen extends ConsumerWidget {
  const StudentOverviewScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final portal = ref.watch(portalProvider).valueOrNull;
    final selectedId = ref.watch(selectedStudentIdProvider);
    final overview = ref.watch(studentOverviewProvider);
    final session = ref.watch(sessionProvider).valueOrNull;
    String? selectedStudentName;
    for (final student in portal?.students ?? const <PortalStudent>[]) {
      if (student.id == selectedId) {
        selectedStudentName = student.name;
      }
    }
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
              Tab(text: 'Discipline'),
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
                  _ResultsList(data.results, data.reportCards),
                  _InvoiceList(
                    data.invoices,
                    payments: data.payments,
                    studentId: selectedId,
                    studentName:
                        selectedStudentName ??
                        session?.displayName ??
                        'Student',
                    schoolName: session?.organization.name ?? 'School ERP',
                    canPayOnline:
                        ref
                            .watch(sessionProvider)
                            .valueOrNull
                            ?.can('fees:pay_online') ==
                        true,
                  ),
                  _DocumentsList(data.documents),
                  _DisciplineTimeline(data.discipline),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DisciplineTimeline extends StatelessWidget {
  const _DisciplineTimeline(this.rows);

  final List<DisciplineIncidentRow>? rows;

  @override
  Widget build(BuildContext context) {
    if (rows == null) {
      return const ErpEmptyState(
        icon: Icons.lock_outline,
        title: 'Discipline timeline is not available',
        message: 'Your account does not have access to this student timeline.',
      );
    }
    if (rows!.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.auto_awesome_outlined,
        title: 'No behavior records',
        message: 'Positive notes and school behavior records will appear here.',
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
            leading: CircleAvatar(
              child: Icon(
                row.severity.toLowerCase() == 'positive'
                    ? Icons.thumb_up_alt_outlined
                    : Icons.flag_outlined,
              ),
            ),
            title: Text(row.title),
            subtitle: Text(
              [
                row.occurredAt,
                if (row.details?.isNotEmpty == true) row.details!,
              ].join(' · '),
            ),
            isThreeLine: row.details?.isNotEmpty == true,
            trailing: ErpStatusChip(row.status),
          ),
        );
      },
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
            trailing: PopupMenuButton<String>(
              tooltip: 'Document actions',
              onSelected: (action) async {
                if (action == 'open') {
                  final launched = await launchUrl(
                    Uri.parse(row.secureUrl),
                    mode: LaunchMode.externalApplication,
                  );
                  if (!launched && context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Could not open the document.'),
                      ),
                    );
                  }
                } else {
                  await Clipboard.setData(ClipboardData(text: row.secureUrl));
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Document link copied.')),
                    );
                  }
                }
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'open', child: Text('Open document')),
                PopupMenuItem(value: 'copy', child: Text('Copy secure link')),
              ],
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
  const _ResultsList(this.data, this.reportCards);
  final PagedRows<ResultRow>? data;
  final List<StudentReportCardRow>? reportCards;
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
    final cards = reportCards ?? const <StudentReportCardRow>[];
    if (rows.isEmpty && cards.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.workspace_premium_outlined,
        title: 'No published results',
        message: 'Published exam results will appear here.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(ErpSpacing.lg),
      itemCount: cards.length + rows.length,
      separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
      itemBuilder: (context, index) {
        if (index < cards.length) {
          return _ReportCardTile(cards[index]);
        }
        final row = rows[index - cards.length];
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

class _ReportCardTile extends StatelessWidget {
  const _ReportCardTile(this.row);
  final StudentReportCardRow row;

  @override
  Widget build(BuildContext context) {
    final score = row.total == null || row.maximum == null
        ? 'Score unavailable'
        : '${row.total} / ${row.maximum}';
    final percentage = row.percentage == null
        ? null
        : '${row.percentage!.toStringAsFixed(1)}%';
    return Card(
      child: ExpansionTile(
        leading: const CircleAvatar(child: Icon(Icons.assessment_outlined)),
        title: Text(row.exam),
        subtitle: Text(
          '$score${percentage == null ? '' : ' Â· $percentage'} Â· Published ${DateFormat('d MMM yyyy').format(row.generatedAt.toLocal())}',
        ),
        children: [
          for (final subject in row.subjects)
            ListTile(
              dense: true,
              title: Text(subject.subjectName),
              trailing: Text(subject.marks?.toString() ?? 'Absent'),
            ),
        ],
      ),
    );
  }
}

class _InvoiceList extends ConsumerStatefulWidget {
  const _InvoiceList(
    this.data, {
    required this.payments,
    required this.studentId,
    required this.studentName,
    required this.schoolName,
    required this.canPayOnline,
  });
  final PagedRows<InvoiceRow>? data;
  final PagedRows<StudentPaymentRow>? payments;
  final String? studentId;
  final String studentName;
  final String schoolName;
  final bool canPayOnline;

  @override
  ConsumerState<_InvoiceList> createState() => _InvoiceListState();
}

class _InvoiceListState extends ConsumerState<_InvoiceList> {
  late final Razorpay _razorpay;
  String? _activeOrderId;
  var _paymentStatus = RazorpayPaymentStatus.idle;
  bool _verificationInFlight = false;

  bool get _paying =>
      _paymentStatus == RazorpayPaymentStatus.starting ||
      _paymentStatus == RazorpayPaymentStatus.processing;

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay()
      ..on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess)
      ..on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError)
      ..on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
  }

  @override
  void dispose() {
    _razorpay.clear();
    super.dispose();
  }

  Future<void> _pay(InvoiceRow invoice) async {
    final studentId = widget.studentId;
    if (_paying || studentId == null || invoice.balanceMinor <= 0) return;
    setState(() => _paymentStatus = RazorpayPaymentStatus.starting);
    try {
      final order = await ref
          .read(apiClientProvider)
          .createRazorpayOrder(
            invoiceId: invoice.id,
            studentId: studentId,
            amountMinor: invoice.balanceMinor,
            idempotencyKey:
                'mobile-razorpay-${invoice.id}-${DateTime.now().microsecondsSinceEpoch}',
          );
      if (!mounted) return;
      _activeOrderId = order.orderId;
      setState(() => _paymentStatus = RazorpayPaymentStatus.processing);
      _razorpay.open({
        'key': order.keyId,
        'amount': order.amountMinor,
        'currency': order.currency,
        'name': order.name,
        'description': order.description,
        'order_id': order.orderId,
        'timeout': 600,
        'prefill': {
          if (order.prefillName != null) 'name': order.prefillName,
          if (order.prefillEmail != null) 'email': order.prefillEmail,
          if (order.prefillContact != null) 'contact': order.prefillContact,
        },
      });
    } on Object catch (error) {
      _finishWithMessage(readableApiError(error));
    }
  }

  Future<void> _handlePaymentSuccess(PaymentSuccessResponse response) async {
    if (!_paying || _verificationInFlight) return;
    final orderId = response.orderId ?? _activeOrderId;
    final paymentId = response.paymentId;
    final signature = response.signature;
    if (orderId == null || paymentId == null || signature == null) {
      _finishWithMessage(
        'Razorpay returned an incomplete payment response. Refresh the fee page to check the status.',
        status: RazorpayPaymentStatus.unknown,
      );
      return;
    }
    if (_activeOrderId != null &&
        response.orderId != null &&
        response.orderId != _activeOrderId) {
      _finishWithMessage(
        'Razorpay returned a response for a different order. Refresh the fee page to check the status.',
        status: RazorpayPaymentStatus.unknown,
      );
      return;
    }
    _verificationInFlight = true;
    try {
      final result = await ref
          .read(apiClientProvider)
          .verifyRazorpayPayment(
            orderId: orderId,
            paymentId: paymentId,
            signature: signature,
          );
      if (!mounted) return;
      setState(() => _paymentStatus = RazorpayPaymentStatus.success);
      ref.invalidate(studentOverviewProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Payment successful. Receipt ${result.receiptNumber} recorded.',
          ),
        ),
      );
    } on Object catch (error) {
      _finishWithMessage(
        '${readableApiError(error)} The provider webhook will reconcile captured funds; refresh before trying again.',
        status: RazorpayPaymentStatus.unknown,
      );
    } finally {
      _verificationInFlight = false;
      if (mounted) {
        setState(() {
          _activeOrderId = null;
        });
      }
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    if (!_paying) return;
    _finishWithMessage(
      response.message ?? 'Razorpay payment was not completed.',
      status: response.code == Razorpay.PAYMENT_CANCELLED
          ? RazorpayPaymentStatus.cancelled
          : RazorpayPaymentStatus.failed,
    );
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    if (!_paying) return;
    _finishWithMessage(
      response.walletName == null
          ? 'External wallet selected. Complete the payment in Razorpay.'
          : 'External wallet selected: ${response.walletName}.',
      status: RazorpayPaymentStatus.unknown,
    );
  }

  void _finishWithMessage(
    String message, {
    RazorpayPaymentStatus status = RazorpayPaymentStatus.failed,
  }) {
    if (!mounted) return;
    setState(() {
      _paymentStatus = status;
      _activeOrderId = null;
    });
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final rows = widget.data?.rows ?? const <InvoiceRow>[];
    final paymentRows = widget.payments?.rows ?? const <StudentPaymentRow>[];
    if (widget.data == null) {
      return const ErpEmptyState(
        icon: Icons.lock_outline,
        title: 'Fees are not available',
        message: 'Your account does not have access to fee information.',
      );
    }
    if (rows.isEmpty && paymentRows.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.receipt_long_outlined,
        title: 'No fee invoices',
        message: 'Fee invoices will appear here when issued.',
      );
    }
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(ErpSpacing.lg),
      children: [
        for (final row in rows) ...[
          _invoiceCard(context, row),
          const SizedBox(height: ErpSpacing.sm),
        ],
        if (paymentRows.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(
              top: ErpSpacing.md,
              bottom: ErpSpacing.sm,
            ),
            child: Text(
              'Payment history',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          for (final payment in paymentRows) ...[
            _paymentCard(context, payment),
            const SizedBox(height: ErpSpacing.sm),
          ],
        ],
      ],
    );
  }

  Widget _invoiceCard(BuildContext context, InvoiceRow row) {
    final amount = NumberFormat.simpleCurrency(
      name: row.currency,
    ).format(row.balanceMinor / 100);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(ErpSpacing.sm),
        child: ListTile(
          leading: const Icon(Icons.receipt_long_outlined),
          title: Text(row.invoiceNumber),
          subtitle: Text('Due ${DateFormat('d MMM yyyy').format(row.dueOn)}'),
          trailing: widget.canPayOnline && row.balanceMinor > 0
              ? FilledButton(
                  onPressed: _paying ? null : () => _pay(row),
                  child: Text(_paying ? '...' : 'Pay'),
                )
              : Column(
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
      ),
    );
  }

  Widget _paymentCard(BuildContext context, StudentPaymentRow payment) {
    return Card(
      child: ListTile(
        leading: const CircleAvatar(child: Icon(Icons.verified_outlined)),
        title: Text(payment.receiptNumber),
        subtitle: Text(
          '${payment.invoiceNumber} Â· ${payment.method.replaceAll('_', ' ')} Â· ${DateFormat('d MMM yyyy, h:mm a').format(payment.paidAt.toLocal())}',
        ),
        trailing: PopupMenuButton<String>(
          tooltip: 'Receipt actions',
          onSelected: (action) async {
            if (action != 'share') return;
            try {
              await shareErpPdf(
                bytes: await ErpPdfBuilder.feeReceipt(
                  schoolName: widget.schoolName,
                  studentName: widget.studentName,
                  payment: payment,
                ),
                filename: 'fee-receipt-${payment.receiptNumber}.pdf',
                title: 'Fee receipt ${payment.receiptNumber}',
              );
            } on Object catch (error) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(readableApiError(error))),
                );
              }
            }
          },
          itemBuilder: (_) => const [
            PopupMenuItem(value: 'share', child: Text('Share receipt')),
          ],
        ),
      ),
    );
  }
}
