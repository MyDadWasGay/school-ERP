import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/library_models.dart';
import '../../../shared/models/workspace_models.dart';
import '../../../shared/widgets/erp_states.dart';

class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});

  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen> {
  Future<void> _refresh() async {
    ref.invalidate(libraryProvider);
    ref.invalidate(libraryCopiesProvider);
    ref.invalidate(libraryReservationsProvider);
    await Future.wait([
      ref.read(libraryProvider.future),
      ref.read(libraryReservationsProvider.future),
    ]);
  }

  Future<void> _reserve(LibraryItem item) async {
    try {
      await ref.read(apiClientProvider).reserveLibraryItem(item.id);
      ref.invalidate(libraryReservationsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Reservation saved for ${item.title}.')),
        );
      }
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    }
  }

  Future<void> _openIssueForm() async {
    try {
      final copies = await ref.read(libraryCopiesProvider.future);
      final students = await ref.read(studentDirectoryProvider('').future);
      if (!mounted) return;
      if (copies.isEmpty || students.rows.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Available copies and active students are required.'),
          ),
        );
        return;
      }
      final issued = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        builder: (_) => _IssueForm(copies: copies, students: students.rows),
      );
      if (issued == true) await _refresh();
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    }
  }

  Future<void> _openCreateForm(String kind) async {
    final items = kind == 'copy'
        ? await ref
              .read(libraryProvider.future)
              .then((value) => value?.items ?? const <LibraryItem>[])
        : const <LibraryItem>[];
    if (!mounted) return;
    final values = await showModalBottomSheet<Map<String, String?>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => switch (kind) {
        'item' => const _LibraryItemForm(),
        'copy' => _LibraryCopyForm(items: items),
        _ => const _DigitalResourceForm(),
      },
    );
    if (values == null || !mounted) return;
    try {
      final api = ref.read(apiClientProvider);
      switch (kind) {
        case 'item':
          await api.createLibraryItem(
            title: values['title']!,
            author: values['author'],
            isbn: values['isbn'],
          );
        case 'copy':
          await api.addLibraryCopy(
            itemId: values['itemId']!,
            accessionNumber: values['accessionNumber']!,
          );
        default:
          await api.createDigitalResource(
            name: values['name']!,
            url: values['url']!,
            description: values['description'],
          );
      }
      await _refresh();
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    }
  }

  Future<void> _renew(LibraryIssue issue) async {
    try {
      await ref
          .read(apiClientProvider)
          .renewLibraryCopy(transactionId: issue.id);
      await _refresh();
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    }
  }

  Future<void> _return(LibraryIssue issue) async {
    final outcome = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Return library copy'),
        content: const Text('Choose the condition recorded by the librarian.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, 'returned'),
            child: const Text('Returned'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, 'damaged'),
            child: const Text('Damaged'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, 'lost'),
            child: const Text('Lost'),
          ),
        ],
      ),
    );
    if (outcome == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .returnLibraryCopy(transactionId: issue.id, outcome: outcome);
      await _refresh();
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final canIssue =
        ref.watch(sessionProvider).valueOrNull?.can('library:create') == true;
    final canCreate = canIssue;
    final canUpdate =
        ref.watch(sessionProvider).valueOrNull?.can('library:update') == true;
    final role = ref.watch(sessionProvider).valueOrNull?.role;
    final library = ref.watch(libraryProvider);
    final reservations = ref.watch(libraryReservationsProvider);
    return library.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(libraryProvider),
      ),
      data: (overview) {
        if (overview == null) {
          return const ErpEmptyState(
            icon: Icons.lock_outline,
            title: 'Library is not available',
            message:
                'Your account does not have access to library information.',
          );
        }
        if (overview.issues.isEmpty &&
            overview.items.isEmpty &&
            overview.resources.isEmpty &&
            reservations.valueOrNull?.isEmpty != false &&
            !canIssue) {
          return const ErpEmptyState(
            icon: Icons.local_library_outlined,
            title: 'Library is empty',
            message:
                'Books and digital resources will appear here when published.',
          );
        }
        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(ErpSpacing.lg),
            children: [
              if (canCreate)
                Wrap(
                  spacing: ErpSpacing.sm,
                  runSpacing: ErpSpacing.sm,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => _openCreateForm('item'),
                      icon: const Icon(Icons.book_outlined),
                      label: const Text('Add title'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => _openCreateForm('copy'),
                      icon: const Icon(Icons.qr_code_2_outlined),
                      label: const Text('Add copy'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => _openCreateForm('resource'),
                      icon: const Icon(Icons.link_outlined),
                      label: const Text('Add resource'),
                    ),
                  ],
                ),
              if (canCreate) const SizedBox(height: ErpSpacing.lg),
              if (canIssue) ...[
                FilledButton.icon(
                  onPressed: _openIssueForm,
                  icon: const Icon(Icons.assignment_turned_in_outlined),
                  label: const Text('Issue a book'),
                ),
                const SizedBox(height: ErpSpacing.lg),
              ],
              if (overview.issues.isNotEmpty) ...[
                const _SectionHeader('My active loans'),
                const SizedBox(height: ErpSpacing.sm),
                for (final issue in overview.issues) ...[
                  _IssueCard(
                    issue,
                    canUpdate: canUpdate,
                    onRenew: () => _renew(issue),
                    onReturn: () => _return(issue),
                  ),
                  const SizedBox(height: ErpSpacing.sm),
                ],
                const SizedBox(height: ErpSpacing.md),
              ],
              if (overview.items.isNotEmpty) ...[
                const _SectionHeader('Library catalogue'),
                const SizedBox(height: ErpSpacing.sm),
                for (final item in overview.items) ...[
                  _ItemCard(
                    item,
                    onReserve: canUpdate ? () => _reserve(item) : null,
                  ),
                  const SizedBox(height: ErpSpacing.sm),
                ],
                const SizedBox(height: ErpSpacing.md),
              ],
              if (reservations.valueOrNull?.isNotEmpty == true) ...[
                _SectionHeader(
                  role == 'student' || role == 'parent'
                      ? 'My reservations'
                      : 'Reservations',
                ),
                const SizedBox(height: ErpSpacing.sm),
                for (final reservation in reservations.valueOrNull!) ...[
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.bookmark_outline),
                      title: Text(reservation.name),
                      subtitle: Text(
                        'Requested ${DateFormat('d MMM yyyy').format(reservation.createdAt.toLocal())}',
                      ),
                      trailing: ErpStatusChip(reservation.status),
                    ),
                  ),
                  const SizedBox(height: ErpSpacing.sm),
                ],
                const SizedBox(height: ErpSpacing.md),
              ],
              if (overview.resources.isNotEmpty) ...[
                const _SectionHeader('Digital resources'),
                const SizedBox(height: ErpSpacing.sm),
                for (final resource in overview.resources) ...[
                  _ResourceCard(resource),
                  const SizedBox(height: ErpSpacing.sm),
                ],
              ],
              const SizedBox(height: ErpSpacing.xxl),
            ],
          ),
        );
      },
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);
  final String title;

  @override
  Widget build(BuildContext context) => Text(
    title,
    style: Theme.of(
      context,
    ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
  );
}

class _IssueCard extends StatelessWidget {
  const _IssueCard(
    this.issue, {
    required this.canUpdate,
    required this.onRenew,
    required this.onReturn,
  });
  final LibraryIssue issue;
  final bool canUpdate;
  final VoidCallback onRenew;
  final VoidCallback onReturn;

  @override
  Widget build(BuildContext context) {
    final overdue =
        issue.dueAt != null && issue.dueAt!.isBefore(DateTime.now());
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(ErpSpacing.sm),
        child: Column(
          children: [
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(
                child: Icon(
                  overdue
                      ? Icons.warning_amber_outlined
                      : Icons.menu_book_outlined,
                ),
              ),
              title: Text(issue.title),
              subtitle: Text(
                'Copy ${issue.accessionNumber} · Due ${issue.dueAt == null ? 'not set' : DateFormat('d MMM yyyy').format(issue.dueAt!.toLocal())}',
              ),
              trailing: ErpStatusChip(overdue ? 'overdue' : 'issued'),
            ),
            if (canUpdate)
              Align(
                alignment: Alignment.centerRight,
                child: Wrap(
                  spacing: ErpSpacing.sm,
                  children: [
                    TextButton(onPressed: onRenew, child: const Text('Renew')),
                    FilledButton.tonal(
                      onPressed: onReturn,
                      child: const Text('Return'),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ItemCard extends StatelessWidget {
  const _ItemCard(this.item, {this.onReserve});
  final LibraryItem item;
  final VoidCallback? onReserve;

  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      leading: const CircleAvatar(child: Icon(Icons.book_outlined)),
      title: Text(item.title),
      subtitle: Text(
        [
          if (item.author?.isNotEmpty == true) item.author!,
          if (item.isbn?.isNotEmpty == true) 'ISBN ${item.isbn}',
        ].join(' · '),
      ),
      trailing: onReserve == null
          ? Text(
              '${item.availableCopies}/${item.totalCopies}',
              semanticsLabel:
                  '${item.availableCopies} of ${item.totalCopies} copies available',
              style: Theme.of(context).textTheme.titleSmall,
            )
          : Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('${item.availableCopies}/${item.totalCopies}'),
                TextButton(onPressed: onReserve, child: const Text('Reserve')),
              ],
            ),
    ),
  );
}

class _ResourceCard extends StatelessWidget {
  const _ResourceCard(this.resource);
  final DigitalResource resource;

  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      leading: const CircleAvatar(child: Icon(Icons.link_outlined)),
      title: Text(resource.name),
      subtitle: Text(resource.description ?? 'Digital learning resource'),
      trailing: resource.url == null
          ? null
          : IconButton(
              tooltip: 'Copy resource link',
              icon: const Icon(Icons.content_copy_outlined),
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: resource.url!));
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Resource link copied.')),
                  );
                }
              },
            ),
    ),
  );
}

class _LibraryFormFrame extends StatelessWidget {
  const _LibraryFormFrame({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      ErpSpacing.lg,
      ErpSpacing.lg,
      ErpSpacing.lg,
      MediaQuery.viewInsetsOf(context).bottom + ErpSpacing.lg,
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
          const SizedBox(height: ErpSpacing.lg),
          child,
        ],
      ),
    ),
  );
}

class _LibraryItemForm extends StatefulWidget {
  const _LibraryItemForm();
  @override
  State<_LibraryItemForm> createState() => _LibraryItemFormState();
}

class _LibraryItemFormState extends State<_LibraryItemForm> {
  final _key = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _author = TextEditingController();
  final _isbn = TextEditingController();

  @override
  void dispose() {
    _title.dispose();
    _author.dispose();
    _isbn.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _LibraryFormFrame(
    title: 'Add catalogue title',
    child: Form(
      key: _key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _title,
            decoration: const InputDecoration(labelText: 'Title'),
            validator: (value) => value == null || value.trim().length < 2
                ? 'Enter a title'
                : null,
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _author,
            decoration: const InputDecoration(labelText: 'Author (optional)'),
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _isbn,
            decoration: const InputDecoration(labelText: 'ISBN (optional)'),
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: () {
              if (!_key.currentState!.validate()) return;
              Navigator.pop(context, {
                'title': _title.text.trim(),
                'author': _author.text.trim(),
                'isbn': _isbn.text.trim(),
              });
            },
            child: const Text('Save title'),
          ),
        ],
      ),
    ),
  );
}

class _LibraryCopyForm extends StatefulWidget {
  const _LibraryCopyForm({required this.items});
  final List<LibraryItem> items;

  @override
  State<_LibraryCopyForm> createState() => _LibraryCopyFormState();
}

class _LibraryCopyFormState extends State<_LibraryCopyForm> {
  final _key = GlobalKey<FormState>();
  final _accession = TextEditingController();
  String? _itemId;

  @override
  void initState() {
    super.initState();
    _itemId = widget.items.isEmpty ? null : widget.items.first.id;
  }

  @override
  void dispose() {
    _accession.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _LibraryFormFrame(
    title: 'Add library copy',
    child: Form(
      key: _key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _itemId,
            decoration: const InputDecoration(labelText: 'Catalogue title'),
            items: [
              for (final item in widget.items)
                DropdownMenuItem(value: item.id, child: Text(item.title)),
            ],
            onChanged: (value) => setState(() => _itemId = value),
            validator: (value) => value == null ? 'Select a title' : null,
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _accession,
            decoration: const InputDecoration(
              labelText: 'Accession / barcode number',
            ),
            validator: (value) => value == null || value.trim().length < 2
                ? 'Enter an accession number'
                : null,
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: widget.items.isEmpty
                ? null
                : () {
                    if (!_key.currentState!.validate()) return;
                    Navigator.pop(context, {
                      'itemId': _itemId,
                      'accessionNumber': _accession.text.trim(),
                    });
                  },
            child: const Text('Save copy'),
          ),
        ],
      ),
    ),
  );
}

class _DigitalResourceForm extends StatefulWidget {
  const _DigitalResourceForm();
  @override
  State<_DigitalResourceForm> createState() => _DigitalResourceFormState();
}

class _DigitalResourceFormState extends State<_DigitalResourceForm> {
  final _key = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _url = TextEditingController();
  final _description = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _url.dispose();
    _description.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _LibraryFormFrame(
    title: 'Add digital resource',
    child: Form(
      key: _key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Name'),
            validator: (value) => value == null || value.trim().length < 2
                ? 'Enter a name'
                : null,
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _url,
            keyboardType: TextInputType.url,
            decoration: const InputDecoration(labelText: 'Resource URL'),
            validator: (value) =>
                Uri.tryParse(value?.trim() ?? '')?.hasScheme != true
                ? 'Enter a valid URL'
                : null,
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _description,
            decoration: const InputDecoration(
              labelText: 'Description (optional)',
            ),
            maxLines: 3,
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: () {
              if (!_key.currentState!.validate()) return;
              Navigator.pop(context, {
                'name': _name.text.trim(),
                'url': _url.text.trim(),
                'description': _description.text.trim(),
              });
            },
            child: const Text('Save resource'),
          ),
        ],
      ),
    ),
  );
}

class _IssueForm extends ConsumerStatefulWidget {
  const _IssueForm({required this.copies, required this.students});
  final List<LibraryCopyRow> copies;
  final List<StudentDirectoryRow> students;

  @override
  ConsumerState<_IssueForm> createState() => _IssueFormState();
}

class _IssueFormState extends ConsumerState<_IssueForm> {
  final _formKey = GlobalKey<FormState>();
  String? _copyId;
  String? _studentId;
  DateTime _dueAt = DateTime.now().add(const Duration(days: 14));
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _copyId = widget.copies.first.id;
    _studentId = widget.students.first.id;
  }

  Future<void> _pickDueDate() async {
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 60)),
      initialDate: _dueAt,
    );
    if (picked == null || !mounted) return;
    setState(
      () => _dueAt = DateTime(picked.year, picked.month, picked.day, 17),
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() ||
        _copyId == null ||
        _studentId == null) {
      return;
    }
    setState(() => _saving = true);
    try {
      await ref
          .read(apiClientProvider)
          .issueLibraryCopy(
            copyId: _copyId!,
            borrowerId: _studentId!,
            dueAt: _dueAt,
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
              'Issue a library book',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: ErpSpacing.lg),
            DropdownButtonFormField<String>(
              initialValue: _copyId,
              decoration: const InputDecoration(
                labelText: 'Available copy',
                prefixIcon: Icon(Icons.menu_book_outlined),
              ),
              items: [
                for (final copy in widget.copies)
                  DropdownMenuItem(
                    value: copy.id,
                    child: Text('${copy.title} · ${copy.accessionNumber}'),
                  ),
              ],
              onChanged: _saving
                  ? null
                  : (value) => setState(() => _copyId = value),
            ),
            const SizedBox(height: ErpSpacing.md),
            DropdownButtonFormField<String>(
              initialValue: _studentId,
              decoration: const InputDecoration(
                labelText: 'Student borrower',
                prefixIcon: Icon(Icons.school_outlined),
              ),
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
            OutlinedButton.icon(
              onPressed: _saving ? null : _pickDueDate,
              icon: const Icon(Icons.event_outlined),
              label: Align(
                alignment: Alignment.centerLeft,
                child: Text('Due ${DateFormat('d MMM yyyy').format(_dueAt)}'),
              ),
            ),
            const SizedBox(height: ErpSpacing.lg),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? 'Saving…' : 'Issue book'),
            ),
          ],
        ),
      ),
    ),
  );
}
