import 'identity_models.dart';

class StaffAttendanceRow {
  const StaffAttendanceRow({
    required this.id,
    required this.employeeId,
    required this.name,
    required this.attendanceDate,
    required this.state,
    required this.status,
    this.note,
  });

  factory StaffAttendanceRow.fromJson(Json json) => StaffAttendanceRow(
    id: asString(json['id'], 'staffAttendance.id'),
    employeeId: asString(json['employeeId'], 'staffAttendance.employeeId'),
    name: asString(json['name'], 'staffAttendance.name'),
    attendanceDate: DateTime.parse(
      asString(json['effectiveAt'], 'staffAttendance.effectiveAt'),
    ),
    state: asString(json['state'], 'staffAttendance.state'),
    status: asString(json['status'], 'staffAttendance.status'),
    note: json['note'] as String?,
  );

  final String id;
  final String employeeId;
  final String name;
  final DateTime attendanceDate;
  final String state;
  final String status;
  final String? note;
}

class EmployeeOption {
  const EmployeeOption({required this.id, required this.name});

  factory EmployeeOption.fromJson(Json json) => EmployeeOption(
    id: asString(json['id'], 'employeeOption.id'),
    name: asString(json['name'], 'employeeOption.name'),
  );

  final String id;
  final String name;
}
