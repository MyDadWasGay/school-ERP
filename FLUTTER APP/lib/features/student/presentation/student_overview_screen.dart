import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../../core/api/api_error.dart';
import '../../../shared/models/attendance_models.dart';
import '../../../shared/models/document_models.dart';
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
      length: 5,
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
                  _StudentDocumentsSection(
                    summary: data.documentSummary,
                    documents: data.detailedDocuments,
                    documentTypes: data.documentTypes ?? const [],
                    studentId: selectedId,
                    canUpload:
                        session?.can('documents:create') == true ||
                        ['student', 'parent'].contains(session?.role),
                    canVerify:
                        session?.can('documents:verify') == true ||
                        session?.can('documents:approve') == true,
                    canDelete: session?.can('documents:delete') == true,
                  ),
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

class _StudentDocumentsSection extends ConsumerWidget {
  const _StudentDocumentsSection({
    required this.summary,
    required this.documents,
    required this.documentTypes,
    required this.studentId,
    required this.canUpload,
    required this.canVerify,
    required this.canDelete,
  });

  final StudentDocumentSummary? summary;
  final List<DetailedStudentDocument>? documents;
  final List<DocumentTypeRow> documentTypes;
  final String? studentId;
  final bool canUpload;
  final bool canVerify;
  final bool canDelete;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (documents == null && summary == null) {
      return const ErpEmptyState(
        icon: Icons.lock_outline,
        title: 'Documents are not available',
        message: 'Your account does not have access to student documents.',
      );
    }

    final docs = documents ?? const <DetailedStudentDocument>[];
    final sum = summary;

    return ListView(
      padding: const EdgeInsets.all(ErpSpacing.lg),
      children: [
        // 1. Completion Summary Card
        if (sum != null) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(ErpSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.fact_check_outlined,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                          const SizedBox(width: ErpSpacing.xs),
                          Text(
                            'Document Completion',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ],
                      ),
                      ErpStatusChip(
                        sum.isComplete ? 'approved' : 'pending',
                      ),
                    ],
                  ),
                  const SizedBox(height: ErpSpacing.sm),
                  Text(
                    '${sum.completedRequired} of ${sum.totalRequired} required verified (${sum.completionPercentage.toStringAsFixed(0)}%)',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: ErpSpacing.xs),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(ErpRadius.pill),
                    child: LinearProgressIndicator(
                      value: sum.totalRequired > 0
                          ? (sum.completedRequired / sum.totalRequired).clamp(0.0, 1.0)
                          : 0.0,
                      minHeight: 8,
                      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        sum.isComplete
                            ? Colors.green
                            : sum.completionPercentage > 50
                                ? Theme.of(context).colorScheme.primary
                                : Colors.orange,
                      ),
                    ),
                  ),
                  if (sum.warnings.isNotEmpty) ...[
                    const SizedBox(height: ErpSpacing.sm),
                    Container(
                      padding: const EdgeInsets.all(ErpSpacing.sm),
                      decoration: BoxDecoration(
                        color: Colors.amber.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(ErpRadius.card),
                        border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.warning_amber_rounded, size: 16, color: Colors.amber),
                              const SizedBox(width: ErpSpacing.xs),
                              Text(
                                'Attention Needed:',
                                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.amber.shade900,
                                    ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          for (final warning in sum.warnings)
                            Padding(
                              padding: const EdgeInsets.only(left: 4, top: 2),
                              child: Text(
                                '• $warning',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: Colors.amber.shade900,
                                    ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: ErpSpacing.sm),
        ],

        // 2. Upload Button Banner
        if (canUpload && studentId != null) ...[
          Card(
            color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.4),
            child: Padding(
              padding: const EdgeInsets.all(ErpSpacing.md),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Upload Student Document',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        Text(
                          'Submit birth certificate, Aadhaar, photo, or report cards.',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  FilledButton.icon(
                    onPressed: () => _showUploadSheet(context, ref),
                    icon: const Icon(Icons.upload_file, size: 18),
                    label: const Text('Upload'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: ErpSpacing.sm),
        ],

        // 3. Requirements Checklist Accordion
        if (sum != null && sum.requirements.isNotEmpty) ...[
          Card(
            child: ExpansionTile(
              initiallyExpanded: !sum.isComplete,
              leading: const Icon(Icons.checklist_rtl_outlined),
              title: const Text('Requirements Checklist'),
              subtitle: Text(
                '${sum.requirements.where((r) => r.status == 'verified').length} / ${sum.requirements.length} completed',
              ),
              children: [
                for (final req in sum.requirements)
                  ListTile(
                    dense: true,
                    title: Row(
                      children: [
                        Expanded(child: Text(req.name)),
                        const SizedBox(width: ErpSpacing.xs),
                        Text(
                          req.requirementType.toUpperCase(),
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: req.requirementType == 'required'
                                    ? Colors.red
                                    : req.requirementType == 'conditional'
                                        ? Colors.blue
                                        : Colors.grey,
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                      ],
                    ),
                    subtitle: req.conditionMetReason != null
                        ? Text(req.conditionMetReason!)
                        : null,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ErpStatusChip(req.status),
                        if (req.status == 'missing' && canUpload && studentId != null) ...[
                          const SizedBox(width: ErpSpacing.xs),
                          IconButton(
                            icon: const Icon(Icons.upload, size: 18),
                            tooltip: 'Upload ${req.name}',
                            onPressed: () => _showUploadSheet(
                              context,
                              ref,
                              preselectedDocTypeId: req.documentTypeId,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: ErpSpacing.sm),
        ],

        // 4. Uploaded Documents List
        Padding(
          padding: const EdgeInsets.symmetric(vertical: ErpSpacing.xs),
          child: Text(
            'Uploaded Documents',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
        ),

        if (docs.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: ErpSpacing.xl),
            child: ErpEmptyState(
              icon: Icons.folder_open_outlined,
              title: 'No documents uploaded yet',
              message: 'Uploaded identity, academic, and legal documents will appear here.',
            ),
          )
        else
          for (final doc in docs) ...[
            Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: doc.verificationStatus == 'verified'
                      ? Colors.green.withValues(alpha: 0.1)
                      : doc.verificationStatus == 'rejected'
                          ? Colors.red.withValues(alpha: 0.1)
                          : Theme.of(context).colorScheme.primaryContainer,
                  child: Icon(
                    doc.verificationStatus == 'verified'
                        ? Icons.verified_user_outlined
                        : doc.verificationStatus == 'rejected'
                            ? Icons.gpp_bad_outlined
                            : Icons.description_outlined,
                    color: doc.verificationStatus == 'verified'
                        ? Colors.green
                        : doc.verificationStatus == 'rejected'
                            ? Colors.red
                            : Theme.of(context).colorScheme.primary,
                  ),
                ),
                title: Row(
                  children: [
                    Expanded(
                      child: Text(
                        doc.docTypeName,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                    if (doc.currentVersion != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'v${doc.currentVersion!.versionNumber}',
                          style: Theme.of(context).textTheme.labelSmall,
                        ),
                      ),
                  ],
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${doc.docTypeCategory.replaceAll('_', ' ')} · ${DateFormat('d MMM yyyy').format(doc.createdAt.toLocal())}',
                    ),
                    if (doc.currentVersion != null)
                      Text(
                        '${doc.currentVersion!.originalFilename} (${(doc.currentVersion!.fileSizeBytes / 1024).toStringAsFixed(0)} KB)',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              fontFamily: 'monospace',
                            ),
                      ),
                    if (doc.verificationStatus == 'rejected' && doc.rejectionReason != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          'Reason: ${doc.rejectionReason!}',
                          style: TextStyle(color: Colors.red.shade700, fontSize: 12),
                        ),
                      ),
                  ],
                ),
                isThreeLine: doc.currentVersion != null,
                trailing: ErpStatusChip(doc.verificationStatus),
                onTap: () => _showDocumentActionsSheet(context, ref, doc),
              ),
            ),
            const SizedBox(height: ErpSpacing.xs),
          ],
      ],
    );
  }

  void _showDocumentActionsSheet(
    BuildContext context,
    WidgetRef ref,
    DetailedStudentDocument doc,
  ) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(ErpRadius.sheet)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(ErpSpacing.lg),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  doc.docTypeName,
                  style: Theme.of(sheetContext).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                Text(
                  'Uploaded ${DateFormat('d MMM yyyy, h:mm a').format(doc.createdAt.toLocal())}',
                  style: Theme.of(sheetContext).textTheme.bodySmall,
                ),
                const Divider(height: ErpSpacing.lg),
                ListTile(
                  leading: const Icon(Icons.open_in_new),
                  title: const Text('Open / Preview Document'),
                  subtitle: const Text('Generates secure expiring link for safe viewing'),
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    try {
                      final tokenObj = await ref
                          .read(apiClientProvider)
                          .getDocumentAccessToken(doc.id, disposition: 'inline');
                      final url = '${ref.read(apiClientProvider).activeCampusId != null ? "" : ""}/api/v1/documents/stream/${tokenObj.accessToken}';
                      // Try launching external
                      await launchUrl(
                        Uri.parse(url),
                        mode: LaunchMode.externalApplication,
                      );
                    } catch (err) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Could not open document: $err')),
                        );
                      }
                    }
                  },
                ),
                if (canUpload && studentId != null)
                  ListTile(
                    leading: const Icon(Icons.upload_file),
                    title: const Text('Upload New Version'),
                    onTap: () {
                      Navigator.of(sheetContext).pop();
                      _showUploadSheet(
                        context,
                        ref,
                        preselectedDocTypeId: doc.documentTypeId,
                      );
                    },
                  ),
                if (canVerify && doc.verificationStatus == 'pending') ...[
                  ListTile(
                    leading: const Icon(Icons.check_circle_outline, color: Colors.green),
                    title: const Text('Verify & Approve Document'),
                    onTap: () async {
                      Navigator.of(sheetContext).pop();
                      try {
                        await ref.read(apiClientProvider).verifyStudentDocument(doc.id);
                        ref.invalidate(studentOverviewProvider);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Document verified successfully.')),
                          );
                        }
                      } catch (err) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Verification failed: $err')),
                          );
                        }
                      }
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.cancel_outlined, color: Colors.red),
                    title: const Text('Reject Document'),
                    onTap: () {
                      Navigator.of(sheetContext).pop();
                      _showRejectDialog(context, ref, doc);
                    },
                  ),
                ],
                if (canDelete)
                  ListTile(
                    leading: const Icon(Icons.delete_outline, color: Colors.red),
                    title: const Text('Delete Document'),
                    onTap: () async {
                      Navigator.of(sheetContext).pop();
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (dCtx) => AlertDialog(
                          title: const Text('Delete Document?'),
                          content: const Text('This document will be soft-deleted and archived.'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.of(dCtx).pop(false),
                              child: const Text('Cancel'),
                            ),
                            FilledButton(
                              onPressed: () => Navigator.of(dCtx).pop(true),
                              child: const Text('Delete'),
                            ),
                          ],
                        ),
                      );
                      if (confirm == true) {
                        try {
                          await ref.read(apiClientProvider).deleteStudentDocument(doc.id);
                          ref.invalidate(studentOverviewProvider);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Document deleted.')),
                            );
                          }
                        } catch (err) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Deletion failed: $err')),
                            );
                          }
                        }
                      }
                    },
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showRejectDialog(
    BuildContext context,
    WidgetRef ref,
    DetailedStudentDocument doc,
  ) {
    final reasonController = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (dCtx) {
        return AlertDialog(
          title: const Text('Reject Document'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Enter the reason for rejecting ${doc.docTypeName}:'),
              const SizedBox(height: ErpSpacing.sm),
              TextField(
                controller: reasonController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Rejection Reason *',
                  hintText: 'e.g. Scan is illegible or name does not match',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dCtx).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Colors.red),
              onPressed: () async {
                final reason = reasonController.text.trim();
                if (reason.length < 3) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please enter a valid rejection reason.')),
                  );
                  return;
                }
                Navigator.of(dCtx).pop();
                try {
                  await ref
                      .read(apiClientProvider)
                      .rejectStudentDocument(doc.id, reason: reason);
                  ref.invalidate(studentOverviewProvider);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Document marked as rejected.')),
                    );
                  }
                } catch (err) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Rejection failed: $err')),
                    );
                  }
                }
              },
              child: const Text('Confirm Rejection'),
            ),
          ],
        );
      },
    );
  }

  void _showUploadSheet(
    BuildContext context,
    WidgetRef ref, {
    String? preselectedDocTypeId,
  }) {
    if (studentId == null) return;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(ErpRadius.sheet)),
      ),
      builder: (sheetCtx) {
        return _UploadDocumentSheetContent(
          studentId: studentId!,
          documentTypes: documentTypes,
          preselectedDocTypeId: preselectedDocTypeId,
        );
      },
    );
  }
}

class _UploadDocumentSheetContent extends ConsumerStatefulWidget {
  const _UploadDocumentSheetContent({
    required this.studentId,
    required this.documentTypes,
    this.preselectedDocTypeId,
  });

  final String studentId;
  final List<DocumentTypeRow> documentTypes;
  final String? preselectedDocTypeId;

  @override
  ConsumerState<_UploadDocumentSheetContent> createState() =>
      _UploadDocumentSheetContentState();
}

class _UploadDocumentSheetContentState
    extends ConsumerState<_UploadDocumentSheetContent> {
  String? _selectedTypeId;
  PlatformFile? _pickedFile;
  final _reasonController = TextEditingController();
  bool _uploading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _selectedTypeId = widget.preselectedDocTypeId ??
        (widget.documentTypes.isNotEmpty ? widget.documentTypes.first.id : null);
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _pickFile() async {
    setState(() => _errorMessage = null);
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
        withData: true,
      );
      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        final currentType = widget.documentTypes.firstWhere(
          (t) => t.id == _selectedTypeId,
          orElse: () => widget.documentTypes.first,
        );
        if (file.size > currentType.maxFileSizeBytes) {
          setState(() {
            _errorMessage =
                'File exceeds size limit of ${(currentType.maxFileSizeBytes / (1024 * 1024)).toStringAsFixed(0)} MB';
          });
          return;
        }
        setState(() => _pickedFile = file);
      }
    } catch (err) {
      setState(() => _errorMessage = 'Failed to pick file: $err');
    }
  }

  Future<void> _submit() async {
    if (_pickedFile == null || _selectedTypeId == null) {
      setState(() => _errorMessage = 'Please select a file to upload.');
      return;
    }
    final bytes = _pickedFile!.bytes;
    if (bytes == null) {
      setState(() => _errorMessage = 'Could not read file data.');
      return;
    }

    setState(() {
      _uploading = true;
      _errorMessage = null;
    });

    try {
      final base64String = base64Encode(bytes);
      await ref.read(apiClientProvider).uploadStudentDocumentWithBase64(
            studentId: widget.studentId,
            documentTypeId: _selectedTypeId!,
            filename: _pickedFile!.name,
            fileBase64: base64String,
            changeReason: _reasonController.text.trim().isNotEmpty
                ? _reasonController.text.trim()
                : null,
          );

      ref.invalidate(studentOverviewProvider);
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Document uploaded successfully!')),
        );
      }
    } catch (err) {
      setState(() {
        _errorMessage = readableApiError(err);
        _uploading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentType = widget.documentTypes.firstWhere(
      (t) => t.id == _selectedTypeId,
      orElse: () => widget.documentTypes.isNotEmpty
          ? widget.documentTypes.first
          : const DocumentTypeRow(
              id: '',
              code: '',
              name: '',
              category: '',
              requirementType: '',
              appliesTo: '',
              allowedFileTypes: '',
              maxFileSizeBytes: 10000000,
              requiresVerification: true,
              expiryEnabled: false,
              isSensitive: false,
              status: '',
            ),
    );

    return Padding(
      padding: EdgeInsets.only(
        left: ErpSpacing.lg,
        right: ErpSpacing.lg,
        top: ErpSpacing.lg,
        bottom: MediaQuery.of(context).viewInsets.bottom + ErpSpacing.lg,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Upload Student Document',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: ErpSpacing.sm),
            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(ErpSpacing.sm),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(ErpRadius.card),
                  border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                ),
                child: Text(
                  _errorMessage!,
                  style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                ),
              ),
              const SizedBox(height: ErpSpacing.sm),
            ],
            DropdownButtonFormField<String>(
              initialValue: _selectedTypeId,
              decoration: const InputDecoration(
                labelText: 'Document Type *',
                border: OutlineInputBorder(),
              ),
              items: [
                for (final docType in widget.documentTypes)
                  DropdownMenuItem(
                    value: docType.id,
                    child: Text('${docType.name} (${docType.requirementType.toUpperCase()})'),
                  ),
              ],
              onChanged: _uploading
                  ? null
                  : (val) {
                      setState(() {
                        _selectedTypeId = val;
                        _pickedFile = null;
                        _errorMessage = null;
                      });
                    },
            ),
            const SizedBox(height: ErpSpacing.md),
            InkWell(
              onTap: _uploading ? null : _pickFile,
              borderRadius: BorderRadius.circular(ErpRadius.card),
              child: Container(
                padding: const EdgeInsets.all(ErpSpacing.lg),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outlineVariant,
                    width: 1.5,
                  ),
                  borderRadius: BorderRadius.circular(ErpRadius.card),
                ),
                child: Column(
                  children: [
                    Icon(
                      _pickedFile != null ? Icons.check_circle : Icons.cloud_upload_outlined,
                      size: 36,
                      color: _pickedFile != null
                          ? Colors.green
                          : Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(height: ErpSpacing.xs),
                    Text(
                      _pickedFile != null
                          ? _pickedFile!.name
                          : 'Tap to select document from storage',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _pickedFile != null ? Colors.green.shade800 : null,
                      ),
                    ),
                    if (_pickedFile != null)
                      Text(
                        '${(_pickedFile!.size / 1024).toStringAsFixed(0)} KB',
                        style: Theme.of(context).textTheme.bodySmall,
                      )
                    else
                      Text(
                        'Allowed: ${currentType.allowedFileTypes.toUpperCase()} · Max ${(currentType.maxFileSizeBytes / (1024 * 1024)).toStringAsFixed(0)} MB',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: ErpSpacing.md),
            TextField(
              controller: _reasonController,
              decoration: const InputDecoration(
                labelText: 'Upload Note / Reason (Optional)',
                hintText: 'e.g. Updated scan or renewal',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: ErpSpacing.lg),
            FilledButton(
              onPressed: _uploading || _pickedFile == null ? null : _submit,
              child: _uploading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Upload Document'),
            ),
          ],
        ),
      ),
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
