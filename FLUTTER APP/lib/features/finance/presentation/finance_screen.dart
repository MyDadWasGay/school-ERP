import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/workspace_models.dart';
import '../../../shared/models/finance_models.dart';
import '../../../shared/widgets/erp_states.dart';
import 'finance_extended_workspace.dart';

class FinanceScreen extends ConsumerStatefulWidget {
  const FinanceScreen({super.key});

  @override
  ConsumerState<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends ConsumerState<FinanceScreen> {
  Future<void> _refresh() async {
    final user = ref.read(sessionProvider).valueOrNull;
    final canReadFees = user?.can('fees:read') == true;
    final canReadAccounts = user?.can('accounts:read') == true;
    ref.invalidate(financeInvoicesProvider);
    ref.invalidate(paymentOptionsProvider);
    ref.invalidate(paymentsProvider);
    ref.invalidate(financeRefundOptionsProvider);
    ref.invalidate(financeAccountsProvider);
    ref.invalidate(financeExpensesProvider);
    ref.invalidate(financeLedgerProvider);
    ref.invalidate(financeDonationsProvider);
    ref.invalidate(feeConfigurationProvider);
    ref.invalidate(invoiceStudentOptionsProvider);
    await Future.wait([
      if (canReadFees) ref.read(financeInvoicesProvider.future),
      if (canReadFees) ref.read(paymentOptionsProvider.future),
      if (canReadFees) ref.read(paymentsProvider.future),
      if (canReadFees && user?.can('fees:refund') == true)
        ref.read(financeRefundOptionsProvider.future),
      if (canReadAccounts) ref.read(financeAccountsProvider.future),
      if (canReadAccounts) ref.read(financeExpensesProvider.future),
      if (canReadAccounts) ref.read(financeLedgerProvider.future),
      if (canReadAccounts) ref.read(financeDonationsProvider.future),
      if (canReadFees) ref.read(feeConfigurationProvider.future),
    ]);
  }

  Future<void> _recordPayment() async {
    List<PaymentOption> options;
    try {
      options = await ref.read(paymentOptionsProvider.future);
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
      return;
    }
    if (!mounted) return;
    if (options.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('There are no outstanding invoices to collect.'),
        ),
      );
      return;
    }
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _PaymentForm(options: options),
    );
    if (created == true) await _refresh();
  }

  Future<void> _createInvoice() async {
    List<FinanceInvoiceStudentOption> students;
    try {
      students = await ref.read(invoiceStudentOptionsProvider.future);
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
      return;
    }
    if (!mounted) return;
    if (students.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No active students are available to invoice.'),
        ),
      );
      return;
    }
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _InvoiceForm(students: students),
    );
    if (created == true) await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final canCollect =
        ref.watch(sessionProvider).valueOrNull?.can('fees:collect') == true;
    final canCreateInvoice =
        ref.watch(sessionProvider).valueOrNull?.can('fees:create') == true;
    final user = ref.watch(sessionProvider).valueOrNull;
    final canReadFees = user?.can('fees:read') == true;
    final canReadAccounts = user?.can('accounts:read') == true;
    final tabs = <Tab>[
      if (canReadFees) const Tab(text: 'Invoices'),
      if (canReadFees) const Tab(text: 'Payments'),
      if (canReadFees && user?.can('fees:refund') == true)
        const Tab(text: 'Refunds'),
      if (canReadAccounts) const Tab(text: 'Accounts'),
      if (canReadFees) const Tab(text: 'Fee setup'),
    ];
    final views = <Widget>[
      if (canReadFees)
        _InvoiceWorkspace(
          canCollect: canCollect,
          canCreateInvoice: canCreateInvoice,
          onCreateInvoice: _createInvoice,
          onRecordPayment: _recordPayment,
          onRefresh: _refresh,
        ),
      if (canReadFees) _PaymentHistory(onRefresh: _refresh),
      if (canReadFees && user?.can('fees:refund') == true)
        FinanceRefundsTab(onRefresh: _refresh),
      if (canReadAccounts) FinanceAccountsTab(onRefresh: _refresh),
      if (canReadFees) FeeSetupTab(onRefresh: _refresh),
    ];
    if (tabs.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.lock_outline,
        title: 'Finance is not available',
        message: 'Your account does not have fee or accounts access.',
      );
    }
    return DefaultTabController(
      length: tabs.length,
      child: Column(
        children: [
          TabBar(tabs: tabs, isScrollable: true),
          Expanded(child: TabBarView(children: views)),
        ],
      ),
    );
  }
}

class _InvoiceWorkspace extends ConsumerWidget {
  const _InvoiceWorkspace({
    required this.canCollect,
    required this.canCreateInvoice,
    required this.onCreateInvoice,
    required this.onRecordPayment,
    required this.onRefresh,
  });

  final bool canCollect;
  final bool canCreateInvoice;
  final VoidCallback onCreateInvoice;
  final VoidCallback onRecordPayment;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(financeInvoicesProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(financeInvoicesProvider),
      ),
      data: (page) {
        if (page.rows.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.receipt_long_outlined,
            title: 'No invoices',
            message: 'Fee invoices in your authorized scope will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount:
                page.rows.length + (canCollect || canCreateInvoice ? 1 : 0),
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              if ((canCollect || canCreateInvoice) && index == 0) {
                return Wrap(
                  spacing: ErpSpacing.sm,
                  runSpacing: ErpSpacing.sm,
                  children: [
                    if (canCollect)
                      FilledButton.icon(
                        onPressed: onRecordPayment,
                        icon: const Icon(Icons.payments_outlined),
                        label: const Text('Record a payment'),
                      ),
                    if (canCreateInvoice)
                      OutlinedButton.icon(
                        onPressed: onCreateInvoice,
                        icon: const Icon(Icons.add_card_outlined),
                        label: const Text('Create invoice'),
                      ),
                  ],
                );
              }
              final row = page
                  .rows[(canCollect || canCreateInvoice) ? index - 1 : index];
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(ErpSpacing.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              row.student,
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                          ErpStatusChip(row.status),
                        ],
                      ),
                      const SizedBox(height: ErpSpacing.xs),
                      Text(row.invoiceNumber),
                      const SizedBox(height: ErpSpacing.md),
                      Row(
                        children: [
                          Expanded(
                            child: _Amount(label: 'Total', value: row.total),
                          ),
                          Expanded(
                            child: _Amount(
                              label: 'Outstanding',
                              value: row.balance,
                            ),
                          ),
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
}

class _Amount extends StatelessWidget {
  const _Amount({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: Theme.of(context).textTheme.bodySmall),
      const SizedBox(height: ErpSpacing.xs),
      Text(value, style: Theme.of(context).textTheme.titleMedium),
    ],
  );
}

class _PaymentHistory extends ConsumerWidget {
  const _PaymentHistory({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(paymentsProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(paymentsProvider),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return const ErpEmptyState(
            icon: Icons.payments_outlined,
            title: 'No payments recorded',
            message: 'Receipts and payment status will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            itemCount: rows.length,
            separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
            itemBuilder: (context, index) {
              final row = rows[index];
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.receipt_long)),
                  title: Text(row.amount),
                  subtitle: Text(
                    '${row.receiptNumber} · ${row.method}\n${row.paidAt}',
                  ),
                  isThreeLine: true,
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

class _PaymentForm extends ConsumerStatefulWidget {
  const _PaymentForm({required this.options});
  final List<PaymentOption> options;

  @override
  ConsumerState<_PaymentForm> createState() => _PaymentFormState();
}

class _PaymentFormState extends ConsumerState<_PaymentForm> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  String? _invoiceId;
  String _method = 'cash';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _invoiceId = widget.options.first.id;
  }

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final option = widget.options.firstWhere((item) => item.id == _invoiceId);
    final parsed = double.parse(_amount.text.trim().replaceAll(',', ''));
    final amountMinor = (parsed * 100).round();
    setState(() => _saving = true);
    try {
      await ref
          .read(apiClientProvider)
          .recordPayment(
            invoiceId: option.id,
            studentId: option.studentId,
            amountMinor: amountMinor,
            method: _method,
            idempotencyKey: 'mobile-${DateTime.now().microsecondsSinceEpoch}',
          );
      if (mounted) Navigator.of(context).pop(true);
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final selected = widget.options.firstWhere((item) => item.id == _invoiceId);
    return Padding(
      padding: EdgeInsets.only(
        left: ErpSpacing.lg,
        right: ErpSpacing.lg,
        top: ErpSpacing.lg,
        bottom: MediaQuery.viewInsetsOf(context).bottom + ErpSpacing.lg,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Record payment',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: ErpSpacing.md),
              DropdownButtonFormField<String>(
                initialValue: _invoiceId,
                decoration: const InputDecoration(
                  labelText: 'Invoice',
                  prefixIcon: Icon(Icons.receipt_long_outlined),
                ),
                items: [
                  for (final option in widget.options)
                    DropdownMenuItem(
                      value: option.id,
                      child: Text(option.label),
                    ),
                ],
                onChanged: _saving
                    ? null
                    : (value) => setState(() => _invoiceId = value),
              ),
              const SizedBox(height: ErpSpacing.md),
              TextFormField(
                controller: _amount,
                enabled: !_saving,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'Amount in rupees',
                  prefixIcon: Icon(Icons.currency_rupee),
                ),
                validator: (value) {
                  final parsed = double.tryParse(
                    value?.trim().replaceAll(',', '') ?? '',
                  );
                  if (parsed == null || parsed <= 0) {
                    return 'Enter a valid amount.';
                  }
                  if ((parsed * 100).round() > selected.balanceMinor) {
                    return 'Amount cannot exceed the outstanding balance.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: ErpSpacing.md),
              DropdownButtonFormField<String>(
                initialValue: _method,
                decoration: const InputDecoration(
                  labelText: 'Payment method',
                  prefixIcon: Icon(Icons.account_balance_outlined),
                ),
                items: const [
                  DropdownMenuItem(value: 'cash', child: Text('Cash')),
                  DropdownMenuItem(value: 'cheque', child: Text('Cheque')),
                  DropdownMenuItem(value: 'card', child: Text('Card')),
                  DropdownMenuItem(value: 'upi', child: Text('UPI')),
                  DropdownMenuItem(
                    value: 'bank_transfer',
                    child: Text('Bank transfer'),
                  ),
                ],
                onChanged: _saving
                    ? null
                    : (value) => setState(() => _method = value ?? 'cash'),
              ),
              const SizedBox(height: ErpSpacing.lg),
              FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save_outlined),
                label: Text(_saving ? 'Saving…' : 'Save payment'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InvoiceForm extends ConsumerStatefulWidget {
  const _InvoiceForm({required this.students});
  final List<FinanceInvoiceStudentOption> students;

  @override
  ConsumerState<_InvoiceForm> createState() => _InvoiceFormState();
}

class _InvoiceFormState extends ConsumerState<_InvoiceForm> {
  final _formKey = GlobalKey<FormState>();
  final _description = TextEditingController();
  final _amount = TextEditingController();
  String? _studentId;
  DateTime _dueOn = DateTime.now().add(const Duration(days: 7));
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _studentId = widget.students.first.id;
  }

  @override
  void dispose() {
    _description.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _pickDueDate() async {
    final value = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 3650)),
      initialDate: _dueOn,
    );
    if (value != null && mounted) {
      setState(() => _dueOn = value);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() || _studentId == null) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(apiClientProvider)
          .createFeeInvoice(
            studentId: _studentId!,
            dueOn: _dueOn,
            description: _description.text.trim(),
            amountMinor: int.parse(_amount.text.trim()),
          );
      if (mounted) Navigator.pop(context, true);
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(
      left: ErpSpacing.lg,
      right: ErpSpacing.lg,
      top: ErpSpacing.lg,
      bottom: MediaQuery.viewInsetsOf(context).bottom + ErpSpacing.lg,
    ),
    child: Form(
      key: _formKey,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Create fee invoice',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: ErpSpacing.md),
            DropdownButtonFormField<String>(
              initialValue: _studentId,
              decoration: const InputDecoration(labelText: 'Student'),
              items: [
                for (final student in widget.students)
                  DropdownMenuItem(
                    value: student.id,
                    child: Text(student.name),
                  ),
              ],
              onChanged: _saving
                  ? null
                  : (value) => setState(() => _studentId = value),
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _description,
              enabled: !_saving,
              decoration: const InputDecoration(labelText: 'Description'),
              validator: (value) => value == null || value.trim().length < 2
                  ? 'Enter a description.'
                  : null,
            ),
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              controller: _amount,
              enabled: !_saving,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Amount in paise',
                prefixIcon: Icon(Icons.currency_rupee),
              ),
              validator: (value) {
                final amount = int.tryParse(value?.trim() ?? '');
                return amount == null || amount <= 0
                    ? 'Enter a positive whole amount in paise.'
                    : null;
              },
            ),
            const SizedBox(height: ErpSpacing.md),
            OutlinedButton.icon(
              onPressed: _saving ? null : _pickDueDate,
              icon: const Icon(Icons.event_outlined),
              label: Text('Due ${DateFormat('d MMM yyyy').format(_dueOn)}'),
            ),
            const SizedBox(height: ErpSpacing.lg),
            FilledButton.icon(
              onPressed: _saving ? null : _save,
              icon: _saving
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_outlined),
              label: Text(_saving ? 'Saving…' : 'Create invoice'),
            ),
          ],
        ),
      ),
    ),
  );
}
