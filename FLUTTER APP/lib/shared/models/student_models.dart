import 'identity_models.dart';

class StudentFormOption {
  const StudentFormOption({
    required this.id,
    required this.name,
    this.code,
    this.campusId,
    this.classId,
  });

  factory StudentFormOption.fromJson(Json json) => StudentFormOption(
    id: asString(json['id'], 'studentFormOption.id'),
    name: asString(json['name'], 'studentFormOption.name'),
    code: json['code'] as String?,
    campusId: json['campusId'] as String?,
    classId: json['classId'] as String?,
  );

  final String id;
  final String name;
  final String? code;
  final String? campusId;
  final String? classId;
}

class StudentFormOptions {
  const StudentFormOptions({
    required this.campuses,
    required this.academicYears,
    required this.classes,
    required this.sections,
  });

  factory StudentFormOptions.fromJson(Json json) => StudentFormOptions(
    campuses: _list(json['campuses'], 'studentOptions.campuses'),
    academicYears: _list(json['academicYears'], 'studentOptions.academicYears'),
    classes: _list(json['classes'], 'studentOptions.classes'),
    sections: _list(json['sections'], 'studentOptions.sections'),
  );

  final List<StudentFormOption> campuses;
  final List<StudentFormOption> academicYears;
  final List<StudentFormOption> classes;
  final List<StudentFormOption> sections;

  static List<StudentFormOption> _list(Object? value, String field) =>
      asJsonList(
        value,
        field,
      ).map(StudentFormOption.fromJson).toList(growable: false);
}

class StudentMedicalProfile {
  const StudentMedicalProfile({
    required this.studentId,
    this.allergies,
    this.conditions,
    this.medications,
    this.emergencyNotes,
  });

  factory StudentMedicalProfile.fromJson(Json json) => StudentMedicalProfile(
    studentId: asString(json['studentId'], 'medical.studentId'),
    allergies: json['allergies'] as String?,
    conditions: json['conditions'] as String?,
    medications: json['medications'] as String?,
    emergencyNotes: json['emergencyNotes'] as String?,
  );

  final String studentId;
  final String? allergies;
  final String? conditions;
  final String? medications;
  final String? emergencyNotes;
}

class PageInfo {
  const PageInfo({
    required this.page,
    required this.pageSize,
    required this.total,
    required this.pageCount,
  });
  factory PageInfo.fromJson(Json json) => PageInfo(
    page: asInt(json['page'], 'pageInfo.page'),
    pageSize: asInt(json['pageSize'], 'pageInfo.pageSize'),
    total: asInt(json['total'], 'pageInfo.total'),
    pageCount: asInt(json['pageCount'], 'pageInfo.pageCount'),
  );
  final int page;
  final int pageSize;
  final int total;
  final int pageCount;
}

class AttendanceRow {
  const AttendanceRow({
    required this.id,
    required this.date,
    required this.period,
    required this.state,
    this.note,
  });
  factory AttendanceRow.fromJson(Json json) => AttendanceRow(
    id: asString(json['id'], 'attendance.id'),
    date: DateTime.parse(asString(json['attendanceDate'], 'attendance.date')),
    period: asString(json['period'], 'attendance.period'),
    state: asString(json['state'], 'attendance.state'),
    note: json['note'] as String?,
  );
  final String id;
  final DateTime date;
  final String period;
  final String state;
  final String? note;
}

class InvoiceRow {
  const InvoiceRow({
    required this.id,
    required this.invoiceNumber,
    required this.dueOn,
    required this.totalMinor,
    required this.balanceMinor,
    required this.currency,
    required this.status,
  });
  factory InvoiceRow.fromJson(Json json) => InvoiceRow(
    id: asString(json['id'], 'invoice.id'),
    invoiceNumber: asString(json['invoiceNumber'], 'invoice.number'),
    dueOn: DateTime.parse(asString(json['dueOn'], 'invoice.dueOn')),
    totalMinor: asInt(json['totalMinor'], 'invoice.totalMinor'),
    balanceMinor: asInt(json['balanceMinor'], 'invoice.balanceMinor'),
    currency: asString(json['currency'], 'invoice.currency'),
    status: asString(json['status'], 'invoice.status'),
  );
  final String id;
  final String invoiceNumber;
  final DateTime dueOn;
  final int totalMinor;
  final int balanceMinor;
  final String currency;
  final String status;
}

class ResultRow {
  const ResultRow({
    required this.id,
    required this.examName,
    required this.subjectName,
    required this.maximumMarks,
    required this.state,
    this.marks,
    this.publishedAt,
  });
  factory ResultRow.fromJson(Json json) => ResultRow(
    id: asString(json['id'], 'result.id'),
    examName: asString(json['examName'], 'result.examName'),
    subjectName: asString(json['subjectName'], 'result.subjectName'),
    marks: json['marks'] == null ? null : asInt(json['marks'], 'result.marks'),
    maximumMarks: asInt(json['maximumMarks'], 'result.maximumMarks'),
    state: asString(json['state'], 'result.state'),
    publishedAt: json['publishedAt'] == null
        ? null
        : DateTime.parse(asString(json['publishedAt'], 'result.publishedAt')),
  );
  final String id;
  final String examName;
  final String subjectName;
  final int? marks;
  final int maximumMarks;
  final String state;
  final DateTime? publishedAt;
}

class NotificationRow {
  const NotificationRow({
    required this.id,
    required this.subject,
    required this.body,
    required this.status,
    this.sentAt,
    this.readAt,
  });
  factory NotificationRow.fromJson(Json json) => NotificationRow(
    id: asString(json['id'], 'notification.id'),
    subject: asString(json['subject'], 'notification.subject'),
    body: asString(json['body'], 'notification.body'),
    status: asString(json['status'], 'notification.status'),
    sentAt: json['sentAt'] == null
        ? null
        : DateTime.parse(asString(json['sentAt'], 'notification.sentAt')),
    readAt: json['readAt'] == null
        ? null
        : DateTime.parse(asString(json['readAt'], 'notification.readAt')),
  );
  final String id;
  final String subject;
  final String body;
  final String status;
  final DateTime? sentAt;
  final DateTime? readAt;
}

class DocumentRow {
  const DocumentRow({
    required this.id,
    required this.category,
    required this.secureUrl,
    required this.resourceType,
    required this.accessPolicy,
    required this.status,
    required this.createdAt,
    this.format,
    this.bytes,
    this.originalFilename,
  });

  factory DocumentRow.fromJson(Json json) => DocumentRow(
    id: asString(json['id'], 'document.id'),
    category: asString(json['category'], 'document.category'),
    secureUrl: asString(json['secureUrl'], 'document.secureUrl'),
    resourceType: asString(json['resourceType'], 'document.resourceType'),
    accessPolicy: asString(json['accessPolicy'], 'document.accessPolicy'),
    status: asString(json['status'], 'document.status'),
    createdAt: DateTime.parse(
      asString(json['createdAt'], 'document.createdAt'),
    ),
    format: json['format'] as String?,
    bytes: json['bytes'] == null
        ? null
        : asInt(json['bytes'], 'document.bytes'),
    originalFilename: json['originalFilename'] as String?,
  );

  final String id;
  final String category;
  final String secureUrl;
  final String resourceType;
  final String accessPolicy;
  final String status;
  final DateTime createdAt;
  final String? format;
  final int? bytes;
  final String? originalFilename;
}

class PagedRows<T> {
  const PagedRows({required this.rows, required this.pageInfo});
  final List<T> rows;
  final PageInfo pageInfo;
}
