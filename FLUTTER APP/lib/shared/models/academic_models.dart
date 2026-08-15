import 'identity_models.dart';

class AcademicRecord {
  const AcademicRecord({
    required this.id,
    required this.name,
    required this.detail,
    required this.status,
  });

  factory AcademicRecord.fromJson(Json json) => AcademicRecord(
    id: asString(json['id'], 'academic.id'),
    name: asString(json['name'], 'academic.name'),
    detail: asString(json['detail'], 'academic.detail'),
    status: asString(json['status'], 'academic.status'),
  );

  final String id;
  final String name;
  final String detail;
  final String status;
}

class AcademicOption {
  const AcademicOption({
    required this.id,
    required this.label,
    required this.detail,
    this.classId,
  });

  factory AcademicOption.fromJson(Json json) => AcademicOption(
    id: asString(json['id'], 'academicOption.id'),
    label: (json['label'] ?? json['name']) is String
        ? (json['label'] ?? json['name'])! as String
        : asString(json['id'], 'academicOption.label'),
    detail: json['detail'] is String ? json['detail']! as String : '',
    classId: json['classId'] as String?,
  );

  final String id;
  final String label;
  final String detail;
  final String? classId;
}
