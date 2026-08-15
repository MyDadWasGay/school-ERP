import 'identity_models.dart';
import 'student_models.dart';

class StudentOption {
  const StudentOption({
    required this.id,
    required this.name,
    required this.detail,
  });

  factory StudentOption.fromJson(Json json) => StudentOption(
    id: asString(json['id'], 'studentOption.id'),
    name: (json['name'] ?? json['label']) is String
        ? (json['name'] ?? json['label'])! as String
        : asString(json['id'], 'studentOption.name'),
    detail: json['detail'] is String ? json['detail']! as String : '',
  );

  final String id;
  final String name;
  final String detail;
}

class TeacherAttendanceRow {
  const TeacherAttendanceRow({
    required this.id,
    required this.studentId,
    required this.student,
    required this.state,
    required this.period,
    required this.markedAt,
  });

  factory TeacherAttendanceRow.fromJson(Json json) => TeacherAttendanceRow(
    id: asString(json['id'], 'teacherAttendance.id'),
    studentId: asString(json['studentId'], 'teacherAttendance.studentId'),
    student: asString(json['student'], 'teacherAttendance.student'),
    state: asString(json['state'], 'teacherAttendance.state'),
    period: asString(json['period'], 'teacherAttendance.period'),
    markedAt: asString(json['markedAt'], 'teacherAttendance.markedAt'),
  );

  final String id;
  final String studentId;
  final String student;
  final String state;
  final String period;
  final String markedAt;
}

class TeacherAttendancePage {
  const TeacherAttendancePage({
    required this.rows,
    required this.pageInfo,
    required this.attendanceDate,
  });

  factory TeacherAttendancePage.fromJson(Json json) => TeacherAttendancePage(
    rows: asJsonList(
      json['rows'],
      'teacherAttendance.rows',
    ).map(TeacherAttendanceRow.fromJson).toList(growable: false),
    pageInfo: PageInfo.fromJson(
      asJson(json['pageInfo'], 'teacherAttendance.pageInfo'),
    ),
    attendanceDate: asString(
      json['attendanceDate'],
      'teacherAttendance.attendanceDate',
    ),
  );

  final List<TeacherAttendanceRow> rows;
  final PageInfo pageInfo;
  final String attendanceDate;
}
