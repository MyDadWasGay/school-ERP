import 'identity_models.dart';
import 'student_models.dart';

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

class SyllabusLessonRow {
  const SyllabusLessonRow({
    required this.id,
    required this.title,
    required this.status,
  });

  factory SyllabusLessonRow.fromJson(Json json) => SyllabusLessonRow(
    id: asString(json['id'], 'syllabusLesson.id'),
    title: asString(json['title'], 'syllabusLesson.title'),
    status: asString(json['status'], 'syllabusLesson.status'),
  );

  final String id;
  final String title;
  final String status;
}

class SyllabusProgressRow {
  const SyllabusProgressRow({
    required this.subjectId,
    required this.subjectName,
    required this.teacherName,
    required this.totalLessons,
    required this.completedLessons,
    required this.pendingLessons,
    required this.completionPercentage,
    required this.lastUpdated,
    required this.lessons,
  });

  factory SyllabusProgressRow.fromJson(Json json) => SyllabusProgressRow(
    subjectId: asString(json['subjectId'], 'syllabus.subjectId'),
    subjectName: asString(json['subjectName'], 'syllabus.subjectName'),
    teacherName: asString(json['teacherName'], 'syllabus.teacherName'),
    totalLessons: asInt(json['totalLessons'], 'syllabus.totalLessons'),
    completedLessons: asInt(
      json['completedLessons'],
      'syllabus.completedLessons',
    ),
    pendingLessons: asInt(json['pendingLessons'], 'syllabus.pendingLessons'),
    completionPercentage: asDouble(
      json['completionPercentage'],
      'syllabus.completionPercentage',
    ),
    lastUpdated: DateTime.parse(
      asString(json['lastUpdated'], 'syllabus.lastUpdated'),
    ),
    lessons: asJsonList(
      json['lessons'],
      'syllabus.lessons',
    ).map(SyllabusLessonRow.fromJson).toList(growable: false),
  );

  final String subjectId;
  final String subjectName;
  final String teacherName;
  final int totalLessons;
  final int completedLessons;
  final int pendingLessons;
  final double completionPercentage;
  final DateTime lastUpdated;
  final List<SyllabusLessonRow> lessons;
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
    this.attachments = const [],
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
    score: json['score'] == null
        ? null
        : asInt(json['score'], 'assignmentSubmission.score'),
    feedback: json['feedback'] as String?,
    attachments: (json['attachments'] as List? ?? const [])
        .map(
          (item) => DocumentRow.fromJson(
            asJson(item, 'assignmentSubmission.attachment'),
          ),
        )
        .toList(growable: false),
  );

  final String id;
  final String studentId;
  final String studentName;
  final String response;
  final DateTime submittedAt;
  final String status;
  final int? score;
  final String? feedback;
  final List<DocumentRow> attachments;
}

class AssignmentSubmissionReceipt {
  const AssignmentSubmissionReceipt({required this.id, required this.status});

  factory AssignmentSubmissionReceipt.fromJson(Json json) =>
      AssignmentSubmissionReceipt(
        id: asString(json['id'], 'assignmentSubmission.id'),
        status: asString(json['status'], 'assignmentSubmission.status'),
      );

  final String id;
  final String status;
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
