import 'identity_models.dart';
import 'student_models.dart';

class AdminCampusRow {
  const AdminCampusRow({
    required this.id,
    required this.name,
    required this.detail,
    required this.status,
  });
  factory AdminCampusRow.fromJson(Json json) => AdminCampusRow(
    id: asString(json['id'], 'adminCampus.id'),
    name: asString(json['name'], 'adminCampus.name'),
    detail: asString(json['detail'], 'adminCampus.detail'),
    status: asString(json['status'], 'adminCampus.status'),
  );
  final String id;
  final String name;
  final String detail;
  final String status;
}

class AcademicSetupRow {
  const AcademicSetupRow({
    required this.id,
    required this.name,
    required this.detail,
    required this.status,
    this.code,
    this.startsOn,
    this.endsOn,
    this.classId,
    this.capacity,
    this.sortOrder,
    this.isOptional,
  });
  factory AcademicSetupRow.fromJson(Json json) => AcademicSetupRow(
    id: asString(json['id'], 'academicSetup.id'),
    name: asString(json['name'], 'academicSetup.name'),
    detail: asString(json['detail'], 'academicSetup.detail'),
    status: asString(json['status'], 'academicSetup.status'),
    code: json['code'] as String?,
    startsOn: json['startsOn'] == null
        ? null
        : DateTime.parse(asString(json['startsOn'], 'academicSetup.startsOn')),
    endsOn: json['endsOn'] == null
        ? null
        : DateTime.parse(asString(json['endsOn'], 'academicSetup.endsOn')),
    classId: json['classId'] as String?,
    capacity: json['capacity'] == null
        ? null
        : asInt(json['capacity'], 'academicSetup.capacity'),
    sortOrder: json['sortOrder'] == null
        ? null
        : asInt(json['sortOrder'], 'academicSetup.sortOrder'),
    isOptional: json['isOptional'] as bool?,
  );
  final String id;
  final String name;
  final String detail;
  final String status;
  final String? code;
  final DateTime? startsOn;
  final DateTime? endsOn;
  final String? classId;
  final int? capacity;
  final int? sortOrder;
  final bool? isOptional;
}

class AcademicSetupOption {
  const AcademicSetupOption({
    required this.id,
    required this.name,
    this.campusId,
  });
  factory AcademicSetupOption.fromJson(Json json) => AcademicSetupOption(
    id: asString(json['id'], 'setupOption.id'),
    name: asString(json['name'], 'setupOption.name'),
    campusId: json['campusId'] as String?,
  );
  final String id;
  final String name;
  final String? campusId;
}

class AcademicSetupOptions {
  const AcademicSetupOptions({required this.campuses, required this.classes});
  factory AcademicSetupOptions.fromJson(Json json) => AcademicSetupOptions(
    campuses: asJsonList(
      json['campuses'],
      'setupOptions.campuses',
    ).map(AcademicSetupOption.fromJson).toList(growable: false),
    classes: asJsonList(
      json['classes'],
      'setupOptions.classes',
    ).map(AcademicSetupOption.fromJson).toList(growable: false),
  );
  final List<AcademicSetupOption> campuses;
  final List<AcademicSetupOption> classes;
}

class AdminUserRow {
  const AdminUserRow({
    required this.id,
    required this.displayName,
    required this.email,
    required this.role,
    required this.status,
    this.primaryCampusId,
  });
  factory AdminUserRow.fromJson(Json json) => AdminUserRow(
    id: asString(json['id'], 'adminUser.id'),
    displayName: asString(json['displayName'], 'adminUser.displayName'),
    email: asString(json['email'], 'adminUser.email'),
    role: asString(json['role'], 'adminUser.role'),
    status: asString(json['status'], 'adminUser.status'),
    primaryCampusId: json['campusId'] as String?,
  );
  final String id;
  final String displayName;
  final String email;
  final String role;
  final String status;
  final String? primaryCampusId;
}

class AdminUsersPage {
  const AdminUsersPage({
    required this.rows,
    required this.campusOptions,
    required this.pageInfo,
  });
  factory AdminUsersPage.fromJson(Json json) => AdminUsersPage(
    rows: asJsonList(
      json['rows'],
      'users.rows',
    ).map(AdminUserRow.fromJson).toList(growable: false),
    campusOptions: asJsonList(
      json['campusOptions'],
      'users.campusOptions',
    ).map(AcademicSetupOption.fromJson).toList(growable: false),
    pageInfo: PageInfo.fromJson(asJson(json['pageInfo'], 'users.pageInfo')),
  );
  final List<AdminUserRow> rows;
  final List<AcademicSetupOption> campusOptions;
  final PageInfo pageInfo;
}

class AdminClassSectionScope {
  const AdminClassSectionScope({
    required this.classId,
    required this.sectionId,
    this.name,
    this.campusId,
  });
  factory AdminClassSectionScope.fromJson(Json json) => AdminClassSectionScope(
    classId: asString(json['classId'], 'classSectionScope.classId'),
    sectionId: asString(json['sectionId'], 'classSectionScope.sectionId'),
    name: json['name'] as String?,
    campusId: json['campusId'] as String?,
  );
  final String classId;
  final String sectionId;
  final String? name;
  final String? campusId;
}

class AdminUserAccessDetail {
  const AdminUserAccessDetail({
    required this.user,
    required this.campusOptions,
    required this.campusIds,
    required this.classSectionOptions,
    required this.classSectionScopes,
  });
  factory AdminUserAccessDetail.fromJson(Json json) {
    final user = asJson(json['user'], 'userAccess.user');
    return AdminUserAccessDetail(
      user: AdminUserRow.fromJson(user),
      campusOptions: asJsonList(
        json['campusOptions'],
        'userAccess.campusOptions',
      ).map(AcademicSetupOption.fromJson).toList(growable: false),
      campusIds: (json['campusIds'] as List? ?? const [])
          .map((value) => asString(value, 'userAccess.campusId'))
          .toList(growable: false),
      classSectionOptions: asJsonList(
        json['classSectionOptions'],
        'userAccess.classSectionOptions',
      ).map(AdminClassSectionScope.fromJson).toList(growable: false),
      classSectionScopes: asJsonList(
        json['classSectionScopes'],
        'userAccess.classSectionScopes',
      ).map(AdminClassSectionScope.fromJson).toList(growable: false),
    );
  }
  final AdminUserRow user;
  final List<AcademicSetupOption> campusOptions;
  final List<String> campusIds;
  final List<AdminClassSectionScope> classSectionOptions;
  final List<AdminClassSectionScope> classSectionScopes;
}
