import 'dart:typed_data';
import 'identity_models.dart';

class UploadableFile {
  const UploadableFile({
    required this.name,
    required this.size,
    required this.resourceType,
    required this.format,
    this.path,
    this.bytes,
  });

  final String name;
  final int size;
  final String resourceType;
  final String format;
  final String? path;
  final Uint8List? bytes;
}

class CloudinaryUploadSignature {
  const CloudinaryUploadSignature({
    required this.timestamp,
    required this.folder,
    required this.type,
    required this.allowedFormats,
    required this.signature,
    required this.apiKey,
    required this.cloudName,
  });

  factory CloudinaryUploadSignature.fromJson(
    Map<String, Object?> json,
  ) => CloudinaryUploadSignature(
    timestamp: json['timestamp'] is num
        ? (json['timestamp']! as num).toInt()
        : throw const FormatException('upload.timestamp must be an integer.'),
    folder: _string(json['folder'], 'upload.folder'),
    type: _string(json['type'], 'upload.type'),
    allowedFormats: _string(json['allowed_formats'], 'upload.allowed_formats'),
    signature: _string(json['signature'], 'upload.signature'),
    apiKey: _string(json['apiKey'], 'upload.apiKey'),
    cloudName: _string(json['cloudName'], 'upload.cloudName'),
  );

  final int timestamp;
  final String folder;
  final String type;
  final String allowedFormats;
  final String signature;
  final String apiKey;
  final String cloudName;

  static String _string(Object? value, String field) {
    if (value is String) return value;
    throw FormatException('$field must be a string.');
  }
}

class DocumentTypeRow {
  const DocumentTypeRow({
    required this.id,
    required this.code,
    required this.name,
    required this.category,
    required this.requirementType,
    required this.appliesTo,
    required this.allowedFileTypes,
    required this.maxFileSizeBytes,
    required this.requiresVerification,
    required this.expiryEnabled,
    required this.isSensitive,
    required this.status,
    this.description,
  });

  factory DocumentTypeRow.fromJson(Json json) => DocumentTypeRow(
    id: asString(json['id'], 'docType.id'),
    code: asString(json['code'], 'docType.code'),
    name: asString(json['name'], 'docType.name'),
    description: json['description'] as String?,
    category: asString(json['category'], 'docType.category'),
    requirementType: asString(json['requirementType'], 'docType.requirementType'),
    appliesTo: asString(json['appliesTo'], 'docType.appliesTo'),
    allowedFileTypes: asString(json['allowedFileTypes'], 'docType.allowedFileTypes'),
    maxFileSizeBytes: asInt(json['maxFileSizeBytes'], 'docType.maxFileSizeBytes'),
    requiresVerification: json['requiresVerification'] as bool? ?? true,
    expiryEnabled: json['expiryEnabled'] as bool? ?? false,
    isSensitive: json['isSensitive'] as bool? ?? false,
    status: asString(json['status'], 'docType.status'),
  );

  final String id;
  final String code;
  final String name;
  final String? description;
  final String category;
  final String requirementType;
  final String appliesTo;
  final String allowedFileTypes;
  final int maxFileSizeBytes;
  final bool requiresVerification;
  final bool expiryEnabled;
  final bool isSensitive;
  final String status;
}

class RequirementItem {
  const RequirementItem({
    required this.documentTypeId,
    required this.code,
    required this.name,
    required this.category,
    required this.requirementType,
    required this.isApplicable,
    required this.status,
    this.conditionMetReason,
    this.documentId,
  });

  factory RequirementItem.fromJson(Json json) => RequirementItem(
    documentTypeId: asString(json['documentTypeId'], 'req.documentTypeId'),
    code: asString(json['code'], 'req.code'),
    name: asString(json['name'], 'req.name'),
    category: asString(json['category'], 'req.category'),
    requirementType: asString(json['requirementType'], 'req.requirementType'),
    isApplicable: json['isApplicable'] as bool? ?? true,
    conditionMetReason: json['conditionMetReason'] as String?,
    status: asString(json['status'], 'req.status'),
    documentId: json['documentId'] as String?,
  );

  final String documentTypeId;
  final String code;
  final String name;
  final String category;
  final String requirementType;
  final bool isApplicable;
  final String? conditionMetReason;
  final String status;
  final String? documentId;
}

class StudentDocumentSummary {
  const StudentDocumentSummary({
    required this.totalRequired,
    required this.completedRequired,
    required this.completionPercentage,
    required this.isComplete,
    required this.missingDocuments,
    required this.pendingVerification,
    required this.expiredDocuments,
    required this.warnings,
    required this.requirements,
  });

  factory StudentDocumentSummary.fromJson(Json json) => StudentDocumentSummary(
    totalRequired: asInt(json['totalRequired'], 'summary.totalRequired'),
    completedRequired: asInt(json['completedRequired'], 'summary.completedRequired'),
    completionPercentage: asDouble(
      json['completionPercentage'],
      'summary.completionPercentage',
    ),
    isComplete: json['isComplete'] as bool? ?? false,
    missingDocuments: asJsonList(
      json['missingDocuments'],
      'summary.missingDocuments',
    ).map((j) => asString(j['name'], 'missingDoc.name')).toList(growable: false),
    pendingVerification: asJsonList(
      json['pendingVerification'],
      'summary.pendingVerification',
    ).map((j) => asString(j['name'], 'pendingDoc.name')).toList(growable: false),
    expiredDocuments: asJsonList(
      json['expiredDocuments'],
      'summary.expiredDocuments',
    ).map((j) => asString(j['name'], 'expiredDoc.name')).toList(growable: false),
    warnings: (json['warnings'] as List<dynamic>? ?? const <dynamic>[])
        .map((w) => w.toString())
        .toList(growable: false),
    requirements: asJsonList(
      json['requirements'],
      'summary.requirements',
    ).map(RequirementItem.fromJson).toList(growable: false),
  );

  final int totalRequired;
  final int completedRequired;
  final double completionPercentage;
  final bool isComplete;
  final List<String> missingDocuments;
  final List<String> pendingVerification;
  final List<String> expiredDocuments;
  final List<String> warnings;
  final List<RequirementItem> requirements;
}

class DocumentVersionRow {
  const DocumentVersionRow({
    required this.id,
    required this.versionNumber,
    required this.originalFilename,
    required this.mimeType,
    required this.fileSizeBytes,
    required this.fileHash,
    required this.scanStatus,
    required this.verificationStatus,
    required this.uploadedBy,
    required this.createdAt,
    this.sanitizedFilename,
    this.fileExtension,
  });

  factory DocumentVersionRow.fromJson(Json json) => DocumentVersionRow(
    id: asString(json['id'], 'docVer.id'),
    versionNumber: asInt(json['versionNumber'], 'docVer.versionNumber'),
    originalFilename: asString(json['originalFilename'], 'docVer.originalFilename'),
    sanitizedFilename: json['sanitizedFilename'] as String?,
    mimeType: asString(json['mimeType'], 'docVer.mimeType'),
    fileExtension: json['fileExtension'] as String?,
    fileSizeBytes: asInt(json['fileSizeBytes'], 'docVer.fileSizeBytes'),
    fileHash: asString(json['fileHash'], 'docVer.fileHash'),
    scanStatus: asString(json['scanStatus'], 'docVer.scanStatus'),
    verificationStatus: asString(json['verificationStatus'], 'docVer.verificationStatus'),
    uploadedBy: asString(json['uploadedBy'], 'docVer.uploadedBy'),
    createdAt: DateTime.parse(asString(json['createdAt'], 'docVer.createdAt')),
  );

  final String id;
  final int versionNumber;
  final String originalFilename;
  final String? sanitizedFilename;
  final String mimeType;
  final String? fileExtension;
  final int fileSizeBytes;
  final String fileHash;
  final String scanStatus;
  final String verificationStatus;
  final String uploadedBy;
  final DateTime createdAt;
}

class DetailedStudentDocument {
  const DetailedStudentDocument({
    required this.id,
    required this.studentId,
    required this.documentTypeId,
    required this.status,
    required this.verificationStatus,
    required this.createdAt,
    required this.docTypeName,
    required this.docTypeCode,
    required this.docTypeCategory,
    required this.docTypeRequirement,
    required this.docTypeAllowedTypes,
    required this.docTypeRequiresVerification,
    required this.docTypeExpiryEnabled,
    this.guardianId,
    this.verifiedBy,
    this.verifiedAt,
    this.rejectionReason,
    this.verificationNotes,
    this.issuedAt,
    this.expiresAt,
    this.expiryStatus,
    this.isSensitive = false,
    this.currentVersion,
  });

  factory DetailedStudentDocument.fromJson(Json json) => DetailedStudentDocument(
    id: asString(json['id'], 'detailedDoc.id'),
    studentId: asString(json['studentId'], 'detailedDoc.studentId'),
    guardianId: json['guardianId'] as String?,
    documentTypeId: asString(json['documentTypeId'], 'detailedDoc.documentTypeId'),
    status: asString(json['status'], 'detailedDoc.status'),
    verificationStatus: asString(json['verificationStatus'], 'detailedDoc.verificationStatus'),
    verifiedBy: json['verifiedBy'] as String?,
    verifiedAt: json['verifiedAt'] == null
        ? null
        : DateTime.parse(asString(json['verifiedAt'], 'detailedDoc.verifiedAt')),
    rejectionReason: json['rejectionReason'] as String?,
    verificationNotes: json['verificationNotes'] as String?,
    issuedAt: json['issuedAt'] == null
        ? null
        : DateTime.parse(asString(json['issuedAt'], 'detailedDoc.issuedAt')),
    expiresAt: json['expiresAt'] == null
        ? null
        : DateTime.parse(asString(json['expiresAt'], 'detailedDoc.expiresAt')),
    expiryStatus: json['expiryStatus'] as String?,
    isSensitive: json['isSensitive'] as bool? ?? false,
    createdAt: DateTime.parse(asString(json['createdAt'], 'detailedDoc.createdAt')),
    docTypeName: asString(json['docTypeName'], 'detailedDoc.docTypeName'),
    docTypeCode: asString(json['docTypeCode'], 'detailedDoc.docTypeCode'),
    docTypeCategory: asString(json['docTypeCategory'], 'detailedDoc.docTypeCategory'),
    docTypeRequirement: asString(json['docTypeRequirement'], 'detailedDoc.docTypeRequirement'),
    docTypeAllowedTypes: asString(json['docTypeAllowedTypes'], 'detailedDoc.docTypeAllowedTypes'),
    docTypeRequiresVerification: json['docTypeRequiresVerification'] as bool? ?? true,
    docTypeExpiryEnabled: json['docTypeExpiryEnabled'] as bool? ?? false,
    currentVersion: json['currentVersion'] != null
        ? DocumentVersionRow.fromJson(asJson(json['currentVersion'], 'detailedDoc.currentVersion'))
        : null,
  );

  final String id;
  final String studentId;
  final String? guardianId;
  final String documentTypeId;
  final String status;
  final String verificationStatus;
  final String? verifiedBy;
  final DateTime? verifiedAt;
  final String? rejectionReason;
  final String? verificationNotes;
  final DateTime? issuedAt;
  final DateTime? expiresAt;
  final String? expiryStatus;
  final bool isSensitive;
  final DateTime createdAt;
  final String docTypeName;
  final String docTypeCode;
  final String docTypeCategory;
  final String docTypeRequirement;
  final String docTypeAllowedTypes;
  final bool docTypeRequiresVerification;
  final bool docTypeExpiryEnabled;
  final DocumentVersionRow? currentVersion;
}

class DocumentAccessToken {
  const DocumentAccessToken({
    required this.accessToken,
    required this.expiresAt,
    required this.filename,
    required this.mimeType,
    required this.fileSizeBytes,
  });

  factory DocumentAccessToken.fromJson(Json json) => DocumentAccessToken(
    accessToken: asString(json['accessToken'], 'docToken.accessToken'),
    expiresAt: DateTime.parse(asString(json['expiresAt'], 'docToken.expiresAt')),
    filename: asString(json['filename'], 'docToken.filename'),
    mimeType: asString(json['mimeType'], 'docToken.mimeType'),
    fileSizeBytes: asInt(json['fileSizeBytes'], 'docToken.fileSizeBytes'),
  );

  final String accessToken;
  final DateTime expiresAt;
  final String filename;
  final String mimeType;
  final int fileSizeBytes;
}
