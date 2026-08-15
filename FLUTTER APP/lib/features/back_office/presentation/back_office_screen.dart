import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import 'asset_workspace.dart';
import '../../../shared/models/operations_models.dart';
import '../../../shared/widgets/erp_states.dart';

class BackOfficeScreen extends ConsumerStatefulWidget {
  const BackOfficeScreen({super.key});

  @override
  ConsumerState<BackOfficeScreen> createState() => _BackOfficeScreenState();
}

class _BackOfficeScreenState extends ConsumerState<BackOfficeScreen> {
  Future<void> _refresh() async {
    for (final provider in [
      inventorySuppliersProvider,
      assetsProvider,
      assetAssignmentsProvider,
      assetMaintenanceProvider,
      assetDepreciationProvider,
      stockMovementsProvider,
      procurementRequisitionsProvider,
      procurementPurchaseOrdersProvider,
      procurementGoodsReceiptsProvider,
      facilityBookingsProvider,
      facilityMaintenanceProvider,
      facilityComplaintsProvider,
      hostelRoomsProvider,
      hostelBedsProvider,
      hostelStudentsProvider,
      hostelAllotmentsProvider,
      canteenMenuProvider,
      canteenStudentsProvider,
      canteenTransactionsProvider,
    ]) {
      ref.invalidate(provider);
    }
    ref.invalidate(inventoryItemsProvider(''));
    await Future.wait([
      if (_can('inventory:read')) ref.read(inventoryItemsProvider('').future),
      if (_can('assets:read')) ref.read(assetsProvider.future),
      if (_can('assets:read')) ref.read(assetAssignmentsProvider.future),
      if (_can('assets:read')) ref.read(assetMaintenanceProvider.future),
      if (_can('assets:read')) ref.read(assetDepreciationProvider.future),
      if (_can('inventory:read')) ref.read(inventorySuppliersProvider.future),
      if (_can('inventory:read')) ref.read(stockMovementsProvider.future),
      if (_can('procurement:read'))
        ref.read(procurementRequisitionsProvider.future),
      if (_can('procurement:read'))
        ref.read(procurementPurchaseOrdersProvider.future),
      if (_can('procurement:read'))
        ref.read(procurementGoodsReceiptsProvider.future),
      if (_can('facilities:read')) ref.read(facilityBookingsProvider.future),
      if (_can('facilities:read')) ref.read(facilityMaintenanceProvider.future),
      if (_can('facilities:read')) ref.read(facilityComplaintsProvider.future),
      if (_can('hostel:read')) ref.read(hostelRoomsProvider.future),
      if (_can('hostel:read')) ref.read(hostelBedsProvider.future),
      if (_can('hostel:read')) ref.read(hostelStudentsProvider.future),
      if (_can('hostel:read')) ref.read(hostelAllotmentsProvider.future),
      if (_can('canteen:read')) ref.read(canteenMenuProvider.future),
      if (_can('canteen:read')) ref.read(canteenStudentsProvider.future),
      if (_can('canteen:read')) ref.read(canteenTransactionsProvider.future),
    ]);
  }

  bool _can(String permission) =>
      ref.read(sessionProvider).valueOrNull?.can(permission) == true;

  Future<void> _showForm({
    required String title,
    required List<_FieldSpec> fields,
    required Future<void> Function(Map<String, String> values) submit,
    String submitLabel = 'Save',
  }) async {
    final values = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _TextFormSheet(
        title: title,
        fields: fields,
        submitLabel: submitLabel,
      ),
    );
    if (values == null || !mounted) return;
    try {
      await submit(values);
      await _refresh();
      if (mounted) _success('$title saved.');
    } on Object catch (error) {
      if (mounted) _error(error);
    }
  }

  void _success(String message) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(message)));

  void _error(Object error) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(readableApiError(error))));

  Future<void> _createInventoryItem() => _showForm(
    title: 'Add inventory item',
    fields: const [
      _FieldSpec('name', 'Item name'),
      _FieldSpec('sku', 'SKU'),
      _FieldSpec('reorderLevel', 'Reorder level', number: true),
    ],
    submit: (values) => ref
        .read(apiClientProvider)
        .createInventoryItem(
          name: values['name']!,
          sku: values['sku']!,
          reorderLevel: int.tryParse(values['reorderLevel']!) ?? 0,
        ),
  );

  Future<void> _createSupplier() => _showForm(
    title: 'Add supplier',
    fields: const [
      _FieldSpec('name', 'Supplier name'),
      _FieldSpec('contactEmail', 'Email', email: true, required: false),
      _FieldSpec('phone', 'Phone', required: false),
    ],
    submit: (values) => ref
        .read(apiClientProvider)
        .createInventorySupplier(
          name: values['name']!,
          contactEmail: values['contactEmail'],
          phone: values['phone'],
        ),
  );

  Future<void> _postMovement(List<InventoryItemRow> items) async {
    if (items.isEmpty) {
      _success('Add an inventory item before posting stock.');
      return;
    }
    final result = await showModalBottomSheet<_StockMovementValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _StockMovementSheet(items: items),
    );
    if (result == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .postStockMovement(
            inventoryItemId: result.itemId,
            quantity: result.quantity,
            direction: result.direction,
            reference: result.reference,
          );
      await _refresh();
      if (mounted) _success('Stock movement posted.');
    } on Object catch (error) {
      if (mounted) _error(error);
    }
  }

  Future<void> _createRequisition() => _showForm(
    title: 'Create requisition',
    fields: const [
      _FieldSpec('name', 'Request name'),
      _FieldSpec('quantity', 'Quantity', number: true),
      _FieldSpec('estimatedMinor', 'Estimated amount in paise', number: true),
    ],
    submit: (values) => ref
        .read(apiClientProvider)
        .createProcurementRequisition(
          name: values['name']!,
          quantity: int.tryParse(values['quantity']!) ?? 0,
          estimatedMinor: int.tryParse(values['estimatedMinor']!) ?? 0,
        ),
  );

  Future<void> _createPurchaseOrder(
    List<ProcurementRequisitionRow> requisitions,
    List<InventorySupplierRow> suppliers,
  ) async {
    final approved = requisitions.where((row) => row.status == 'approved');
    if (approved.isEmpty) {
      _success('Only an approved requisition can become a purchase order.');
      return;
    }
    final result = await showModalBottomSheet<_PurchaseOrderValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _PurchaseOrderSheet(
        requisitions: approved.toList(growable: false),
        suppliers: suppliers,
      ),
    );
    if (result == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createProcurementPurchaseOrder(
            requisitionId: result.requisitionId,
            supplierId: result.supplierId,
            supplierName: result.supplierName,
            amountMinor: result.amountMinor,
          );
      await _refresh();
      if (mounted) _success('Purchase order created.');
    } on Object catch (error) {
      if (mounted) _error(error);
    }
  }

  Future<void> _postReceipt(
    List<ProcurementPurchaseOrderRow> orders,
    List<InventoryItemRow> items,
  ) async {
    final ordered = orders.where((row) => row.status == 'ordered');
    if (ordered.isEmpty || items.isEmpty) {
      _success('An ordered purchase order and inventory item are required.');
      return;
    }
    final result = await showModalBottomSheet<_GoodsReceiptValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _GoodsReceiptSheet(
        orders: ordered.toList(growable: false),
        items: items,
      ),
    );
    if (result == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .postGoodsReceipt(
            purchaseOrderId: result.purchaseOrderId,
            inventoryItemId: result.inventoryItemId,
            quantity: result.quantity,
          );
      await _refresh();
      if (mounted) _success('Goods receipt posted.');
    } on Object catch (error) {
      if (mounted) _error(error);
    }
  }

  Future<void> _createFacilityBooking() async {
    final result = await showModalBottomSheet<_FacilityBookingValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _FacilityBookingSheet(),
    );
    if (result == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createFacilityBooking(
            facilityName: result.facilityName,
            purpose: result.purpose,
            startsAt: result.startsAt,
            endsAt: result.endsAt,
          );
      await _refresh();
      if (mounted) _success('Facility booking requested.');
    } on Object catch (error) {
      if (mounted) _error(error);
    }
  }

  Future<void> _createFacilityMaintenance() => _showForm(
    title: 'Create maintenance ticket',
    fields: const [
      _FieldSpec('facilityName', 'Facility name'),
      _FieldSpec('title', 'Issue title'),
      _FieldSpec('priority', 'Priority', hint: 'low, medium, high or critical'),
      _FieldSpec('details', 'Details', multiline: true),
    ],
    submit: (values) => ref
        .read(apiClientProvider)
        .createFacilityMaintenance(
          facilityName: values['facilityName']!,
          title: values['title']!,
          priority: values['priority']!.toLowerCase(),
          details: values['details']!,
        ),
  );

  Future<void> _createFacilityComplaint() => _showForm(
    title: 'Create facility complaint',
    fields: const [
      _FieldSpec('facilityName', 'Facility name'),
      _FieldSpec('title', 'Complaint title'),
      _FieldSpec('details', 'Details', multiline: true),
    ],
    submit: (values) => ref
        .read(apiClientProvider)
        .createFacilityComplaint(
          facilityName: values['facilityName']!,
          title: values['title']!,
          details: values['details']!,
        ),
  );

  Future<void> _createHostelRoom() => _showForm(
    title: 'Create hostel room',
    fields: const [
      _FieldSpec('building', 'Building'),
      _FieldSpec('floor', 'Floor', required: false),
      _FieldSpec('roomNumber', 'Room number'),
      _FieldSpec('capacity', 'Capacity', number: true),
    ],
    submit: (values) => ref
        .read(apiClientProvider)
        .createHostelRoom(
          building: values['building']!,
          floor: values['floor'],
          roomNumber: values['roomNumber']!,
          capacity: int.tryParse(values['capacity']!) ?? 0,
        ),
  );

  Future<void> _createHostelBed(List<HostelRoomRow> rooms) async {
    if (rooms.isEmpty) {
      _success('Create a hostel room before adding a bed.');
      return;
    }
    final result = await showModalBottomSheet<_HostelBedValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _HostelBedSheet(rooms: rooms),
    );
    if (result == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createHostelBed(roomId: result.roomId, code: result.code);
      await _refresh();
      if (mounted) _success('Hostel bed created.');
    } on Object catch (error) {
      if (mounted) _error(error);
    }
  }

  Future<void> _allocateHostel(
    List<HostelRoomRow> rooms,
    List<HostelBedRow> beds,
    List<HostelStudentOption> students,
  ) async {
    if (rooms.isEmpty || beds.isEmpty || students.isEmpty) {
      _success('Rooms, beds and active students are required for allotment.');
      return;
    }
    final result = await showModalBottomSheet<_HostelAllotmentValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) =>
          _HostelAllotmentSheet(rooms: rooms, beds: beds, students: students),
    );
    if (result == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .allocateHostelBed(
            roomId: result.roomId,
            bedId: result.bedId,
            studentId: result.studentId,
          );
      await _refresh();
      if (mounted) _success('Hostel bed allotted.');
    } on Object catch (error) {
      if (mounted) _error(error);
    }
  }

  Future<void> _createCanteenMenu() => _showForm(
    title: 'Add menu item',
    fields: const [
      _FieldSpec('name', 'Menu item'),
      _FieldSpec('priceMinor', 'Price in paise', number: true),
    ],
    submit: (values) => ref
        .read(apiClientProvider)
        .createCanteenMenu(
          name: values['name']!,
          priceMinor: int.tryParse(values['priceMinor']!) ?? 0,
        ),
  );

  Future<void> _createCanteenTransaction(
    List<CanteenMenuRow> menu,
    List<CanteenStudentOption> students,
  ) async {
    if (menu.isEmpty || students.isEmpty) {
      _success('A menu item and active student are required.');
      return;
    }
    final result = await showModalBottomSheet<_CanteenTransactionValues>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _CanteenTransactionSheet(menu: menu, students: students),
    );
    if (result == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createCanteenTransaction(
            menuId: result.menuId,
            studentId: result.studentId,
            quantity: result.quantity,
          );
      await _refresh();
      if (mounted) _success('Canteen transaction recorded.');
    } on Object catch (error) {
      if (mounted) _error(error);
    }
  }

  Future<void> _transition(
    String title,
    Future<void> Function(String status) action,
    List<String> statuses,
  ) async {
    final status = await showModalBottomSheet<String>(
      context: context,
      useSafeArea: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.all(ErpSpacing.lg),
              child: Text(title, style: Theme.of(context).textTheme.titleLarge),
            ),
            for (final value in statuses)
              ListTile(
                title: Text(_title(value)),
                leading: const Icon(Icons.arrow_forward),
                onTap: () => Navigator.pop(context, value),
              ),
          ],
        ),
      ),
    );
    if (status == null || !mounted) return;
    try {
      await action(status);
      await _refresh();
      if (mounted) _success('Workflow updated.');
    } on Object catch (error) {
      if (mounted) _error(error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final tabs = <Tab>[];
    final views = <Widget>[];
    if (user?.can('assets:read') == true) {
      tabs.add(const Tab(text: 'Assets'));
      views.add(AssetWorkspace(onRefresh: _refresh));
    }
    if (user?.can('inventory:read') == true) {
      tabs.add(const Tab(text: 'Inventory'));
      views.add(_InventoryWorkspace(onRefresh: _refresh));
    }
    if (user?.can('procurement:read') == true) {
      tabs.add(const Tab(text: 'Procurement'));
      views.add(
        _ProcurementWorkspace(
          onRefresh: _refresh,
          onCreateRequisition: _createRequisition,
          onCreatePurchaseOrder: _createPurchaseOrder,
          onTransitionRequisition: (row) => _transition(
            'Move requisition ${row.code}',
            (status) => ref
                .read(apiClientProvider)
                .transitionProcurementRequisition(row.id, status),
            _requisitionNextStatuses(row.status),
          ),
          onTransitionPurchaseOrder: (row) => _transition(
            'Move purchase order ${row.code}',
            (status) => ref
                .read(apiClientProvider)
                .transitionProcurementPurchaseOrder(row.id, status),
            _purchaseOrderNextStatuses(row.status),
          ),
          onPostReceipt: _postReceipt,
        ),
      );
    }
    if (user?.can('facilities:read') == true) {
      tabs.add(const Tab(text: 'Facilities'));
      views.add(
        _FacilitiesWorkspace(
          onRefresh: _refresh,
          onCreateBooking: _createFacilityBooking,
          onCreateMaintenance: _createFacilityMaintenance,
          onCreateComplaint: _createFacilityComplaint,
          onTransitionBooking: (row) => _transition(
            'Move booking ${row.name}',
            (status) => ref
                .read(apiClientProvider)
                .transitionFacilityBooking(row.id, status),
            _bookingNextStatuses(row.status),
          ),
          onTransitionMaintenance: (row) => _transition(
            'Move maintenance ticket',
            (status) => ref
                .read(apiClientProvider)
                .transitionFacilityMaintenance(row.id, status),
            _maintenanceNextStatuses(row.status),
          ),
          onTransitionComplaint: (row) => _transition(
            'Move complaint ${row.name}',
            (status) => ref
                .read(apiClientProvider)
                .transitionFacilityComplaint(row.id, status),
            _complaintNextStatuses(row.status),
          ),
        ),
      );
    }
    if (user?.can('hostel:read') == true) {
      tabs.add(const Tab(text: 'Hostel'));
      views.add(
        _HostelWorkspace(
          onRefresh: _refresh,
          onCreateRoom: _createHostelRoom,
          onCreateBed: _createHostelBed,
          onAllocate: _allocateHostel,
        ),
      );
    }
    if (user?.can('canteen:read') == true) {
      tabs.add(const Tab(text: 'Canteen'));
      views.add(
        _CanteenWorkspace(
          onRefresh: _refresh,
          onCreateMenu: _createCanteenMenu,
          onCreateTransaction: _createCanteenTransaction,
        ),
      );
    }
    if (tabs.isEmpty) {
      return const ErpEmptyState(
        icon: Icons.inventory_2_outlined,
        title: 'Back-office workflows are not available',
        message: 'Your account does not have access to these operations.',
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

class _InventoryWorkspace extends ConsumerStatefulWidget {
  const _InventoryWorkspace({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  ConsumerState<_InventoryWorkspace> createState() =>
      _InventoryWorkspaceState();
}

class _InventoryWorkspaceState extends ConsumerState<_InventoryWorkspace> {
  final _search = TextEditingController();
  String _query = '';

  @override
  void initState() {
    super.initState();
    _search.addListener(() => setState(() => _query = _search.text.trim()));
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final canCreate = user?.can('inventory:create') == true;
    final canUpdate = user?.can('inventory:update') == true;
    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          const TabBar(
            tabs: [
              Tab(text: 'Items'),
              Tab(text: 'Suppliers'),
              Tab(text: 'Movements'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _InventoryItemsTab(
                  search: _query,
                  canCreate: canCreate,
                  canUpdate: canUpdate,
                  onCreate: () =>
                      (context
                              .findAncestorStateOfType<
                                _BackOfficeScreenState
                              >())
                          ?._createInventoryItem(),
                  onPostMovement: (items) =>
                      (context
                              .findAncestorStateOfType<
                                _BackOfficeScreenState
                              >())
                          ?._postMovement(items),
                  onRefresh: widget.onRefresh,
                  searchController: _search,
                ),
                _InventorySuppliersTab(
                  canCreate: canCreate,
                  onCreate: () =>
                      (context
                              .findAncestorStateOfType<
                                _BackOfficeScreenState
                              >())
                          ?._createSupplier(),
                  onRefresh: widget.onRefresh,
                ),
                _StockMovementsTab(onRefresh: widget.onRefresh),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InventoryItemsTab extends ConsumerWidget {
  const _InventoryItemsTab({
    required this.search,
    required this.canCreate,
    required this.canUpdate,
    required this.onCreate,
    required this.onPostMovement,
    required this.onRefresh,
    required this.searchController,
  });
  final String search;
  final bool canCreate;
  final bool canUpdate;
  final VoidCallback onCreate;
  final void Function(List<InventoryItemRow>) onPostMovement;
  final Future<void> Function() onRefresh;
  final TextEditingController searchController;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(inventoryItemsProvider(search));
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(inventoryItemsProvider(search)),
      ),
      data: (rows) => RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(ErpSpacing.lg),
          itemCount: rows.length + 2,
          separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
          itemBuilder: (context, index) {
            if (index == 0) {
              return TextField(
                controller: searchController,
                decoration: const InputDecoration(
                  labelText: 'Search item or SKU',
                  prefixIcon: Icon(Icons.search),
                ),
              );
            }
            if (index == 1) {
              return Wrap(
                spacing: ErpSpacing.sm,
                children: [
                  if (canCreate)
                    FilledButton.icon(
                      onPressed: onCreate,
                      icon: const Icon(Icons.add),
                      label: const Text('Add item'),
                    ),
                  if (canUpdate)
                    OutlinedButton.icon(
                      onPressed: rows.isEmpty
                          ? null
                          : () => onPostMovement(rows),
                      icon: const Icon(Icons.swap_vert),
                      label: const Text('Post stock'),
                    ),
                ],
              );
            }
            if (rows.isEmpty) {
              return const Padding(
                padding: EdgeInsets.only(top: ErpSpacing.xl),
                child: ErpEmptyState(
                  icon: Icons.inventory_2_outlined,
                  title: 'No inventory items',
                  message:
                      'Items and current quantities in your scope appear here.',
                ),
              );
            }
            final row = rows[index - 2];
            final low = row.quantity <= row.reorderLevel;
            return Card(
              child: ListTile(
                leading: CircleAvatar(
                  child: Icon(
                    low ? Icons.warning_amber : Icons.inventory_2_outlined,
                  ),
                ),
                title: Text(row.name),
                subtitle: Text('${row.sku} Â· Reorder at ${row.reorderLevel}'),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${row.quantity} units',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    if (low)
                      Text(
                        'Low stock',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _InventorySuppliersTab extends ConsumerWidget {
  const _InventorySuppliersTab({
    required this.canCreate,
    required this.onCreate,
    required this.onRefresh,
  });
  final bool canCreate;
  final VoidCallback onCreate;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      _AsyncRows<InventorySupplierRow>(
        value: ref.watch(inventorySuppliersProvider),
        onRefresh: onRefresh,
        emptyIcon: Icons.local_shipping_outlined,
        emptyTitle: 'No suppliers',
        emptyMessage: 'Inventory suppliers in your scope appear here.',
        header: canCreate
            ? FilledButton.icon(
                onPressed: onCreate,
                icon: const Icon(Icons.add),
                label: const Text('Add supplier'),
              )
            : null,
        itemBuilder: (row) => ListTile(
          leading: const CircleAvatar(
            child: Icon(Icons.local_shipping_outlined),
          ),
          title: Text(row.name),
          subtitle: Text(
            [
              if (row.contactEmail?.isNotEmpty == true) row.contactEmail!,
              if (row.phone?.isNotEmpty == true) row.phone!,
            ].join(' Â· '),
          ),
          trailing: ErpStatusChip(row.status),
        ),
      );
}

class _StockMovementsTab extends ConsumerWidget {
  const _StockMovementsTab({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  Widget build(
    BuildContext context,
    WidgetRef ref,
  ) => _AsyncRows<StockMovementRow>(
    value: ref.watch(stockMovementsProvider),
    onRefresh: onRefresh,
    emptyIcon: Icons.swap_vert,
    emptyTitle: 'No stock movements',
    emptyMessage: 'Posted inventory receipts and issues appear here.',
    itemBuilder: (row) => ListTile(
      leading: CircleAvatar(
        child: Icon(
          row.direction == 'in' ? Icons.call_received : Icons.call_made,
        ),
      ),
      title: Text(
        '${row.direction == 'in' ? '+' : '-'}${row.quantity} ${row.itemName}',
      ),
      subtitle: Text(
        '${row.sku} Â· ${DateFormat('d MMM yyyy, h:mm a').format(row.createdAt.toLocal())}${row.reference?.isNotEmpty == true ? '\n${row.reference}' : ''}',
      ),
      isThreeLine: row.reference?.isNotEmpty == true,
    ),
  );
}

class _ProcurementWorkspace extends StatelessWidget {
  const _ProcurementWorkspace({
    required this.onRefresh,
    required this.onCreateRequisition,
    required this.onCreatePurchaseOrder,
    required this.onTransitionRequisition,
    required this.onTransitionPurchaseOrder,
    required this.onPostReceipt,
  });
  final Future<void> Function() onRefresh;
  final VoidCallback onCreateRequisition;
  final void Function(
    List<ProcurementRequisitionRow>,
    List<InventorySupplierRow>,
  )
  onCreatePurchaseOrder;
  final Future<void> Function(ProcurementRequisitionRow)
  onTransitionRequisition;
  final Future<void> Function(ProcurementPurchaseOrderRow)
  onTransitionPurchaseOrder;
  final void Function(List<ProcurementPurchaseOrderRow>, List<InventoryItemRow>)
  onPostReceipt;

  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 3,
    child: Column(
      children: [
        const TabBar(
          tabs: [
            Tab(text: 'Requests'),
            Tab(text: 'Orders'),
            Tab(text: 'Receipts'),
          ],
        ),
        Expanded(
          child: TabBarView(
            children: [
              _RequisitionsTab(
                onRefresh: onRefresh,
                onCreate: onCreateRequisition,
                onTransition: onTransitionRequisition,
              ),
              _PurchaseOrdersTab(
                onRefresh: onRefresh,
                onCreate: onCreatePurchaseOrder,
                onTransition: onTransitionPurchaseOrder,
              ),
              _GoodsReceiptsTab(onRefresh: onRefresh, onPost: onPostReceipt),
            ],
          ),
        ),
      ],
    ),
  );
}

class _RequisitionsTab extends ConsumerWidget {
  const _RequisitionsTab({
    required this.onRefresh,
    required this.onCreate,
    required this.onTransition,
  });
  final Future<void> Function() onRefresh;
  final VoidCallback onCreate;
  final Future<void> Function(ProcurementRequisitionRow) onTransition;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final canCreate =
        ref.watch(sessionProvider).valueOrNull?.can('procurement:create') ==
        true;
    final canApprove =
        ref.watch(sessionProvider).valueOrNull?.can('procurement:approve') ==
        true;
    return _AsyncRows<ProcurementRequisitionRow>(
      value: ref.watch(procurementRequisitionsProvider),
      onRefresh: onRefresh,
      emptyIcon: Icons.request_quote_outlined,
      emptyTitle: 'No requisitions',
      emptyMessage: 'Purchase requests in your campus scope appear here.',
      header: canCreate
          ? FilledButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add),
              label: const Text('New request'),
            )
          : null,
      itemBuilder: (row) => ListTile(
        leading: const CircleAvatar(child: Icon(Icons.request_quote_outlined)),
        title: Text(row.name),
        subtitle: Text(
          '${row.code} Â· ${row.quantity} units Â· ${_money(row.estimatedMinor)}',
        ),
        trailing: canApprove || (canCreate && row.status == 'draft')
            ? TextButton(
                onPressed: () => onTransition(row),
                child: Text(_nextLabel(row.status)),
              )
            : ErpStatusChip(row.status),
      ),
    );
  }
}

class _PurchaseOrdersTab extends ConsumerWidget {
  const _PurchaseOrdersTab({
    required this.onRefresh,
    required this.onCreate,
    required this.onTransition,
  });
  final Future<void> Function() onRefresh;
  final void Function(
    List<ProcurementRequisitionRow>,
    List<InventorySupplierRow>,
  )
  onCreate;
  final Future<void> Function(ProcurementPurchaseOrderRow) onTransition;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(procurementPurchaseOrdersProvider);
    final requisitions = ref.watch(procurementRequisitionsProvider);
    final suppliers = ref.watch(inventorySuppliersProvider);
    final canCreate =
        ref.watch(sessionProvider).valueOrNull?.can('procurement:create') ==
        true;
    final canApprove =
        ref.watch(sessionProvider).valueOrNull?.can('procurement:approve') ==
        true;
    if (orders.isLoading || requisitions.isLoading || suppliers.isLoading) {
      return const ErpLoadingList();
    }
    if (orders.hasError) {
      return ErpErrorState(error: orders.error!, onRetry: onRefresh);
    }
    if (requisitions.hasError) {
      return ErpErrorState(error: requisitions.error!, onRetry: onRefresh);
    }
    if (suppliers.hasError) {
      return ErpErrorState(error: suppliers.error!, onRetry: onRefresh);
    }
    final rows = orders.valueOrNull ?? const <ProcurementPurchaseOrderRow>[];
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(ErpSpacing.lg),
        itemCount: rows.length + (canCreate ? 1 : 0),
        separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
        itemBuilder: (context, index) {
          if (canCreate && index == 0) {
            return FilledButton.icon(
              onPressed: () => onCreate(
                requisitions.valueOrNull ?? const [],
                suppliers.valueOrNull ?? const [],
              ),
              icon: const Icon(Icons.add),
              label: const Text('Create purchase order'),
            );
          }
          if (rows.isEmpty) {
            return const ErpEmptyState(
              icon: Icons.shopping_cart_outlined,
              title: 'No purchase orders',
              message:
                  'Purchase orders created from approved requests appear here.',
            );
          }
          final row = rows[canCreate ? index - 1 : index];
          return Card(
            child: ListTile(
              leading: const CircleAvatar(
                child: Icon(Icons.shopping_cart_outlined),
              ),
              title: Text(row.name),
              subtitle: Text(
                '${row.code} Â· ${row.supplierName}\n${_money(row.amountMinor)}',
              ),
              isThreeLine: true,
              trailing: canApprove
                  ? TextButton(
                      onPressed: () => onTransition(row),
                      child: Text(_nextLabel(row.status)),
                    )
                  : ErpStatusChip(row.status),
            ),
          );
        },
      ),
    );
  }
}

class _GoodsReceiptsTab extends ConsumerWidget {
  const _GoodsReceiptsTab({required this.onRefresh, required this.onPost});
  final Future<void> Function() onRefresh;
  final void Function(List<ProcurementPurchaseOrderRow>, List<InventoryItemRow>)
  onPost;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final receipts = ref.watch(procurementGoodsReceiptsProvider);
    final orders = ref.watch(procurementPurchaseOrdersProvider);
    final items = ref.watch(inventoryItemsProvider(''));
    final canPost =
        ref.watch(sessionProvider).valueOrNull?.can('procurement:update') ==
        true;
    if (receipts.isLoading || orders.isLoading || items.isLoading) {
      return const ErpLoadingList();
    }
    if (receipts.hasError) {
      return ErpErrorState(error: receipts.error!, onRetry: onRefresh);
    }
    final rows = receipts.valueOrNull ?? const <ProcurementGoodsReceiptRow>[];
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(ErpSpacing.lg),
        itemCount: rows.length + (canPost ? 1 : 0),
        separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
        itemBuilder: (context, index) {
          if (canPost && index == 0) {
            return FilledButton.icon(
              onPressed: () => onPost(
                orders.valueOrNull ?? const [],
                items.valueOrNull ?? const [],
              ),
              icon: const Icon(Icons.add_task),
              label: const Text('Post goods receipt'),
            );
          }
          if (rows.isEmpty) {
            return const ErpEmptyState(
              icon: Icons.inventory_outlined,
              title: 'No goods receipts',
              message: 'Received procurement items appear here.',
            );
          }
          final row = rows[canPost ? index - 1 : index];
          return Card(
            child: ListTile(
              leading: const CircleAvatar(
                child: Icon(Icons.inventory_outlined),
              ),
              title: Text(row.name),
              subtitle: Text(
                '${row.quantity} units Â· Order ${row.purchaseOrderId}',
              ),
              trailing: ErpStatusChip(row.status),
            ),
          );
        },
      ),
    );
  }
}

class _FacilitiesWorkspace extends StatelessWidget {
  const _FacilitiesWorkspace({
    required this.onRefresh,
    required this.onCreateBooking,
    required this.onCreateMaintenance,
    required this.onCreateComplaint,
    required this.onTransitionBooking,
    required this.onTransitionMaintenance,
    required this.onTransitionComplaint,
  });
  final Future<void> Function() onRefresh;
  final VoidCallback onCreateBooking;
  final VoidCallback onCreateMaintenance;
  final VoidCallback onCreateComplaint;
  final Future<void> Function(FacilityBookingRow) onTransitionBooking;
  final Future<void> Function(FacilityMaintenanceRow) onTransitionMaintenance;
  final Future<void> Function(FacilityComplaintRow) onTransitionComplaint;

  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 3,
    child: Column(
      children: [
        const TabBar(
          tabs: [
            Tab(text: 'Bookings'),
            Tab(text: 'Maintenance'),
            Tab(text: 'Complaints'),
          ],
        ),
        Expanded(
          child: TabBarView(
            children: [
              _FacilityBookingsTab(
                onRefresh: onRefresh,
                onCreate: onCreateBooking,
                onTransition: onTransitionBooking,
              ),
              _FacilityMaintenanceTab(
                onRefresh: onRefresh,
                onCreate: onCreateMaintenance,
                onTransition: onTransitionMaintenance,
              ),
              _FacilityComplaintsTab(
                onRefresh: onRefresh,
                onCreate: onCreateComplaint,
                onTransition: onTransitionComplaint,
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _FacilityBookingsTab extends ConsumerWidget {
  const _FacilityBookingsTab({
    required this.onRefresh,
    required this.onCreate,
    required this.onTransition,
  });
  final Future<void> Function() onRefresh;
  final VoidCallback onCreate;
  final Future<void> Function(FacilityBookingRow) onTransition;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).valueOrNull;
    return _AsyncRows<FacilityBookingRow>(
      value: ref.watch(facilityBookingsProvider),
      onRefresh: onRefresh,
      emptyIcon: Icons.event_available_outlined,
      emptyTitle: 'No facility bookings',
      emptyMessage: 'Facility requests and approved bookings appear here.',
      header: user?.can('facilities:create') == true
          ? FilledButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add),
              label: const Text('Request booking'),
            )
          : null,
      itemBuilder: (row) => ListTile(
        leading: const CircleAvatar(
          child: Icon(Icons.event_available_outlined),
        ),
        title: Text(row.name),
        subtitle: Text(
          '${row.purpose}\n${DateFormat('d MMM, h:mm a').format(row.startsAt.toLocal())} - ${DateFormat('h:mm a').format(row.endsAt.toLocal())}',
        ),
        isThreeLine: true,
        trailing: user?.can('facilities:approve') == true
            ? TextButton(
                onPressed: () => onTransition(row),
                child: Text(_nextLabel(row.status)),
              )
            : ErpStatusChip(row.status),
      ),
    );
  }
}

class _FacilityMaintenanceTab extends ConsumerWidget {
  const _FacilityMaintenanceTab({
    required this.onRefresh,
    required this.onCreate,
    required this.onTransition,
  });
  final Future<void> Function() onRefresh;
  final VoidCallback onCreate;
  final Future<void> Function(FacilityMaintenanceRow) onTransition;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).valueOrNull;
    return _AsyncRows<FacilityMaintenanceRow>(
      value: ref.watch(facilityMaintenanceProvider),
      onRefresh: onRefresh,
      emptyIcon: Icons.build_outlined,
      emptyTitle: 'No maintenance tickets',
      emptyMessage: 'Facility maintenance requests appear here.',
      header: user?.can('facilities:create') == true
          ? FilledButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add),
              label: const Text('Create ticket'),
            )
          : null,
      itemBuilder: (row) => ListTile(
        leading: const CircleAvatar(child: Icon(Icons.build_outlined)),
        title: Text(row.name),
        subtitle: Text(
          '${row.facilityName} Â· ${row.priority}\n${row.details}',
        ),
        isThreeLine: true,
        trailing: user?.can('facilities:update') == true
            ? TextButton(
                onPressed: () => onTransition(row),
                child: Text(_nextLabel(row.status)),
              )
            : ErpStatusChip(row.status),
      ),
    );
  }
}

class _FacilityComplaintsTab extends ConsumerWidget {
  const _FacilityComplaintsTab({
    required this.onRefresh,
    required this.onCreate,
    required this.onTransition,
  });
  final Future<void> Function() onRefresh;
  final VoidCallback onCreate;
  final Future<void> Function(FacilityComplaintRow) onTransition;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).valueOrNull;
    return _AsyncRows<FacilityComplaintRow>(
      value: ref.watch(facilityComplaintsProvider),
      onRefresh: onRefresh,
      emptyIcon: Icons.report_problem_outlined,
      emptyTitle: 'No complaints',
      emptyMessage: 'Facility complaints in your scope appear here.',
      header: user?.can('facilities:create') == true
          ? FilledButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add),
              label: const Text('Report complaint'),
            )
          : null,
      itemBuilder: (row) => ListTile(
        leading: const CircleAvatar(child: Icon(Icons.report_problem_outlined)),
        title: Text(row.name),
        subtitle: Text('${row.facilityName}\n${row.details}'),
        isThreeLine: true,
        trailing: user?.can('facilities:update') == true
            ? TextButton(
                onPressed: () => onTransition(row),
                child: Text(_nextLabel(row.status)),
              )
            : ErpStatusChip(row.status),
      ),
    );
  }
}

class _HostelWorkspace extends StatelessWidget {
  const _HostelWorkspace({
    required this.onRefresh,
    required this.onCreateRoom,
    required this.onCreateBed,
    required this.onAllocate,
  });
  final Future<void> Function() onRefresh;
  final VoidCallback onCreateRoom;
  final void Function(List<HostelRoomRow>) onCreateBed;
  final void Function(
    List<HostelRoomRow>,
    List<HostelBedRow>,
    List<HostelStudentOption>,
  )
  onAllocate;
  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 3,
    child: Column(
      children: [
        const TabBar(
          tabs: [
            Tab(text: 'Rooms & beds'),
            Tab(text: 'Allotments'),
            Tab(text: 'Overview'),
          ],
        ),
        Expanded(
          child: TabBarView(
            children: [
              _HostelRoomsTab(
                onRefresh: onRefresh,
                onCreateRoom: onCreateRoom,
                onCreateBed: onCreateBed,
              ),
              _HostelAllotmentsTab(
                onRefresh: onRefresh,
                onAllocate: onAllocate,
              ),
              _HostelOverviewTab(onRefresh: onRefresh),
            ],
          ),
        ),
      ],
    ),
  );
}

class _HostelRoomsTab extends ConsumerWidget {
  const _HostelRoomsTab({
    required this.onRefresh,
    required this.onCreateRoom,
    required this.onCreateBed,
  });
  final Future<void> Function() onRefresh;
  final VoidCallback onCreateRoom;
  final void Function(List<HostelRoomRow>) onCreateBed;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rooms = ref.watch(hostelRoomsProvider);
    final beds = ref.watch(hostelBedsProvider);
    final user = ref.watch(sessionProvider).valueOrNull;
    if (rooms.isLoading || beds.isLoading) return const ErpLoadingList();
    if (rooms.hasError) {
      return ErpErrorState(error: rooms.error!, onRetry: onRefresh);
    }
    final rows = rooms.valueOrNull ?? const <HostelRoomRow>[];
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(ErpSpacing.lg),
        itemCount: rows.length + 2,
        separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
        itemBuilder: (context, index) {
          if (index == 0) {
            return Wrap(
              spacing: ErpSpacing.sm,
              children: [
                if (user?.can('hostel:create') == true)
                  FilledButton.icon(
                    onPressed: onCreateRoom,
                    icon: const Icon(Icons.add_home_work_outlined),
                    label: const Text('Add room'),
                  ),
                if (user?.can('hostel:create') == true)
                  OutlinedButton.icon(
                    onPressed: rows.isEmpty ? null : () => onCreateBed(rows),
                    icon: const Icon(Icons.bed_outlined),
                    label: const Text('Add bed'),
                  ),
              ],
            );
          }
          if (index == 1) {
            return Text(
              '${rows.length} rooms Â· ${beds.valueOrNull?.length ?? 0} beds',
              style: Theme.of(context).textTheme.titleMedium,
            );
          }
          if (rows.isEmpty) {
            return const ErpEmptyState(
              icon: Icons.bed_outlined,
              title: 'No hostel rooms',
              message: 'Hostel rooms and occupancy will appear here.',
            );
          }
          final row = rows[index - 2];
          return Card(
            child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.bed_outlined)),
              title: Text('${row.building} Â· Room ${row.roomNumber}'),
              subtitle: Text(
                '${row.floor?.isNotEmpty == true ? 'Floor ${row.floor} Â· ' : ''}${row.occupancy}/${row.capacity} occupied',
              ),
              trailing: Text('${row.available} free'),
            ),
          );
        },
      ),
    );
  }
}

class _HostelAllotmentsTab extends ConsumerWidget {
  const _HostelAllotmentsTab({
    required this.onRefresh,
    required this.onAllocate,
  });
  final Future<void> Function() onRefresh;
  final void Function(
    List<HostelRoomRow>,
    List<HostelBedRow>,
    List<HostelStudentOption>,
  )
  onAllocate;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final allotments = ref.watch(hostelAllotmentsProvider);
    final rooms = ref.watch(hostelRoomsProvider);
    final beds = ref.watch(hostelBedsProvider);
    final students = ref.watch(hostelStudentsProvider);
    final user = ref.watch(sessionProvider).valueOrNull;
    if (allotments.isLoading ||
        rooms.isLoading ||
        beds.isLoading ||
        students.isLoading) {
      return const ErpLoadingList();
    }
    if (allotments.hasError) {
      return ErpErrorState(error: allotments.error!, onRetry: onRefresh);
    }
    final rows = allotments.valueOrNull ?? const <HostelAllotmentRow>[];
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(ErpSpacing.lg),
        itemCount: rows.length + (user?.can('hostel:update') == true ? 1 : 0),
        separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
        itemBuilder: (context, index) {
          if (user?.can('hostel:update') == true && index == 0) {
            return FilledButton.icon(
              onPressed: () => onAllocate(
                rooms.valueOrNull ?? const [],
                beds.valueOrNull ?? const [],
                students.valueOrNull ?? const [],
              ),
              icon: const Icon(Icons.person_add_alt_1),
              label: const Text('Allot a bed'),
            );
          }
          if (rows.isEmpty) {
            return const ErpEmptyState(
              icon: Icons.hotel_outlined,
              title: 'No allotments',
              message: 'Active and completed student allotments appear here.',
            );
          }
          final row =
              rows[user?.can('hostel:update') == true ? index - 1 : index];
          return Card(
            child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.hotel_outlined)),
              title: Text(row.studentName),
              subtitle: Text(
                '${row.building} Â· Room ${row.roomNumber} Â· Bed ${row.bedCode}',
              ),
              trailing:
                  row.status == 'active' && user?.can('hostel:update') == true
                  ? TextButton(
                      onPressed: () async {
                        try {
                          await ref
                              .read(apiClientProvider)
                              .checkoutHostelAllotment(row.id);
                          await onRefresh();
                        } on Object catch (error) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(readableApiError(error))),
                            );
                          }
                        }
                      },
                      child: const Text('Check out'),
                    )
                  : ErpStatusChip(row.status),
            ),
          );
        },
      ),
    );
  }
}

class _HostelOverviewTab extends ConsumerWidget {
  const _HostelOverviewTab({required this.onRefresh});
  final Future<void> Function() onRefresh;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rooms = ref.watch(hostelRoomsProvider);
    final allotments = ref.watch(hostelAllotmentsProvider);
    if (rooms.isLoading || allotments.isLoading) return const ErpLoadingList();
    if (rooms.hasError || allotments.hasError) {
      return ErpErrorState(
        error: rooms.error ?? allotments.error!,
        onRetry: onRefresh,
      );
    }
    final roomRows = rooms.valueOrNull ?? const <HostelRoomRow>[];
    final active = (allotments.valueOrNull ?? const <HostelAllotmentRow>[])
        .where((row) => row.status == 'active')
        .length;
    final capacity = roomRows.fold<int>(0, (sum, row) => sum + row.capacity);
    return ListView(
      padding: const EdgeInsets.all(ErpSpacing.lg),
      children: [
        _SummaryCard(
          label: 'Capacity',
          value: '$capacity beds',
          icon: Icons.bed_outlined,
        ),
        const SizedBox(height: ErpSpacing.sm),
        _SummaryCard(
          label: 'Active residents',
          value: '$active',
          icon: Icons.people_outline,
        ),
        const SizedBox(height: ErpSpacing.sm),
        _SummaryCard(
          label: 'Available spaces',
          value: '${roomRows.fold<int>(0, (sum, row) => sum + row.available)}',
          icon: Icons.event_seat_outlined,
        ),
      ],
    );
  }
}

class _CanteenWorkspace extends StatelessWidget {
  const _CanteenWorkspace({
    required this.onRefresh,
    required this.onCreateMenu,
    required this.onCreateTransaction,
  });
  final Future<void> Function() onRefresh;
  final VoidCallback onCreateMenu;
  final void Function(List<CanteenMenuRow>, List<CanteenStudentOption>)
  onCreateTransaction;
  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 2,
    child: Column(
      children: [
        const TabBar(
          tabs: [
            Tab(text: 'Menu'),
            Tab(text: 'Transactions'),
          ],
        ),
        Expanded(
          child: TabBarView(
            children: [
              _CanteenMenuTab(onRefresh: onRefresh, onCreate: onCreateMenu),
              _CanteenTransactionsTab(
                onRefresh: onRefresh,
                onCreate: onCreateTransaction,
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _CanteenMenuTab extends ConsumerWidget {
  const _CanteenMenuTab({required this.onRefresh, required this.onCreate});
  final Future<void> Function() onRefresh;
  final VoidCallback onCreate;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).valueOrNull;
    return _AsyncRows<CanteenMenuRow>(
      value: ref.watch(canteenMenuProvider),
      onRefresh: onRefresh,
      emptyIcon: Icons.restaurant_menu_outlined,
      emptyTitle: 'No menu items',
      emptyMessage: 'Active canteen menu items appear here.',
      header: user?.can('canteen:create') == true
          ? FilledButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add),
              label: const Text('Add menu item'),
            )
          : null,
      itemBuilder: (row) => ListTile(
        leading: const CircleAvatar(
          child: Icon(Icons.restaurant_menu_outlined),
        ),
        title: Text(row.name),
        subtitle: Text(_money(row.priceMinor)),
        trailing: ErpStatusChip(row.status),
      ),
    );
  }
}

class _CanteenTransactionsTab extends ConsumerWidget {
  const _CanteenTransactionsTab({
    required this.onRefresh,
    required this.onCreate,
  });
  final Future<void> Function() onRefresh;
  final void Function(List<CanteenMenuRow>, List<CanteenStudentOption>)
  onCreate;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rows = ref.watch(canteenTransactionsProvider);
    final menu = ref.watch(canteenMenuProvider);
    final students = ref.watch(canteenStudentsProvider);
    final user = ref.watch(sessionProvider).valueOrNull;
    if (rows.isLoading || menu.isLoading || students.isLoading) {
      return const ErpLoadingList();
    }
    if (rows.hasError) {
      return ErpErrorState(error: rows.error!, onRetry: onRefresh);
    }
    final data = rows.valueOrNull ?? const <CanteenTransactionRow>[];
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(ErpSpacing.lg),
        itemCount: data.length + (user?.can('canteen:update') == true ? 1 : 0),
        separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
        itemBuilder: (context, index) {
          if (user?.can('canteen:update') == true && index == 0) {
            return FilledButton.icon(
              onPressed: () => onCreate(
                menu.valueOrNull ?? const [],
                students.valueOrNull ?? const [],
              ),
              icon: const Icon(Icons.add_shopping_cart),
              label: const Text('Record transaction'),
            );
          }
          if (data.isEmpty) {
            return const ErpEmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'No canteen transactions',
              message: 'Posted student menu transactions appear here.',
            );
          }
          final row =
              data[user?.can('canteen:update') == true ? index - 1 : index];
          return Card(
            child: ListTile(
              leading: const CircleAvatar(
                child: Icon(Icons.receipt_long_outlined),
              ),
              title: Text(row.name),
              subtitle: Text(
                '${row.quantity} item(s) Â· ${_money(row.priceMinor)}\n${DateFormat('d MMM yyyy, h:mm a').format(row.createdAt.toLocal())}',
              ),
              isThreeLine: true,
              trailing: ErpStatusChip(row.status),
            ),
          );
        },
      ),
    );
  }
}

class _AsyncRows<T> extends StatelessWidget {
  const _AsyncRows({
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
    data: (rows) => RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(ErpSpacing.lg),
        itemCount: rows.isEmpty
            ? (header == null ? 1 : 2)
            : rows.length + (header == null ? 0 : 1),
        separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
        itemBuilder: (context, index) {
          if (header != null && index == 0) return header!;
          if (rows.isEmpty) {
            return ErpEmptyState(
              icon: emptyIcon,
              title: emptyTitle,
              message: emptyMessage,
            );
          }
          return Card(
            child: itemBuilder(rows[header == null ? index : index - 1]),
          );
        },
      ),
    ),
  );
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.label,
    required this.value,
    required this.icon,
  });
  final String label;
  final String value;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      leading: CircleAvatar(child: Icon(icon)),
      title: Text(label),
      trailing: Text(
        value,
        style: Theme.of(
          context,
        ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
      ),
    ),
  );
}

class _FieldSpec {
  const _FieldSpec(
    this.key,
    this.label, {
    this.number = false,
    this.email = false,
    this.multiline = false,
    this.required = true,
    this.hint,
  });
  final String key;
  final String label;
  final bool number;
  final bool email;
  final bool multiline;
  final bool required;
  final String? hint;
}

class _TextFormSheet extends StatefulWidget {
  const _TextFormSheet({
    required this.title,
    required this.fields,
    required this.submitLabel,
  });
  final String title;
  final List<_FieldSpec> fields;
  final String submitLabel;
  @override
  State<_TextFormSheet> createState() => _TextFormSheetState();
}

class _TextFormSheetState extends State<_TextFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _controllers = <String, TextEditingController>{};
  @override
  void initState() {
    super.initState();
    for (final field in widget.fields) {
      _controllers[field.key] = TextEditingController();
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
                widget.title,
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: ErpSpacing.md),
              for (final field in widget.fields) ...[
                TextFormField(
                  controller: _controllers[field.key],
                  keyboardType: field.multiline
                      ? TextInputType.multiline
                      : field.number
                      ? TextInputType.number
                      : field.email
                      ? TextInputType.emailAddress
                      : TextInputType.text,
                  maxLines: field.multiline ? 4 : 1,
                  decoration: InputDecoration(
                    labelText: field.label,
                    hintText: field.hint,
                  ),
                  validator: (value) {
                    if (!field.required &&
                        (value == null || value.trim().isEmpty)) {
                      return null;
                    }
                    if (value == null || value.trim().isEmpty) {
                      return 'Enter ${field.label.toLowerCase()}.';
                    }
                    if (field.number && int.tryParse(value.trim()) == null) {
                      return 'Enter a whole number.';
                    }
                    if (field.email && !value.contains('@')) {
                      return 'Enter a valid email.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: ErpSpacing.md),
              ],
              FilledButton(
                onPressed: () {
                  if (!_formKey.currentState!.validate()) return;
                  Navigator.pop(context, {
                    for (final field in widget.fields)
                      field.key: _controllers[field.key]!.text.trim(),
                  });
                },
                child: Text(widget.submitLabel),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StockMovementValues {
  const _StockMovementValues({
    required this.itemId,
    required this.quantity,
    required this.direction,
    this.reference,
  });
  final String itemId;
  final int quantity;
  final String direction;
  final String? reference;
}

class _PurchaseOrderValues {
  const _PurchaseOrderValues({
    required this.requisitionId,
    this.supplierId,
    this.supplierName,
    required this.amountMinor,
  });
  final String requisitionId;
  final String? supplierId;
  final String? supplierName;
  final int amountMinor;
}

class _GoodsReceiptValues {
  const _GoodsReceiptValues({
    required this.purchaseOrderId,
    required this.inventoryItemId,
    required this.quantity,
  });
  final String purchaseOrderId;
  final String inventoryItemId;
  final int quantity;
}

class _HostelBedValues {
  const _HostelBedValues({required this.roomId, required this.code});
  final String roomId;
  final String code;
}

class _HostelAllotmentValues {
  const _HostelAllotmentValues({
    required this.roomId,
    required this.bedId,
    required this.studentId,
  });
  final String roomId;
  final String bedId;
  final String studentId;
}

class _CanteenTransactionValues {
  const _CanteenTransactionValues({
    required this.menuId,
    required this.studentId,
    required this.quantity,
  });
  final String menuId;
  final String studentId;
  final int quantity;
}

class _FacilityBookingValues {
  const _FacilityBookingValues({
    required this.facilityName,
    required this.purpose,
    required this.startsAt,
    required this.endsAt,
  });
  final String facilityName;
  final String purpose;
  final DateTime startsAt;
  final DateTime endsAt;
}

class _StockMovementSheet extends StatefulWidget {
  const _StockMovementSheet({required this.items});
  final List<InventoryItemRow> items;
  @override
  State<_StockMovementSheet> createState() => _StockMovementSheetState();
}

class _StockMovementSheetState extends State<_StockMovementSheet> {
  final _formKey = GlobalKey<FormState>();
  final _quantity = TextEditingController();
  final _reference = TextEditingController();
  String? _itemId;
  String _direction = 'in';
  @override
  void initState() {
    super.initState();
    _itemId = widget.items.first.id;
  }

  @override
  void dispose() {
    _quantity.dispose();
    _reference.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _SheetFrame(
    title: 'Post stock movement',
    child: Form(
      key: _formKey,
      child: Column(
        children: [
          DropdownButtonFormField<String>(
            initialValue: _itemId,
            decoration: const InputDecoration(labelText: 'Inventory item'),
            items: [
              for (final row in widget.items)
                DropdownMenuItem(
                  value: row.id,
                  child: Text('${row.name} (${row.quantity})'),
                ),
            ],
            onChanged: (value) => setState(() => _itemId = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _direction,
            decoration: const InputDecoration(labelText: 'Direction'),
            items: const [
              DropdownMenuItem(value: 'in', child: Text('Stock in')),
              DropdownMenuItem(value: 'out', child: Text('Stock out')),
            ],
            onChanged: (value) => setState(() => _direction = value ?? 'in'),
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _quantity,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Quantity'),
            validator: (value) =>
                int.tryParse(value?.trim() ?? '') == null ||
                    int.parse(value!.trim()) < 1
                ? 'Enter a positive quantity.'
                : null,
          ),
          const SizedBox(height: ErpSpacing.md),
          TextField(
            controller: _reference,
            decoration: const InputDecoration(
              labelText: 'Reference (optional)',
            ),
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: () {
              if (!_formKey.currentState!.validate() || _itemId == null) return;
              Navigator.pop(
                context,
                _StockMovementValues(
                  itemId: _itemId!,
                  quantity: int.parse(_quantity.text.trim()),
                  direction: _direction,
                  reference: _reference.text.trim().isEmpty
                      ? null
                      : _reference.text.trim(),
                ),
              );
            },
            child: const Text('Post movement'),
          ),
        ],
      ),
    ),
  );
}

class _PurchaseOrderSheet extends StatefulWidget {
  const _PurchaseOrderSheet({
    required this.requisitions,
    required this.suppliers,
  });
  final List<ProcurementRequisitionRow> requisitions;
  final List<InventorySupplierRow> suppliers;
  @override
  State<_PurchaseOrderSheet> createState() => _PurchaseOrderSheetState();
}

class _PurchaseOrderSheetState extends State<_PurchaseOrderSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _supplierName = TextEditingController();
  String? _requisitionId;
  String? _supplierId;
  @override
  void initState() {
    super.initState();
    _requisitionId = widget.requisitions.first.id;
  }

  @override
  void dispose() {
    _amount.dispose();
    _supplierName.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _SheetFrame(
    title: 'Create purchase order',
    child: Form(
      key: _formKey,
      child: Column(
        children: [
          DropdownButtonFormField<String>(
            initialValue: _requisitionId,
            decoration: const InputDecoration(
              labelText: 'Approved requisition',
            ),
            items: [
              for (final row in widget.requisitions)
                DropdownMenuItem(value: row.id, child: Text(row.code)),
            ],
            onChanged: (value) => setState(() => _requisitionId = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String?>(
            initialValue: _supplierId,
            decoration: const InputDecoration(labelText: 'Supplier (optional)'),
            items: [
              const DropdownMenuItem<String?>(
                value: null,
                child: Text('Enter supplier name below'),
              ),
              for (final row in widget.suppliers)
                DropdownMenuItem<String?>(value: row.id, child: Text(row.name)),
            ],
            onChanged: (value) => setState(() => _supplierId = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          TextField(
            controller: _supplierName,
            decoration: const InputDecoration(
              labelText: 'Supplier name if not listed',
            ),
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _amount,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Order amount in paise',
            ),
            validator: (value) =>
                int.tryParse(value?.trim() ?? '') == null ||
                    int.parse(value!.trim()) < 0
                ? 'Enter a valid amount.'
                : null,
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: () {
              if (!_formKey.currentState!.validate() ||
                  _requisitionId == null ||
                  (_supplierId == null && _supplierName.text.trim().isEmpty)) {
                return;
              }
              Navigator.pop(
                context,
                _PurchaseOrderValues(
                  requisitionId: _requisitionId!,
                  supplierId: _supplierId,
                  supplierName: _supplierName.text.trim().isEmpty
                      ? null
                      : _supplierName.text.trim(),
                  amountMinor: int.parse(_amount.text.trim()),
                ),
              );
            },
            child: const Text('Create order'),
          ),
        ],
      ),
    ),
  );
}

class _GoodsReceiptSheet extends StatefulWidget {
  const _GoodsReceiptSheet({required this.orders, required this.items});
  final List<ProcurementPurchaseOrderRow> orders;
  final List<InventoryItemRow> items;
  @override
  State<_GoodsReceiptSheet> createState() => _GoodsReceiptSheetState();
}

class _GoodsReceiptSheetState extends State<_GoodsReceiptSheet> {
  final _formKey = GlobalKey<FormState>();
  final _quantity = TextEditingController();
  String? _orderId;
  String? _itemId;
  @override
  void initState() {
    super.initState();
    _orderId = widget.orders.first.id;
    _itemId = widget.items.first.id;
  }

  @override
  void dispose() {
    _quantity.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _SheetFrame(
    title: 'Post goods receipt',
    child: Form(
      key: _formKey,
      child: Column(
        children: [
          DropdownButtonFormField<String>(
            initialValue: _orderId,
            decoration: const InputDecoration(
              labelText: 'Ordered purchase order',
            ),
            items: [
              for (final row in widget.orders)
                DropdownMenuItem(value: row.id, child: Text(row.code)),
            ],
            onChanged: (value) => setState(() => _orderId = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _itemId,
            decoration: const InputDecoration(labelText: 'Inventory item'),
            items: [
              for (final row in widget.items)
                DropdownMenuItem(value: row.id, child: Text(row.name)),
            ],
            onChanged: (value) => setState(() => _itemId = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _quantity,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Quantity received'),
            validator: (value) =>
                int.tryParse(value?.trim() ?? '') == null ||
                    int.parse(value!.trim()) < 1
                ? 'Enter a positive quantity.'
                : null,
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: () {
              if (!_formKey.currentState!.validate() ||
                  _orderId == null ||
                  _itemId == null) {
                return;
              }
              Navigator.pop(
                context,
                _GoodsReceiptValues(
                  purchaseOrderId: _orderId!,
                  inventoryItemId: _itemId!,
                  quantity: int.parse(_quantity.text.trim()),
                ),
              );
            },
            child: const Text('Post receipt'),
          ),
        ],
      ),
    ),
  );
}

class _HostelBedSheet extends StatefulWidget {
  const _HostelBedSheet({required this.rooms});
  final List<HostelRoomRow> rooms;
  @override
  State<_HostelBedSheet> createState() => _HostelBedSheetState();
}

class _HostelBedSheetState extends State<_HostelBedSheet> {
  final _code = TextEditingController();
  String? _roomId;
  @override
  void initState() {
    super.initState();
    _roomId = widget.rooms.first.id;
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _SheetFrame(
    title: 'Add hostel bed',
    child: Column(
      children: [
        DropdownButtonFormField<String>(
          initialValue: _roomId,
          decoration: const InputDecoration(labelText: 'Room'),
          items: [
            for (final row in widget.rooms)
              DropdownMenuItem(
                value: row.id,
                child: Text('${row.building} Â· ${row.roomNumber}'),
              ),
          ],
          onChanged: (value) => setState(() => _roomId = value),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _code,
          decoration: const InputDecoration(labelText: 'Bed code'),
        ),
        const SizedBox(height: ErpSpacing.lg),
        FilledButton(
          onPressed: _roomId == null || _code.text.trim().isEmpty
              ? null
              : () => Navigator.pop(
                  context,
                  _HostelBedValues(roomId: _roomId!, code: _code.text.trim()),
                ),
          child: const Text('Create bed'),
        ),
      ],
    ),
  );
}

class _HostelAllotmentSheet extends StatefulWidget {
  const _HostelAllotmentSheet({
    required this.rooms,
    required this.beds,
    required this.students,
  });
  final List<HostelRoomRow> rooms;
  final List<HostelBedRow> beds;
  final List<HostelStudentOption> students;
  @override
  State<_HostelAllotmentSheet> createState() => _HostelAllotmentSheetState();
}

class _HostelAllotmentSheetState extends State<_HostelAllotmentSheet> {
  String? _roomId;
  String? _bedId;
  String? _studentId;
  @override
  void initState() {
    super.initState();
    _roomId = widget.rooms.first.id;
    _studentId = widget.students.first.id;
    _setFirstBed();
  }

  void _setFirstBed() {
    final beds = widget.beds.where((row) => row.roomId == _roomId).toList();
    _bedId = beds.isEmpty ? null : beds.first.id;
  }

  @override
  Widget build(BuildContext context) {
    final beds = widget.beds.where((row) => row.roomId == _roomId).toList();
    return _SheetFrame(
      title: 'Allot hostel bed',
      child: Column(
        children: [
          DropdownButtonFormField<String>(
            initialValue: _roomId,
            decoration: const InputDecoration(labelText: 'Room'),
            items: [
              for (final row in widget.rooms)
                DropdownMenuItem(
                  value: row.id,
                  child: Text('${row.building} Â· ${row.roomNumber}'),
                ),
            ],
            onChanged: (value) => setState(() {
              _roomId = value;
              _setFirstBed();
            }),
          ),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: beds.any((row) => row.id == _bedId) ? _bedId : null,
            decoration: const InputDecoration(labelText: 'Bed'),
            items: [
              for (final row in beds)
                DropdownMenuItem(value: row.id, child: Text(row.code)),
            ],
            onChanged: (value) => setState(() => _bedId = value),
          ),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _studentId,
            decoration: const InputDecoration(labelText: 'Student'),
            items: [
              for (final row in widget.students)
                DropdownMenuItem(value: row.id, child: Text(row.name)),
            ],
            onChanged: (value) => setState(() => _studentId = value),
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: _roomId == null || _bedId == null || _studentId == null
                ? null
                : () => Navigator.pop(
                    context,
                    _HostelAllotmentValues(
                      roomId: _roomId!,
                      bedId: _bedId!,
                      studentId: _studentId!,
                    ),
                  ),
            child: const Text('Allot bed'),
          ),
        ],
      ),
    );
  }
}

class _CanteenTransactionSheet extends StatefulWidget {
  const _CanteenTransactionSheet({required this.menu, required this.students});
  final List<CanteenMenuRow> menu;
  final List<CanteenStudentOption> students;
  @override
  State<_CanteenTransactionSheet> createState() =>
      _CanteenTransactionSheetState();
}

class _CanteenTransactionSheetState extends State<_CanteenTransactionSheet> {
  final _quantity = TextEditingController(text: '1');
  String? _menuId;
  String? _studentId;
  @override
  void initState() {
    super.initState();
    _menuId = widget.menu.first.id;
    _studentId = widget.students.first.id;
  }

  @override
  void dispose() {
    _quantity.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _SheetFrame(
    title: 'Record canteen transaction',
    child: Column(
      children: [
        DropdownButtonFormField<String>(
          initialValue: _menuId,
          decoration: const InputDecoration(labelText: 'Menu item'),
          items: [
            for (final row in widget.menu)
              DropdownMenuItem(
                value: row.id,
                child: Text('${row.name} Â· ${_money(row.priceMinor)}'),
              ),
          ],
          onChanged: (value) => setState(() => _menuId = value),
        ),
        const SizedBox(height: ErpSpacing.md),
        DropdownButtonFormField<String>(
          initialValue: _studentId,
          decoration: const InputDecoration(labelText: 'Student'),
          items: [
            for (final row in widget.students)
              DropdownMenuItem(value: row.id, child: Text(row.name)),
          ],
          onChanged: (value) => setState(() => _studentId = value),
        ),
        const SizedBox(height: ErpSpacing.md),
        TextField(
          controller: _quantity,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Quantity'),
        ),
        const SizedBox(height: ErpSpacing.lg),
        FilledButton(
          onPressed:
              _menuId == null ||
                  _studentId == null ||
                  int.tryParse(_quantity.text.trim()) == null
              ? null
              : () => Navigator.pop(
                  context,
                  _CanteenTransactionValues(
                    menuId: _menuId!,
                    studentId: _studentId!,
                    quantity: int.parse(_quantity.text.trim()),
                  ),
                ),
          child: const Text('Record transaction'),
        ),
      ],
    ),
  );
}

class _FacilityBookingSheet extends StatefulWidget {
  const _FacilityBookingSheet();
  @override
  State<_FacilityBookingSheet> createState() => _FacilityBookingSheetState();
}

class _FacilityBookingSheetState extends State<_FacilityBookingSheet> {
  final _formKey = GlobalKey<FormState>();
  final _facility = TextEditingController();
  final _purpose = TextEditingController();
  DateTime _startsAt = DateTime.now().add(const Duration(hours: 1));
  DateTime _endsAt = DateTime.now().add(const Duration(hours: 2));
  @override
  void dispose() {
    _facility.dispose();
    _purpose.dispose();
    super.dispose();
  }

  Future<void> _pick(bool start) async {
    final initial = start ? _startsAt : _endsAt;
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDate: initial,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (time == null) return;
    final value = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    setState(() {
      if (start) {
        _startsAt = value;
      } else {
        _endsAt = value;
      }
    });
  }

  @override
  Widget build(BuildContext context) => _SheetFrame(
    title: 'Request facility booking',
    child: Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _facility,
            decoration: const InputDecoration(labelText: 'Facility name'),
            validator: (value) => value == null || value.trim().isEmpty
                ? 'Enter a facility.'
                : null,
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _purpose,
            decoration: const InputDecoration(labelText: 'Purpose'),
            validator: (value) => value == null || value.trim().isEmpty
                ? 'Enter a purpose.'
                : null,
          ),
          const SizedBox(height: ErpSpacing.md),
          OutlinedButton.icon(
            onPressed: () => _pick(true),
            icon: const Icon(Icons.calendar_today),
            label: Text(
              'Starts ${DateFormat('d MMM yyyy, h:mm a').format(_startsAt)}',
            ),
          ),
          OutlinedButton.icon(
            onPressed: () => _pick(false),
            icon: const Icon(Icons.event),
            label: Text(
              'Ends ${DateFormat('d MMM yyyy, h:mm a').format(_endsAt)}',
            ),
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: () {
              if (!_formKey.currentState!.validate() ||
                  !_endsAt.isAfter(_startsAt)) {
                return;
              }
              Navigator.pop(
                context,
                _FacilityBookingValues(
                  facilityName: _facility.text.trim(),
                  purpose: _purpose.text.trim(),
                  startsAt: _startsAt,
                  endsAt: _endsAt,
                ),
              );
            },
            child: const Text('Request booking'),
          ),
        ],
      ),
    ),
  );
}

class _SheetFrame extends StatelessWidget {
  const _SheetFrame({required this.title, required this.child});
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
String _title(String value) => value
    .replaceAll('_', ' ')
    .split(' ')
    .map(
      (word) =>
          word.isEmpty ? word : '${word[0].toUpperCase()}${word.substring(1)}',
    )
    .join(' ');
String _nextLabel(String status) {
  final statuses = _nextStatuses(status);
  return _title(statuses.isEmpty ? 'Update' : statuses.first);
}

List<String> _nextStatuses(String status) => switch (status) {
  'draft' => ['submitted', 'cancelled'],
  'submitted' => ['approved', 'rejected', 'cancelled'],
  'approved' => ['converted', 'cancelled'],
  'rejected' => ['draft', 'cancelled'],
  'requested' => ['approved', 'rejected', 'cancelled'],
  'active' => ['completed', 'cancelled'],
  'open' => ['in_progress', 'cancelled'],
  'in_progress' => ['completed', 'cancelled'],
  'resolved' => ['closed'],
  'ordered' => ['partially_received', 'received', 'cancelled'],
  'partially_received' => ['received', 'cancelled'],
  _ => <String>[],
};
List<String> _requisitionNextStatuses(String status) => switch (status) {
  'draft' => ['submitted', 'cancelled'],
  'submitted' => ['approved', 'rejected', 'cancelled'],
  'approved' => ['converted', 'cancelled'],
  'rejected' => ['draft', 'cancelled'],
  _ => <String>[],
};
List<String> _purchaseOrderNextStatuses(String status) => switch (status) {
  'draft' => ['submitted', 'cancelled'],
  'submitted' => ['approved', 'cancelled'],
  'approved' => ['ordered', 'cancelled'],
  'ordered' => ['partially_received', 'received', 'cancelled'],
  'partially_received' => ['received', 'cancelled'],
  _ => <String>[],
};
List<String> _bookingNextStatuses(String status) => switch (status) {
  'requested' => ['approved', 'rejected', 'cancelled'],
  'approved' => ['completed', 'cancelled'],
  _ => <String>[],
};
List<String> _maintenanceNextStatuses(String status) => switch (status) {
  'open' => ['in_progress', 'cancelled'],
  'in_progress' => ['completed', 'cancelled'],
  _ => <String>[],
};
List<String> _complaintNextStatuses(String status) => switch (status) {
  'open' => ['in_progress', 'rejected'],
  'in_progress' => ['resolved', 'rejected'],
  'resolved' => ['closed'],
  _ => <String>[],
};
