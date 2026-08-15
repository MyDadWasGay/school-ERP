import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/communication_models.dart';
import '../../../shared/widgets/erp_states.dart';

class CommunicationWorkspaceScreen extends ConsumerStatefulWidget {
  const CommunicationWorkspaceScreen({super.key});

  @override
  ConsumerState<CommunicationWorkspaceScreen> createState() =>
      _CommunicationWorkspaceScreenState();
}

class _CommunicationWorkspaceScreenState
    extends ConsumerState<CommunicationWorkspaceScreen> {
  Future<void> _refresh() async {
    ref.invalidate(noticesProvider);
    ref.invalidate(messagesProvider);
    await Future.wait([
      ref.read(noticesProvider.future),
      ref.read(messagesProvider.future),
    ]);
  }

  Future<void> _createNotice() async {
    final values = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _NoticeForm(),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createNotice(
            title: values['title']!,
            body: values['body']!,
            audience: values['audience']!,
          );
      ref.invalidate(noticesProvider);
    } on Object catch (error) {
      if (mounted) _showError(error);
    }
  }

  Future<void> _transitionNotice(NoticeRow notice, String status) async {
    try {
      await ref.read(apiClientProvider).transitionNotice(notice.id, status);
      ref.invalidate(noticesProvider);
    } on Object catch (error) {
      if (mounted) _showError(error);
    }
  }

  Future<void> _createMessage() async {
    final values = await showModalBottomSheet<Map<String, String?>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _MessageForm(),
    );
    if (values == null || !mounted) return;
    try {
      await ref
          .read(apiClientProvider)
          .createMessage(
            subject: values['subject']!,
            body: values['body']!,
            audienceType: values['audienceType']!,
            audienceRole: values['audienceRole'],
          );
      ref.invalidate(messagesProvider);
    } on Object catch (error) {
      if (mounted) _showError(error);
    }
  }

  Future<void> _publishMessage(CommunicationMessageRow message) async {
    try {
      await ref.read(apiClientProvider).publishMessage(message.id);
      ref.invalidate(messagesProvider);
      ref.invalidate(notificationsProvider);
    } on Object catch (error) {
      if (mounted) _showError(error);
    }
  }

  void _showError(Object error) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(readableApiError(error))));
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final canCreate = user?.can('communication:create') == true;
    final canUpdate = user?.can('communication:update') == true;
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          const TabBar(
            tabs: [
              Tab(text: 'Announcements'),
              Tab(text: 'Messages'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _NoticesTab(
                  canCreate: canCreate,
                  canUpdate: canUpdate,
                  onCreate: _createNotice,
                  onTransition: _transitionNotice,
                  onRefresh: _refresh,
                ),
                _MessagesTab(
                  canCreate: canCreate,
                  canUpdate: canUpdate,
                  onCreate: _createMessage,
                  onPublish: _publishMessage,
                  onRefresh: _refresh,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NoticesTab extends ConsumerWidget {
  const _NoticesTab({
    required this.canCreate,
    required this.canUpdate,
    required this.onCreate,
    required this.onTransition,
    required this.onRefresh,
  });

  final bool canCreate;
  final bool canUpdate;
  final VoidCallback onCreate;
  final Future<void> Function(NoticeRow notice, String status) onTransition;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(noticesProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(noticesProvider),
      ),
      data: (rows) => RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(ErpSpacing.lg),
          itemCount: rows.length + (canCreate ? 1 : 0),
          separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
          itemBuilder: (context, index) {
            if (canCreate && index == 0) {
              return FilledButton.icon(
                onPressed: onCreate,
                icon: const Icon(Icons.add_alert_outlined),
                label: const Text('Create announcement'),
              );
            }
            final notice = rows[canCreate ? index - 1 : index];
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
                    Text(notice.body),
                    const SizedBox(height: ErpSpacing.md),
                    Wrap(
                      spacing: ErpSpacing.md,
                      runSpacing: ErpSpacing.xs,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text('Audience: ${_audience(notice.audience)}'),
                        if (notice.publishedAt != null)
                          Text(
                            DateFormat(
                              'd MMM yyyy, h:mm a',
                            ).format(notice.publishedAt!.toLocal()),
                          ),
                      ],
                    ),
                    if (canUpdate && notice.status == 'draft')
                      Align(
                        alignment: Alignment.centerRight,
                        child: FilledButton.tonal(
                          onPressed: () => onTransition(notice, 'published'),
                          child: const Text('Publish'),
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

  static String _audience(String value) => switch (value) {
    'all' => 'Everyone',
    'students' => 'Students',
    'parents' => 'Parents',
    'teachers' => 'Teachers',
    'staff' => 'Staff',
    _ => value,
  };
}

class _MessagesTab extends ConsumerWidget {
  const _MessagesTab({
    required this.canCreate,
    required this.canUpdate,
    required this.onCreate,
    required this.onPublish,
    required this.onRefresh,
  });

  final bool canCreate;
  final bool canUpdate;
  final VoidCallback onCreate;
  final Future<void> Function(CommunicationMessageRow message) onPublish;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(messagesProvider);
    return value.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(messagesProvider),
      ),
      data: (rows) => RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(ErpSpacing.lg),
          itemCount: rows.length + (canCreate ? 1 : 0),
          separatorBuilder: (_, _) => const SizedBox(height: ErpSpacing.sm),
          itemBuilder: (context, index) {
            if (canCreate && index == 0) {
              return FilledButton.icon(
                onPressed: onCreate,
                icon: const Icon(Icons.mail_outline),
                label: const Text('Create message'),
              );
            }
            final message = rows[canCreate ? index - 1 : index];
            final audience = message.audience.type == 'role'
                ? 'Role: ${message.audience.role ?? 'not set'}'
                : 'Everyone';
            return Card(
              child: ListTile(
                contentPadding: const EdgeInsets.all(ErpSpacing.md),
                leading: const CircleAvatar(child: Icon(Icons.mail_outline)),
                title: Text(message.subject),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: ErpSpacing.xs),
                  child: Text(
                    '${message.body}\n$audience',
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                isThreeLine: true,
                trailing: canUpdate && message.status == 'draft'
                    ? IconButton(
                        tooltip: 'Publish message',
                        onPressed: () => onPublish(message),
                        icon: const Icon(Icons.send_outlined),
                      )
                    : ErpStatusChip(message.status),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _NoticeForm extends StatefulWidget {
  const _NoticeForm();

  @override
  State<_NoticeForm> createState() => _NoticeFormState();
}

class _NoticeFormState extends State<_NoticeForm> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _body = TextEditingController();
  String _audience = 'all';

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _SheetScaffold(
    title: 'Create announcement',
    child: Form(
      key: _formKey,
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
          DropdownButtonFormField<String>(
            initialValue: _audience,
            decoration: const InputDecoration(labelText: 'Audience'),
            items: const [
              DropdownMenuItem(value: 'all', child: Text('Everyone')),
              DropdownMenuItem(value: 'students', child: Text('Students')),
              DropdownMenuItem(value: 'parents', child: Text('Parents')),
              DropdownMenuItem(value: 'teachers', child: Text('Teachers')),
              DropdownMenuItem(value: 'staff', child: Text('Staff')),
            ],
            onChanged: (value) => setState(() => _audience = value ?? 'all'),
          ),
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _body,
            minLines: 5,
            maxLines: 9,
            decoration: const InputDecoration(labelText: 'Announcement'),
            validator: (value) => value == null || value.trim().length < 2
                ? 'Enter the announcement'
                : null,
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: () {
              if (!_formKey.currentState!.validate()) return;
              Navigator.pop(context, {
                'title': _title.text.trim(),
                'body': _body.text.trim(),
                'audience': _audience,
              });
            },
            child: const Text('Save draft'),
          ),
        ],
      ),
    ),
  );
}

class _MessageForm extends StatefulWidget {
  const _MessageForm();

  @override
  State<_MessageForm> createState() => _MessageFormState();
}

class _MessageFormState extends State<_MessageForm> {
  final _formKey = GlobalKey<FormState>();
  final _subject = TextEditingController();
  final _body = TextEditingController();
  String _audienceType = 'all';
  String? _audienceRole;

  @override
  void dispose() {
    _subject.dispose();
    _body.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _SheetScaffold(
    title: 'Create message',
    child: Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _subject,
            decoration: const InputDecoration(labelText: 'Subject'),
            validator: (value) => value == null || value.trim().length < 3
                ? 'Enter a subject'
                : null,
          ),
          const SizedBox(height: ErpSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _audienceType,
            decoration: const InputDecoration(labelText: 'Recipients'),
            items: const [
              DropdownMenuItem(value: 'all', child: Text('Everyone')),
              DropdownMenuItem(value: 'role', child: Text('A role')),
            ],
            onChanged: (value) => setState(() {
              _audienceType = value ?? 'all';
              if (_audienceType == 'all') _audienceRole = null;
            }),
          ),
          if (_audienceType == 'role') ...[
            const SizedBox(height: ErpSpacing.md),
            TextFormField(
              decoration: const InputDecoration(
                labelText: 'Role',
                hintText: 'teacher, parent, accountant',
              ),
              onChanged: (value) => _audienceRole = value,
              validator: (value) =>
                  _audienceType == 'role' &&
                      (value == null || value.trim().isEmpty)
                  ? 'Enter a role'
                  : null,
            ),
          ],
          const SizedBox(height: ErpSpacing.md),
          TextFormField(
            controller: _body,
            minLines: 5,
            maxLines: 9,
            decoration: const InputDecoration(labelText: 'Message'),
            validator: (value) => value == null || value.trim().length < 3
                ? 'Enter the message'
                : null,
          ),
          const SizedBox(height: ErpSpacing.lg),
          FilledButton(
            onPressed: () {
              if (!_formKey.currentState!.validate()) return;
              Navigator.pop(context, {
                'subject': _subject.text.trim(),
                'body': _body.text.trim(),
                'audienceType': _audienceType,
                'audienceRole': _audienceRole?.trim(),
              });
            },
            child: const Text('Save draft'),
          ),
        ],
      ),
    ),
  );
}

class _SheetScaffold extends StatelessWidget {
  const _SheetScaffold({required this.title, required this.child});

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
