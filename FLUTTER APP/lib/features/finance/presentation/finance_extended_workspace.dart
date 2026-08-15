import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/finance_models.dart';
import '../../../shared/widgets/erp_states.dart';

class FinanceRefundsTab extends ConsumerStatefulWidget {
  const FinanceRefundsTab({super.key, required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  ConsumerState<FinanceRefundsTab> createState() => _FinanceRefundsTabState();
}

class _FinanceRefundsTabState extends ConsumerState<FinanceRefundsTab> {
  Future<void> _refund(FinanceRefundOption option) async {
    final values = await showModalBottomSheet<_RefundValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _RefundSheet(option: option),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .refundPayment(
            paymentId: option.id,
            amountMinor: values.amountMinor,
            reason: values.reason,
            idempotencyKey:
                'mobile-refund-${DateTime.now().microsecondsSinceEpoch}',
          );
      await widget.onRefresh();
      if (mounted) _show('Refund submitted.');
    } on Object catch (error) {
      if (mounted) _show(readableApiError(error));
    }
  }

  void _show(String message) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(message)));

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(financeRefundOptionsProvider);
    final canRefund =
        ref.watch(sessionProvider).valueOrNull?.can('fees:refund') == true;
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(financeRefundOptionsProvider),
      ),
      data: (rows) => rows.isEmpty
          ? const ErpEmptyState(
              icon: Icons.assignment_return_outlined,
              title: 'No refundable payments',
              message:
                  'Payments with remaining refundable balance appear here.',
            )
          : RefreshIndicator(
              onRefresh: widget.onRefresh,
              child: ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(ErpSpacing.lg),
                itemCount: rows.length,
                separatorBuilder: (_, _) =>
                    const SizedBox(height: ErpSpacing.sm),
                itemBuilder: (context, index) {
                  final row = rows[index];
                  return Card(
                    child: ListTile(
                      leading: const CircleAvatar(
                        child: Icon(Icons.assignment_return_outlined),
                      ),
                      title: Text(row.label),
                      subtitle: Text('Remaining ${_money(row.remainingMinor)}'),
                      trailing: canRefund
                          ? FilledButton.tonal(
                              onPressed: () => _refund(row),
                              child: const Text('Refund'),
                            )
                          : null,
                    ),
                  );
                },
              ),
            ),
    );
  }
}

class FinanceAccountsTab extends ConsumerStatefulWidget {
  const FinanceAccountsTab({super.key, required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  ConsumerState<FinanceAccountsTab> createState() => _FinanceAccountsTabState();
}

class _FinanceAccountsTabState extends ConsumerState<FinanceAccountsTab> {
  Future<void> _createAccount() async {
    final values = await showModalBottomSheet<_AccountValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _AccountSheet(),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createFinanceAccount(
            code: values.code,
            name: values.name,
            accountType: values.accountType,
            parentId: values.parentId,
          );
      await widget.onRefresh();
      if (mounted) _show('Account created.');
    } on Object catch (error) {
      if (mounted) _show(readableApiError(error));
    }
  }

  Future<void> _createExpense(List<FinanceAccountRow> accounts) async {
    if (accounts.isEmpty) {
      _show('Create an account before recording an expense.');
      return;
    }
    final values = await showModalBottomSheet<_ExpenseValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _ExpenseSheet(accounts: accounts),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createFinanceExpense(
            accountId: values.accountId,
            description: values.description,
            amountMinor: values.amountMinor,
            incurredOn: values.incurredOn,
          );
      await widget.onRefresh();
      if (mounted) _show('Expense recorded.');
    } on Object catch (error) {
      if (mounted) _show(readableApiError(error));
    }
  }

  Future<void> _createDonation() async {
    final values = await showModalBottomSheet<_DonationValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _DonationSheet(),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createFinanceDonation(
            donorName: values.donorName,
            donorEmail: values.donorEmail,
            amountMinor: values.amountMinor,
            purpose: values.purpose,
            paymentReference: values.paymentReference,
            receivedAt: values.receivedAt,
          );
      await widget.onRefresh();
      if (mounted) _show('Donation recorded.');
    } on Object catch (error) {
      if (mounted) _show(readableApiError(error));
    }
  }

  void _show(String message) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(message)));

  @override
  Widget build(BuildContext context) {
    final canCreate =
        ref.watch(sessionProvider).valueOrNull?.can('accounts:create') == true;
    return DefaultTabController(
      length: 4,
      child: Column(
        children: [
          const TabBar(
            tabs: [
              Tab(text: 'Accounts'),
              Tab(text: 'Expenses'),
              Tab(text: 'Ledger'),
              Tab(text: 'Donations'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _AccountsList(
                  onRefresh: widget.onRefresh,
                  canCreate: canCreate,
                  onCreate: _createAccount,
                ),
                _ExpensesList(
                  onRefresh: widget.onRefresh,
                  canCreate: canCreate,
                  onCreate: _createExpense,
                ),
                _LedgerList(onRefresh: widget.onRefresh),
                _DonationsList(
                  onRefresh: widget.onRefresh,
                  canCreate: canCreate,
                  onCreate: _createDonation,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class FeeSetupTab extends ConsumerStatefulWidget {
  const FeeSetupTab({super.key, required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  ConsumerState<FeeSetupTab> createState() => _FeeSetupTabState();
}

class _FeeSetupTabState extends ConsumerState<FeeSetupTab> {
  Future<void> _createHead() async {
    final values = await showModalBottomSheet<_HeadValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _HeadSheet(),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createFeeHead(name: values.name, code: values.code);
      await widget.onRefresh();
      if (mounted) _show('Fee head created.');
    } on Object catch (error) {
      if (mounted) _show(readableApiError(error));
    }
  }

  Future<void> _createStructure(FinanceConfiguration config) async {
    if (config.years.isEmpty) {
      _show(
        'Create an academic year in the web administration workspace first.',
      );
      return;
    }
    final values = await showModalBottomSheet<_StructureValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _StructureSheet(config: config),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createFeeStructure(
            academicYearId: values.academicYearId,
            classId: values.classId,
            name: values.name,
            effectiveFrom: values.effectiveFrom,
          );
      await widget.onRefresh();
      if (mounted) _show('Fee structure created.');
    } on Object catch (error) {
      if (mounted) _show(readableApiError(error));
    }
  }

  Future<void> _createInstallment(FinanceConfiguration config) async {
    if (config.structures.isEmpty || config.heads.isEmpty) {
      _show('Create a fee structure and fee head before adding installments.');
      return;
    }
    final values = await showModalBottomSheet<_InstallmentValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _InstallmentSheet(config: config),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createFeeInstallment(
            feeStructureId: values.feeStructureId,
            feeHeadId: values.feeHeadId,
            name: values.name,
            amountMinor: values.amountMinor,
            dueOn: values.dueOn,
          );
      await widget.onRefresh();
      if (mounted) _show('Fee installment created.');
    } on Object catch (error) {
      if (mounted) _show(readableApiError(error));
    }
  }

  void _show(String message) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(message)));

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(feeConfigurationProvider);
    final canCreate =
        ref.watch(sessionProvider).valueOrNull?.can('fees:create') == true;
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(feeConfigurationProvider),
      ),
      data: (config) {
        if (config == null) {
          return const ErpEmptyState(
            icon: Icons.lock_outline,
            title: 'Fee setup is unavailable',
            message: 'Your account cannot view fee configuration.',
          );
        }
        return DefaultTabController(
          length: 3,
          child: Column(
            children: [
              const TabBar(
                tabs: [
                  Tab(text: 'Heads'),
                  Tab(text: 'Structures'),
                  Tab(text: 'Installments'),
                ],
              ),
              Expanded(
                child: TabBarView(
                  children: [
                    _FeeHeadsList(
                      config: config,
                      canCreate: canCreate,
                      onCreate: _createHead,
                      onRefresh: widget.onRefresh,
                    ),
                    _FeeStructuresList(
                      config: config,
                      canCreate: canCreate,
                      onCreate: () => _createStructure(config),
                      onRefresh: widget.onRefresh,
                    ),
                    _FeeInstallmentsList(
                      config: config,
                      canCreate: canCreate,
                      onCreate: () => _createInstallment(config),
                      onRefresh: widget.onRefresh,
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _AccountsList extends ConsumerWidget {
  const _AccountsList({
    required this.onRefresh,
    required this.canCreate,
    required this.onCreate,
  });
  final Future<void> Function() onRefresh;
  final bool canCreate;
  final VoidCallback onCreate;
  @override
  Widget build(BuildContext context, WidgetRef ref) => _Rows<FinanceAccountRow>(
    value: ref.watch(financeAccountsProvider),
    onRefresh: onRefresh,
    emptyIcon: Icons.account_tree_outlined,
    emptyTitle: 'No accounts',
    emptyMessage: 'Chart of accounts entries appear here.',
    header: canCreate
        ? FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add),
            label: const Text('Add account'),
          )
        : null,
    itemBuilder: (row) => ListTile(
      leading: const CircleAvatar(child: Icon(Icons.account_tree_outlined)),
      title: Text('${row.code} Â· ${row.name}'),
      subtitle: Text(row.accountType),
      trailing: ErpStatusChip(row.status),
    ),
  );
}

class _ExpensesList extends ConsumerWidget {
  const _ExpensesList({
    required this.onRefresh,
    required this.canCreate,
    required this.onCreate,
  });
  final Future<void> Function() onRefresh;
  final bool canCreate;
  final void Function(List<FinanceAccountRow>) onCreate;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final accounts = ref.watch(financeAccountsProvider);
    final value = ref.watch(financeExpensesProvider);
    if (accounts.isLoading || value.isLoading) return const ErpLoadingList();
    if (value.hasError) {
      return ErpErrorState(error: value.error!, onRetry: onRefresh);
    }
    final rows = value.valueOrNull ?? const <FinanceExpenseRow>[];
    return _ListShell(
      onRefresh: onRefresh,
      header: canCreate
          ? FilledButton.icon(
              onPressed: () => onCreate(accounts.valueOrNull ?? const []),
              icon: const Icon(Icons.add),
              label: const Text('Record expense'),
            )
          : null,
      empty: const ErpEmptyState(
        icon: Icons.receipt_long_outlined,
        title: 'No expenses',
        message: 'Recorded expenses in your scope appear here.',
      ),
      children: [
        for (final row in rows)
          Card(
            child: ListTile(
              leading: const CircleAvatar(
                child: Icon(Icons.receipt_long_outlined),
              ),
              title: Text(row.description),
              subtitle: Text(
                '${_money(row.amountMinor)} Â· Account ${row.accountId}',
              ),
              trailing: ErpStatusChip(row.status),
            ),
          ),
      ],
    );
  }
}

class _LedgerList extends ConsumerWidget {
  const _LedgerList({required this.onRefresh});
  final Future<void> Function() onRefresh;
  @override
  Widget build(BuildContext context, WidgetRef ref) => _Rows<FinanceLedgerRow>(
    value: ref.watch(financeLedgerProvider),
    onRefresh: onRefresh,
    emptyIcon: Icons.account_balance_outlined,
    emptyTitle: 'No ledger entries',
    emptyMessage: 'Posted financial entries appear here.',
    itemBuilder: (row) => ListTile(
      leading: const CircleAvatar(child: Icon(Icons.account_balance_outlined)),
      title: Text(row.account),
      subtitle: Text(
        '${row.referenceType} Â· ${DateFormat('d MMM yyyy, h:mm a').format(row.postedAt.toLocal())}',
      ),
      trailing: Text(
        'Dr ${_money(row.debitMinor)}\nCr ${_money(row.creditMinor)}',
        textAlign: TextAlign.end,
      ),
    ),
  );
}

class _DonationsList extends ConsumerWidget {
  const _DonationsList({
    required this.onRefresh,
    required this.canCreate,
    required this.onCreate,
  });
  final Future<void> Function() onRefresh;
  final bool canCreate;
  final VoidCallback onCreate;
  @override
  Widget build(
    BuildContext context,
    WidgetRef ref,
  ) => _Rows<FinanceDonationRow>(
    value: ref.watch(financeDonationsProvider),
    onRefresh: onRefresh,
    emptyIcon: Icons.volunteer_activism_outlined,
    emptyTitle: 'No donations',
    emptyMessage: 'Recorded donations appear here.',
    header: canCreate
        ? FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add),
            label: const Text('Record donation'),
          )
        : null,
    itemBuilder: (row) => ListTile(
      leading: const CircleAvatar(
        child: Icon(Icons.volunteer_activism_outlined),
      ),
      title: Text(row.donorName),
      subtitle: Text(
        '${row.purpose}\n${DateFormat('d MMM yyyy').format(row.receivedAt.toLocal())}',
      ),
      isThreeLine: true,
      trailing: Text(_money(row.amountMinor)),
    ),
  );
}

class _FeeHeadsList extends StatelessWidget {
  const _FeeHeadsList({
    required this.config,
    required this.canCreate,
    required this.onCreate,
    required this.onRefresh,
  });
  final FinanceConfiguration config;
  final bool canCreate;
  final VoidCallback onCreate;
  final Future<void> Function() onRefresh;
  @override
  Widget build(BuildContext context) => _ListShell(
    onRefresh: onRefresh,
    header: canCreate
        ? FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add),
            label: const Text('Add fee head'),
          )
        : null,
    empty: const ErpEmptyState(
      icon: Icons.category_outlined,
      title: 'No fee heads',
      message: 'Fee heads configured by finance appear here.',
    ),
    children: [
      for (final row in config.heads)
        Card(
          child: ListTile(
            leading: const CircleAvatar(child: Icon(Icons.category_outlined)),
            title: Text(row.name),
            subtitle: Text(row.code),
            trailing: ErpStatusChip(row.status),
          ),
        ),
    ],
  );
}

class _FeeStructuresList extends StatelessWidget {
  const _FeeStructuresList({
    required this.config,
    required this.canCreate,
    required this.onCreate,
    required this.onRefresh,
  });
  final FinanceConfiguration config;
  final bool canCreate;
  final VoidCallback onCreate;
  final Future<void> Function() onRefresh;
  @override
  Widget build(BuildContext context) => _ListShell(
    onRefresh: onRefresh,
    header: canCreate
        ? FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add),
            label: const Text('Add structure'),
          )
        : null,
    empty: const ErpEmptyState(
      icon: Icons.account_balance_wallet_outlined,
      title: 'No fee structures',
      message: 'Fee structures configured by finance appear here.',
    ),
    children: [
      for (final row in config.structures)
        Card(
          child: ListTile(
            leading: const CircleAvatar(
              child: Icon(Icons.account_balance_wallet_outlined),
            ),
            title: Text(row.name),
            subtitle: Text(
              'Effective ${DateFormat('d MMM yyyy').format(row.effectiveFrom.toLocal())}',
            ),
            trailing: ErpStatusChip(row.status),
          ),
        ),
    ],
  );
}

class _FeeInstallmentsList extends StatelessWidget {
  const _FeeInstallmentsList({
    required this.config,
    required this.canCreate,
    required this.onCreate,
    required this.onRefresh,
  });
  final FinanceConfiguration config;
  final bool canCreate;
  final VoidCallback onCreate;
  final Future<void> Function() onRefresh;
  @override
  Widget build(BuildContext context) => _ListShell(
    onRefresh: onRefresh,
    header: canCreate
        ? FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add),
            label: const Text('Add installment'),
          )
        : null,
    empty: const ErpEmptyState(
      icon: Icons.event_repeat_outlined,
      title: 'No installments',
      message: 'Fee installment schedules appear here.',
    ),
    children: [
      for (final row in config.installments)
        Card(
          child: ListTile(
            leading: const CircleAvatar(
              child: Icon(Icons.event_repeat_outlined),
            ),
            title: Text(row.name),
            subtitle: Text(
              '${_money(row.amountMinor)} Â· Due ${DateFormat('d MMM yyyy').format(row.dueOn.toLocal())}',
            ),
            trailing: ErpStatusChip(row.status),
          ),
        ),
    ],
  );
}

class _Rows<T> extends StatelessWidget {
  const _Rows({
    required this.value,
    required this.onRefresh,
    required this.emptyIcon,
    required this.emptyTitle,
    required this.emptyMessage,
    required this.itemBuilder,
    this.header,
  });
  final AsyncValue<List<T>> value;
  final Future<void> Function() onRefresh;
  final IconData emptyIcon;
  final String emptyTitle;
  final String emptyMessage;
  final Widget Function(T row) itemBuilder;
  final Widget? header;
  @override
  Widget build(BuildContext context) => value.when(
    loading: () => const ErpLoadingList(),
    error: (error, stack) => ErpErrorState(error: error, onRetry: onRefresh),
    data: (rows) => _ListShell(
      onRefresh: onRefresh,
      header: header,
      empty: ErpEmptyState(
        icon: emptyIcon,
        title: emptyTitle,
        message: emptyMessage,
      ),
      children: [for (final row in rows) Card(child: itemBuilder(row))],
    ),
  );
}

class _ListShell extends StatelessWidget {
  const _ListShell({
    required this.onRefresh,
    required this.empty,
    required this.children,
    this.header,
  });
  final Future<void> Function() onRefresh;
  final Widget empty;
  final List<Widget> children;
  final Widget? header;
  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: onRefresh,
    child: ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(ErpSpacing.lg),
      itemCount: children.isEmpty
          ? (header == null ? 1 : 2)
          : children.length + (header == null ? 0 : 1),
      separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
      itemBuilder: (context, index) {
        if (header != null && index == 0) return header!;
        if (children.isEmpty) return empty;
        return children[header == null ? index : index - 1];
      },
    ),
  );
}

class _RefundValues {
  const _RefundValues({required this.amountMinor, required this.reason});
  final int amountMinor;
  final String reason;
}

class _AccountValues {
  const _AccountValues({
    required this.code,
    required this.name,
    required this.accountType,
    this.parentId,
  });
  final String code;
  final String name;
  final String accountType;
  final String? parentId;
}

class _ExpenseValues {
  const _ExpenseValues({
    required this.accountId,
    required this.description,
    required this.amountMinor,
    required this.incurredOn,
  });
  final String accountId;
  final String description;
  final int amountMinor;
  final DateTime incurredOn;
}

class _DonationValues {
  const _DonationValues({
    required this.donorName,
    this.donorEmail,
    required this.amountMinor,
    required this.purpose,
    this.paymentReference,
    required this.receivedAt,
  });
  final String donorName;
  final String? donorEmail;
  final int amountMinor;
  final String purpose;
  final String? paymentReference;
  final DateTime receivedAt;
}

class _HeadValues {
  const _HeadValues({required this.name, required this.code});
  final String name;
  final String code;
}

class _StructureValues {
  const _StructureValues({
    required this.academicYearId,
    this.classId,
    required this.name,
    required this.effectiveFrom,
  });
  final String academicYearId;
  final String? classId;
  final String name;
  final DateTime effectiveFrom;
}

class _InstallmentValues {
  const _InstallmentValues({
    required this.feeStructureId,
    required this.feeHeadId,
    required this.name,
    required this.amountMinor,
    required this.dueOn,
  });
  final String feeStructureId;
  final String feeHeadId;
  final String name;
  final int amountMinor;
  final DateTime dueOn;
}

class _RefundSheet extends StatefulWidget {
  const _RefundSheet({required this.option});
  final FinanceRefundOption option;
  @override
  State<_RefundSheet> createState() => _RefundSheetState();
}

class _RefundSheetState extends State<_RefundSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _reason = TextEditingController();
  @override
  void dispose() {
    _amount.dispose();
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _Sheet(
    title: 'Refund payment',
    child: Form(
      key: _formKey,
      child: Column(
        children: [
          Text(
            'Maximum ${_money(widget.option.remainingMinor)}',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _amount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Amount in rupees'),
            validator: (value) {
              final parsed = double.tryParse(value?.trim() ?? '');
              if (parsed == null || parsed <= 0) return 'Enter a valid amount.';
              if ((parsed * 100).round() > widget.option.remainingMinor) {
                return 'Amount exceeds the refundable balance.';
              }
              return null;
            },
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _reason,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Reason'),
            validator: (value) => value == null || value.trim().length < 3
                ? 'Enter a reason.'
                : null,
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: () {
              if (!_formKey.currentState!.validate()) return;
              Navigator.pop(
                context,
                _RefundValues(
                  amountMinor: (double.parse(_amount.text.trim()) * 100)
                      .round(),
                  reason: _reason.text.trim(),
                ),
              );
            },
            child: const Text('Submit refund'),
          ),
        ],
      ),
    ),
  );
}

class _AccountSheet extends StatefulWidget {
  const _AccountSheet();
  @override
  State<_AccountSheet> createState() => _AccountSheetState();
}

class _AccountSheetState extends State<_AccountSheet> {
  final _code = TextEditingController();
  final _name = TextEditingController();
  final _parent = TextEditingController();
  String _type = 'expense';
  @override
  void dispose() {
    _code.dispose();
    _name.dispose();
    _parent.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _Sheet(
    title: 'Add account',
    child: Column(
      children: [
        TextField(
          controller: _code,
          decoration: const InputDecoration(labelText: 'Code'),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _name,
          decoration: const InputDecoration(labelText: 'Name'),
        ),
        const SizedBox(height: ErpSpacing.md),
        DropdownButtonFormField<String>(
          initialValue: _type,
          decoration: const InputDecoration(labelText: 'Account type'),
          items: const [
            DropdownMenuItem(value: 'asset', child: Text('Asset')),
            DropdownMenuItem(value: 'liability', child: Text('Liability')),
            DropdownMenuItem(value: 'income', child: Text('Income')),
            DropdownMenuItem(value: 'expense', child: Text('Expense')),
            DropdownMenuItem(value: 'equity', child: Text('Equity')),
          ],
          onChanged: (value) => setState(() => _type = value ?? 'expense'),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _parent,
          decoration: const InputDecoration(
            labelText: 'Parent account ID (optional)',
          ),
        ),
        const SizedBox(height: ErpSpacing.lg),
        FilledButton(
          onPressed: _code.text.trim().isEmpty || _name.text.trim().isEmpty
              ? null
              : () => Navigator.pop(
                  context,
                  _AccountValues(
                    code: _code.text.trim(),
                    name: _name.text.trim(),
                    accountType: _type,
                    parentId: _parent.text.trim().isEmpty
                        ? null
                        : _parent.text.trim(),
                  ),
                ),
          child: const Text('Create account'),
        ),
      ],
    ),
  );
}

class _ExpenseSheet extends StatefulWidget {
  const _ExpenseSheet({required this.accounts});
  final List<FinanceAccountRow> accounts;
  @override
  State<_ExpenseSheet> createState() => _ExpenseSheetState();
}

class _ExpenseSheetState extends State<_ExpenseSheet> {
  final _description = TextEditingController();
  final _amount = TextEditingController();
  String? _accountId;
  DateTime _date = DateTime.now();
  @override
  void initState() {
    super.initState();
    _accountId = widget.accounts.first.id;
  }

  @override
  void dispose() {
    _description.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final value = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 3650)),
      lastDate: DateTime.now(),
      initialDate: _date,
    );
    if (value != null && mounted) setState(() => _date = value);
  }

  @override
  Widget build(BuildContext context) => _Sheet(
    title: 'Record expense',
    child: Column(
      children: [
        DropdownButtonFormField<String>(
          initialValue: _accountId,
          decoration: const InputDecoration(labelText: 'Account'),
          items: [
            for (final row in widget.accounts)
              DropdownMenuItem(
                value: row.id,
                child: Text('${row.code} Â· ${row.name}'),
              ),
          ],
          onChanged: (value) => setState(() => _accountId = value),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _description,
          decoration: const InputDecoration(labelText: 'Description'),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _amount,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Amount in paise'),
        ),
        const SizedBox(height: ErpSpacing.md),
        OutlinedButton.icon(
          onPressed: _pickDate,
          icon: const Icon(Icons.calendar_today),
          label: Text(DateFormat('d MMM yyyy').format(_date)),
        ),
        const SizedBox(height: ErpSpacing.lg),
        FilledButton(
          onPressed:
              _accountId == null || int.tryParse(_amount.text.trim()) == null
              ? null
              : () => Navigator.pop(
                  context,
                  _ExpenseValues(
                    accountId: _accountId!,
                    description: _description.text.trim(),
                    amountMinor: int.parse(_amount.text.trim()),
                    incurredOn: _date,
                  ),
                ),
          child: const Text('Save expense'),
        ),
      ],
    ),
  );
}

class _DonationSheet extends StatefulWidget {
  const _DonationSheet();
  @override
  State<_DonationSheet> createState() => _DonationSheetState();
}

class _DonationSheetState extends State<_DonationSheet> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _amount = TextEditingController();
  final _purpose = TextEditingController();
  final _reference = TextEditingController();
  @override
  void dispose() {
    for (final c in [_name, _email, _amount, _purpose, _reference]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _Sheet(
    title: 'Record donation',
    child: Column(
      children: [
        TextField(
          controller: _name,
          decoration: const InputDecoration(labelText: 'Donor name'),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _email,
          decoration: const InputDecoration(labelText: 'Email (optional)'),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _amount,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Amount in paise'),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _purpose,
          decoration: const InputDecoration(labelText: 'Purpose'),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _reference,
          decoration: const InputDecoration(
            labelText: 'Payment reference (optional)',
          ),
        ),
        const SizedBox(height: ErpSpacing.lg),
        FilledButton(
          onPressed:
              _name.text.trim().isEmpty ||
                  _purpose.text.trim().isEmpty ||
                  int.tryParse(_amount.text.trim()) == null
              ? null
              : () => Navigator.pop(
                  context,
                  _DonationValues(
                    donorName: _name.text.trim(),
                    donorEmail: _email.text.trim().isEmpty
                        ? null
                        : _email.text.trim(),
                    amountMinor: int.parse(_amount.text.trim()),
                    purpose: _purpose.text.trim(),
                    paymentReference: _reference.text.trim().isEmpty
                        ? null
                        : _reference.text.trim(),
                    receivedAt: DateTime.now(),
                  ),
                ),
          child: const Text('Save donation'),
        ),
      ],
    ),
  );
}

class _HeadSheet extends StatefulWidget {
  const _HeadSheet();
  @override
  State<_HeadSheet> createState() => _HeadSheetState();
}

class _HeadSheetState extends State<_HeadSheet> {
  final _name = TextEditingController();
  final _code = TextEditingController();
  @override
  void dispose() {
    _name.dispose();
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _Sheet(
    title: 'Add fee head',
    child: Column(
      children: [
        TextField(
          controller: _name,
          decoration: const InputDecoration(labelText: 'Name'),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _code,
          decoration: const InputDecoration(labelText: 'Code'),
        ),
        const SizedBox(height: ErpSpacing.lg),
        FilledButton(
          onPressed: _name.text.trim().isEmpty || _code.text.trim().isEmpty
              ? null
              : () => Navigator.pop(
                  context,
                  _HeadValues(name: _name.text.trim(), code: _code.text.trim()),
                ),
          child: const Text('Create fee head'),
        ),
      ],
    ),
  );
}

class _StructureSheet extends StatefulWidget {
  const _StructureSheet({required this.config});
  final FinanceConfiguration config;
  @override
  State<_StructureSheet> createState() => _StructureSheetState();
}

class _StructureSheetState extends State<_StructureSheet> {
  final _name = TextEditingController();
  String? _yearId;
  String? _classId;
  DateTime _date = DateTime.now();
  @override
  void initState() {
    super.initState();
    _yearId = widget.config.years.first.id;
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final value = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 3650)),
      lastDate: DateTime.now().add(const Duration(days: 3650)),
      initialDate: _date,
    );
    if (value != null && mounted) setState(() => _date = value);
  }

  @override
  Widget build(BuildContext context) => _Sheet(
    title: 'Add fee structure',
    child: Column(
      children: [
        DropdownButtonFormField<String>(
          initialValue: _yearId,
          decoration: const InputDecoration(labelText: 'Academic year'),
          items: [
            for (final row in widget.config.years)
              DropdownMenuItem(value: row.id, child: Text(row.name)),
          ],
          onChanged: (value) => setState(() => _yearId = value),
        ),
        const SizedBox(height: ErpSpacing.md),
        DropdownButtonFormField<String?>(
          initialValue: _classId,
          decoration: const InputDecoration(labelText: 'Class (optional)'),
          items: [
            const DropdownMenuItem<String?>(
              value: null,
              child: Text('All classes'),
            ),
            for (final row in widget.config.classes)
              DropdownMenuItem<String?>(value: row.id, child: Text(row.name)),
          ],
          onChanged: (value) => setState(() => _classId = value),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _name,
          decoration: const InputDecoration(labelText: 'Structure name'),
        ),
        const SizedBox(height: ErpSpacing.md),
        OutlinedButton.icon(
          onPressed: _pickDate,
          icon: const Icon(Icons.calendar_today),
          label: Text('Effective ${DateFormat('d MMM yyyy').format(_date)}'),
        ),
        const SizedBox(height: ErpSpacing.lg),
        FilledButton(
          onPressed: _yearId == null || _name.text.trim().isEmpty
              ? null
              : () => Navigator.pop(
                  context,
                  _StructureValues(
                    academicYearId: _yearId!,
                    classId: _classId,
                    name: _name.text.trim(),
                    effectiveFrom: _date,
                  ),
                ),
          child: const Text('Create structure'),
        ),
      ],
    ),
  );
}

class _InstallmentSheet extends StatefulWidget {
  const _InstallmentSheet({required this.config});
  final FinanceConfiguration config;
  @override
  State<_InstallmentSheet> createState() => _InstallmentSheetState();
}

class _InstallmentSheetState extends State<_InstallmentSheet> {
  final _name = TextEditingController();
  final _amount = TextEditingController();
  String? _structureId;
  String? _headId;
  DateTime _date = DateTime.now();
  @override
  void initState() {
    super.initState();
    _structureId = widget.config.structures.first.id;
    _headId = widget.config.heads.first.id;
  }

  @override
  void dispose() {
    _name.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final value = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 3650)),
      initialDate: _date,
    );
    if (value != null && mounted) setState(() => _date = value);
  }

  @override
  Widget build(BuildContext context) => _Sheet(
    title: 'Add fee installment',
    child: Column(
      children: [
        DropdownButtonFormField<String>(
          initialValue: _structureId,
          decoration: const InputDecoration(labelText: 'Fee structure'),
          items: [
            for (final row in widget.config.structures)
              DropdownMenuItem(value: row.id, child: Text(row.name)),
          ],
          onChanged: (value) => setState(() => _structureId = value),
        ),
        const SizedBox(height: ErpSpacing.md),
        DropdownButtonFormField<String>(
          initialValue: _headId,
          decoration: const InputDecoration(labelText: 'Fee head'),
          items: [
            for (final row in widget.config.heads)
              DropdownMenuItem(value: row.id, child: Text(row.name)),
          ],
          onChanged: (value) => setState(() => _headId = value),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _name,
          decoration: const InputDecoration(labelText: 'Installment name'),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _amount,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Amount in paise'),
        ),
        const SizedBox(height: ErpSpacing.md),
        OutlinedButton.icon(
          onPressed: _pickDate,
          icon: const Icon(Icons.calendar_today),
          label: Text('Due ${DateFormat('d MMM yyyy').format(_date)}'),
        ),
        const SizedBox(height: ErpSpacing.lg),
        FilledButton(
          onPressed:
              _structureId == null ||
                  _headId == null ||
                  _name.text.trim().isEmpty ||
                  int.tryParse(_amount.text.trim()) == null
              ? null
              : () => Navigator.pop(
                  context,
                  _InstallmentValues(
                    feeStructureId: _structureId!,
                    feeHeadId: _headId!,
                    name: _name.text.trim(),
                    amountMinor: int.parse(_amount.text.trim()),
                    dueOn: _date,
                  ),
                ),
          child: const Text('Create installment'),
        ),
      ],
    ),
  );
}

class _Sheet extends StatelessWidget {
  const _Sheet({required this.title, required this.child});
  final String title;
  final Widget child;
  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(
      left: ErpSpacing.lg,
      right: ErpSpacing.lg,
      top: ErpSpacing.lg,
      bottom: MediaQuery.viewInsetsOf(context).bottom + ErpSpacing.lg,
    ),
    child: SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: ErpSpacing.md),
          child,
        ],
      ),
    ),
  );
}

String _money(int minor) => NumberFormat.currency(
  locale: 'en_IN',
  symbol: '₹',
  decimalDigits: 2,
).format(minor / 100);
