import 'package:file_picker/file_picker.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/api/api_error.dart';
import '../../../core/providers.dart';
import '../../../shared/models/document_models.dart';
import '../../../shared/models/identity_models.dart';
import '../../../shared/models/student_models.dart';
import '../../../shared/widgets/erp_states.dart';

class EntityDocumentsSheet extends ConsumerStatefulWidget {
  const EntityDocumentsSheet({
    super.key,
    required this.entityType,
    required this.entityId,
    required this.title,
  });

  final String entityType;
  final String entityId;
  final String title;

  @override
  ConsumerState<EntityDocumentsSheet> createState() =>
      _EntityDocumentsSheetState();
}

class _EntityDocumentsSheetState extends ConsumerState<EntityDocumentsSheet> {
  late Future<List<DocumentRow>> _future;
  double? _progress;
  bool _uploading = false;
  CancelToken? _uploadCancelToken;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<DocumentRow>> _load() => ref
      .read(apiClientProvider)
      .getEntityDocuments(
        entityType: widget.entityType,
        entityId: widget.entityId,
      );

  bool _canUpload(CurrentUser user) =>
      user.can('documents:create') ||
      (widget.entityType == 'assignment_submission' &&
          (user.role == 'student' || user.role == 'parent') &&
          user.can('academics:read'));

  Future<void> _pickAndUpload(CurrentUser user) async {
    if (!_canUpload(user) || _uploading) return;
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: false,
      withData: false,
      type: FileType.custom,
      allowedExtensions: const [
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'csv',
        'jpg',
        'jpeg',
        'png',
        'webp',
      ],
    );
    final file = result?.files.single;
    if (file == null) return;
    final format = (file.extension ?? '').toLowerCase();
    final isImage = {'jpg', 'jpeg', 'png', 'webp'}.contains(format);
    final maxBytes = isImage ? 5_000_000 : 25_000_000;
    if (file.size <= 0 || file.size > maxBytes) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isImage
                  ? 'Images must be 5 MB or smaller.'
                  : 'Documents must be 25 MB or smaller.',
            ),
          ),
        );
      }
      return;
    }
    if (file.path == null || file.path!.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('This file could not be accessed.')),
        );
      }
      return;
    }
    final cancelToken = CancelToken();
    setState(() {
      _uploading = true;
      _progress = null;
      _uploadCancelToken = cancelToken;
    });
    try {
      await ref
          .read(apiClientProvider)
          .uploadDocument(
            entityType: widget.entityType,
            entityId: widget.entityId,
            category: widget.entityType == 'employee'
                ? 'staff_document'
                : 'assignment_attachment',
            file: UploadableFile(
              name: file.name,
              size: file.size,
              format: format,
              resourceType: isImage ? 'image' : 'raw',
              path: file.path,
              bytes: file.bytes,
            ),
            cancelToken: cancelToken,
            onSendProgress: (sent, total) {
              if (!mounted) return;
              setState(() => _progress = total > 0 ? sent / total : null);
            },
          );
      if (mounted) {
        setState(() => _future = _load());
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Document uploaded.')));
      }
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(
          SnackBar(
            content: Text(
              error is DioException && CancelToken.isCancel(error)
                  ? 'Upload cancelled.'
                  : readableApiError(error),
            ),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _uploading = false;
          _progress = null;
          _uploadCancelToken = null;
        });
      }
    }
  }

  Future<void> _open(DocumentRow document) async {
    final opened = await launchUrl(
      Uri.parse(document.secureUrl),
      mode: LaunchMode.externalApplication,
    );
    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This document could not be opened.')),
      );
    }
  }

  String _size(int? bytes) {
    if (bytes == null || bytes <= 0) return 'Size unavailable';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).ceil()} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).valueOrNull;
    return Padding(
      padding: EdgeInsets.only(
        left: ErpSpacing.lg,
        right: ErpSpacing.lg,
        top: ErpSpacing.lg,
        bottom: MediaQuery.viewInsetsOf(context).bottom + ErpSpacing.lg,
      ),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.72,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    widget.title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (user != null && _canUpload(user))
                  IconButton(
                    tooltip: 'Upload document',
                    onPressed: _uploading ? null : () => _pickAndUpload(user),
                    icon: const Icon(Icons.upload_file_outlined),
                  ),
              ],
            ),
            if (_uploading) ...[
              const SizedBox(height: ErpSpacing.sm),
              LinearProgressIndicator(value: _progress),
              const SizedBox(height: ErpSpacing.sm),
              Text(
                _progress == null
                    ? 'Uploading document…'
                    : 'Uploading ${(_progress! * 100).round()}%',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              IconButton(
                tooltip: 'Cancel upload',
                onPressed: () => _uploadCancelToken?.cancel(),
                icon: const Icon(Icons.close),
              ),
            ],
            const SizedBox(height: ErpSpacing.sm),
            Expanded(
              child: FutureBuilder<List<DocumentRow>>(
                future: _future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const ErpLoadingList();
                  }
                  if (snapshot.hasError) {
                    return ErpErrorState(
                      error: snapshot.error!,
                      onRetry: () => setState(() => _future = _load()),
                    );
                  }
                  final documents = snapshot.data ?? const <DocumentRow>[];
                  if (documents.isEmpty) {
                    return const ErpEmptyState(
                      icon: Icons.folder_open_outlined,
                      title: 'No documents yet',
                      message: 'Uploaded documents will appear here.',
                    );
                  }
                  return ListView.separated(
                    itemCount: documents.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: ErpSpacing.sm),
                    itemBuilder: (context, index) {
                      final document = documents[index];
                      final name =
                          document.originalFilename?.trim().isNotEmpty == true
                          ? document.originalFilename!
                          : document.category;
                      return Card(
                        child: ListTile(
                          leading: const CircleAvatar(
                            child: Icon(Icons.description_outlined),
                          ),
                          title: Text(name),
                          subtitle: Text(
                            '${document.format?.toUpperCase() ?? 'FILE'} · ${_size(document.bytes)} · ${DateFormat('d MMM yyyy').format(document.createdAt.toLocal())}',
                          ),
                          trailing: const Icon(Icons.open_in_new_outlined),
                          onTap: () => _open(document),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
