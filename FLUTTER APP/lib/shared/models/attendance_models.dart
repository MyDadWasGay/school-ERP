import 'identity_models.dart';

class AttendanceOverviewState {
  const AttendanceOverviewState({required this.state, required this.total});

  factory AttendanceOverviewState.fromJson(Json json) =>
      AttendanceOverviewState(
        state: asString(json['state'], 'attendanceOverview.state'),
        total: asInt(json['total'], 'attendanceOverview.total'),
      );

  final String state;
  final int total;
}

class AttendanceOverviewGroup {
  const AttendanceOverviewGroup({
    required this.classId,
    required this.className,
    required this.sectionId,
    required this.sectionName,
    required this.total,
    required this.attended,
    required this.rate,
  });

  factory AttendanceOverviewGroup.fromJson(Json json) =>
      AttendanceOverviewGroup(
        classId: asString(json['classId'], 'attendanceGroup.classId'),
        className: asString(json['className'], 'attendanceGroup.className'),
        sectionId: asString(json['sectionId'], 'attendanceGroup.sectionId'),
        sectionName: asString(
          json['sectionName'],
          'attendanceGroup.sectionName',
        ),
        total: asInt(json['total'], 'attendanceGroup.total'),
        attended: asInt(json['attended'], 'attendanceGroup.attended'),
        rate: asDouble(json['rate'], 'attendanceGroup.rate'),
      );

  final String classId;
  final String className;
  final String sectionId;
  final String sectionName;
  final int total;
  final int attended;
  final double rate;
}

class AttendanceOverview {
  const AttendanceOverview({
    required this.total,
    required this.attended,
    required this.rate,
    required this.states,
    required this.groups,
  });

  factory AttendanceOverview.fromJson(Json json) => AttendanceOverview(
    total: asInt(json['total'], 'attendanceOverview.total'),
    attended: asInt(json['attended'], 'attendanceOverview.attended'),
    rate: asDouble(json['rate'], 'attendanceOverview.rate'),
    states: asJsonList(
      json['states'],
      'attendanceOverview.states',
    ).map(AttendanceOverviewState.fromJson).toList(growable: false),
    groups: asJsonList(
      json['groups'],
      'attendanceOverview.groups',
    ).map(AttendanceOverviewGroup.fromJson).toList(growable: false),
  );

  final int total;
  final int attended;
  final double rate;
  final List<AttendanceOverviewState> states;
  final List<AttendanceOverviewGroup> groups;
}

class AttendanceCorrectionRow {
  const AttendanceCorrectionRow({
    required this.id,
    required this.student,
    required this.currentState,
    required this.requestedState,
    required this.reason,
    required this.status,
  });

  factory AttendanceCorrectionRow.fromJson(Json json) =>
      AttendanceCorrectionRow(
        id: asString(json['id'], 'attendanceCorrection.id'),
        student: asString(json['student'], 'attendanceCorrection.student'),
        currentState: asString(
          json['currentState'],
          'attendanceCorrection.currentState',
        ),
        requestedState: asString(
          json['requestedState'],
          'attendanceCorrection.requestedState',
        ),
        reason: asString(json['reason'], 'attendanceCorrection.reason'),
        status: asString(json['status'], 'attendanceCorrection.status'),
      );

  final String id;
  final String student;
  final String currentState;
  final String requestedState;
  final String reason;
  final String status;
}

class LowAttendanceRow {
  const LowAttendanceRow({
    required this.studentId,
    required this.student,
    required this.total,
    required this.attended,
    required this.percentage,
  });

  factory LowAttendanceRow.fromJson(Json json) => LowAttendanceRow(
    studentId: asString(json['studentId'], 'lowAttendance.studentId'),
    student: asString(json['student'], 'lowAttendance.student'),
    total: asInt(json['total'], 'lowAttendance.total'),
    attended: asInt(json['attended'], 'lowAttendance.attended'),
    percentage: asDouble(json['percentage'], 'lowAttendance.percentage'),
  );

  final String studentId;
  final String student;
  final int total;
  final int attended;
  final double percentage;
}

class DisciplineIncidentRow {
  const DisciplineIncidentRow({
    required this.id,
    required this.studentId,
    required this.student,
    required this.severity,
    required this.title,
    required this.occurredAt,
    required this.status,
    required this.confidential,
    this.details,
  });

  factory DisciplineIncidentRow.fromJson(Json json) => DisciplineIncidentRow(
    id: asString(json['id'], 'discipline.id'),
    studentId: asString(json['studentId'], 'discipline.studentId'),
    student: asString(json['student'], 'discipline.student'),
    severity: asString(json['severity'], 'discipline.severity'),
    title: asString(json['title'], 'discipline.title'),
    occurredAt: asString(json['occurredAt'], 'discipline.occurredAt'),
    status: asString(json['status'], 'discipline.status'),
    confidential: json['confidential'] == true,
    details: json['details'] as String?,
  );

  final String id;
  final String studentId;
  final String student;
  final String severity;
  final String title;
  final String occurredAt;
  final String status;
  final bool confidential;
  final String? details;
}

class AttendanceDraft {
  const AttendanceDraft({
    required this.id,
    required this.userId,
    required this.campusId,
    required this.studentId,
    required this.attendanceDate,
    required this.periodKey,
    required this.state,
    required this.savedAt,
    this.note,
  });

  factory AttendanceDraft.fromJson(Json json) => AttendanceDraft(
    id: asString(json['id'], 'attendanceDraft.id'),
    userId: asString(json['userId'], 'attendanceDraft.userId'),
    campusId: asString(json['campusId'], 'attendanceDraft.campusId'),
    studentId: asString(json['studentId'], 'attendanceDraft.studentId'),
    attendanceDate: asString(
      json['attendanceDate'],
      'attendanceDraft.attendanceDate',
    ),
    periodKey: asString(json['periodKey'], 'attendanceDraft.periodKey'),
    state: asString(json['state'], 'attendanceDraft.state'),
    savedAt: DateTime.parse(
      asString(json['savedAt'], 'attendanceDraft.savedAt'),
    ),
    note: json['note'] as String?,
  );

  Json toJson() => {
    'id': id,
    'userId': userId,
    'campusId': campusId,
    'studentId': studentId,
    'attendanceDate': attendanceDate,
    'periodKey': periodKey,
    'state': state,
    'savedAt': savedAt.toIso8601String(),
    if (note != null) 'note': note,
  };

  final String id;
  final String userId;
  final String campusId;
  final String studentId;
  final String attendanceDate;
  final String periodKey;
  final String state;
  final DateTime savedAt;
  final String? note;
}
