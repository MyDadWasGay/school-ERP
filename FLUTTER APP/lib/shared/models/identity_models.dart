typedef Json = Map<String, Object?>;

Json asJson(Object? value, String field) {
  if (value is Map<String, Object?>) return value;
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  throw FormatException('$field must be an object.');
}

List<Json> asJsonList(Object? value, String field) {
  if (value is! List) throw FormatException('$field must be a list.');
  return value.map((item) => asJson(item, field)).toList(growable: false);
}

String asString(Object? value, String field) {
  if (value is String) return value;
  throw FormatException('$field must be a string.');
}

int asInt(Object? value, String field) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  throw FormatException('$field must be an integer.');
}

double asDouble(Object? value, String field) {
  if (value is num) return value.toDouble();
  throw FormatException('$field must be a number.');
}

class Campus {
  const Campus({required this.id, required this.name});
  factory Campus.fromJson(Json json) => Campus(
    id: asString(json['id'], 'campus.id'),
    name: asString(json['name'], 'campus.name'),
  );
  final String id;
  final String name;
}

class CurrentUser {
  const CurrentUser({
    required this.id,
    required this.email,
    required this.displayName,
    required this.role,
    required this.organization,
    required this.campus,
    required this.campuses,
    required this.permissions,
    this.linkedStudentId,
    this.linkedEmployeeId,
    this.linkedGuardianId,
  });

  factory CurrentUser.fromJson(Json json) => CurrentUser(
    id: asString(json['id'], 'me.id'),
    email: asString(json['email'], 'me.email'),
    displayName: asString(json['displayName'], 'me.displayName'),
    role: asString(json['role'], 'me.role'),
    organization: Campus.fromJson(
      asJson(json['organization'], 'me.organization'),
    ),
    campus: json['campus'] == null
        ? null
        : Campus.fromJson(asJson(json['campus'], 'me.campus')),
    campuses: asJsonList(
      json['campuses'],
      'me.campuses',
    ).map(Campus.fromJson).toList(growable: false),
    permissions: (json['permissions'] as List? ?? const [])
        .map((item) => asString(item, 'permission'))
        .toSet(),
    linkedStudentId: json['linkedStudentId'] as String?,
    linkedEmployeeId: json['linkedEmployeeId'] as String?,
    linkedGuardianId: json['linkedGuardianId'] as String?,
  );

  final String id;
  final String email;
  final String displayName;
  final String role;
  final Campus organization;
  final Campus? campus;
  final List<Campus> campuses;
  final Set<String> permissions;
  final String? linkedStudentId;
  final String? linkedEmployeeId;
  final String? linkedGuardianId;

  bool can(String permission) =>
      permissions.contains('*') || permissions.contains(permission);
}

class PortalMetric {
  const PortalMetric({
    required this.label,
    required this.value,
    required this.detail,
    required this.href,
  });
  factory PortalMetric.fromJson(Json json) => PortalMetric(
    label: asString(json['label'], 'metric.label'),
    value: asString(json['value'], 'metric.value'),
    detail: asString(json['detail'], 'metric.detail'),
    href: asString(json['href'], 'metric.href'),
  );
  final String label;
  final String value;
  final String detail;
  final String href;
}

class PortalStudent {
  const PortalStudent({
    required this.id,
    required this.name,
    required this.detail,
    required this.status,
  });
  factory PortalStudent.fromJson(Json json) => PortalStudent(
    id: asString(json['id'], 'student.id'),
    name: asString(json['name'], 'student.name'),
    detail: asString(json['detail'], 'student.detail'),
    status: asString(json['status'], 'student.status'),
  );
  final String id;
  final String name;
  final String detail;
  final String status;
}

class PortalRecentItem {
  const PortalRecentItem({
    required this.title,
    required this.detail,
    required this.href,
  });
  factory PortalRecentItem.fromJson(Json json) => PortalRecentItem(
    title: asString(json['title'], 'recent.title'),
    detail: asString(json['detail'], 'recent.detail'),
    href: asString(json['href'], 'recent.href'),
  );
  final String title;
  final String detail;
  final String href;
}

class PortalSnapshot {
  const PortalSnapshot({
    required this.portal,
    required this.metrics,
    required this.students,
    required this.recent,
    required this.offlineNote,
  });
  factory PortalSnapshot.fromJson(Json json) => PortalSnapshot(
    portal: asString(json['portal'], 'portal'),
    metrics: asJsonList(
      json['metrics'],
      'metrics',
    ).map(PortalMetric.fromJson).toList(growable: false),
    students: asJsonList(
      json['students'],
      'students',
    ).map(PortalStudent.fromJson).toList(growable: false),
    recent: asJsonList(
      json['recent'],
      'recent',
    ).map(PortalRecentItem.fromJson).toList(growable: false),
    offlineNote: asString(json['offlineNote'], 'offlineNote'),
  );
  final String portal;
  final List<PortalMetric> metrics;
  final List<PortalStudent> students;
  final List<PortalRecentItem> recent;
  final String offlineNote;
}

class ManagementDashboard {
  const ManagementDashboard({
    required this.students,
    required this.attendanceRate,
    required this.collectionRate,
    required this.pendingMinor,
    required this.staff,
  });
  factory ManagementDashboard.fromJson(Json json) {
    final metrics = asJson(json['metrics'], 'dashboard.metrics');
    return ManagementDashboard(
      students: asInt(metrics['students'], 'metrics.students'),
      attendanceRate: asDouble(
        metrics['attendanceRate'],
        'metrics.attendanceRate',
      ),
      collectionRate: asDouble(
        metrics['collectionRate'],
        'metrics.collectionRate',
      ),
      pendingMinor: asInt(metrics['pendingMinor'], 'metrics.pendingMinor'),
      staff: asInt(metrics['staff'], 'metrics.staff'),
    );
  }
  final int students;
  final double attendanceRate;
  final double collectionRate;
  final int pendingMinor;
  final int staff;
}
