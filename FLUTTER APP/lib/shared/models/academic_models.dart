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

class AssignmentSubmission {
  const AssignmentSubmission({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.response,
    required this.submittedAt,
    required this.status,
    this.score,
    this.feedback,
  });

  factory AssignmentSubmission.fromJson(Json json) => AssignmentSubmission(
    id: asString(json['id'], 'assignmentSubmission.id'),
    studentId: asString(json['studentId'], 'assignmentSubmission.studentId'),
    studentName: asString(
      json['studentName'],
      'assignmentSubmission.studentName',
    ),
    response: asString(json['response'], 'assignmentSubmission.response'),
    submittedAt: DateTime.parse(
      asString(json['submittedAt'], 'assignmentSubmission.submittedAt'),
    ),
    status: asString(json['status'], 'assignmentSubmission.status'),
    score: json['score'] == null ? null : asInt(json['score'], 'assignmentSubmission.score'),
    feedback: json['feedback'] as String?,
  );

  final String id;
  final String studentId;
  final String studentName;
  final String response;
  final DateTime submittedAt;
  final String status;
  final int? score;
  final String? feedback;
}

class AssignmentDetail {
  const AssignmentDetail({
    required this.id,
    required this.title,
    required this.teacherId,
    required this.classId,
    required this.subjectId,
    required this.dueAt,
    required this.status,
    required this.submissions,
    this.instructions,
  });

  factory AssignmentDetail.fromJson(Json json) => AssignmentDetail(
    id: asString(json['id'], 'assignment.id'),
    title: asString(json['title'], 'assignment.title'),
    teacherId: asString(json['teacherId'], 'assignment.teacherId'),
    classId: asString(json['classId'], 'assignment.classId'),
    subjectId: asString(json['subjectId'], 'assignment.subjectId'),
    dueAt: DateTime.parse(asString(json['dueAt'], 'assignment.dueAt')),
    status: asString(json['status'], 'assignment.status'),
    instructions: json['instructions'] as String?,
    submissions: asJsonList(
      json['submissions'],
      'assignment.submissions',
    ).map(AssignmentSubmission.fromJson).toList(growable: false),
  );

  final String id;
  final String title;
  final String teacherId;
  final String classId;
  final String subjectId;
  final DateTime dueAt;
  final String status;
  final String? instructions;
  final List<AssignmentSubmission> submissions;
}
