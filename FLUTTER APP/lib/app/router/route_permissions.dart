import '../../shared/models/identity_models.dart';

String? permissionForPath(String path) {
  if (path.startsWith('/student')) return 'portals:read';
  if (path.startsWith('/notifications') || path.startsWith('/notices')) {
    return 'communication:read';
  }
  if (path.startsWith('/timetable') || path.startsWith('/assignments')) {
    return 'academics:read';
  }
  if (path.startsWith('/syllabus')) return 'academics:read';
  if (path.startsWith('/exams')) return 'exams:read';
  if (path.startsWith('/admit-cards')) return 'exams:read';
  if (path.startsWith('/admissions')) return 'admissions:read';
  if (path.startsWith('/finance')) return 'fees:read';
  if (path.startsWith('/hr')) return 'hr:read';
  if (path.startsWith('/attendance')) return 'attendance:read';
  if (path.startsWith('/leave')) return 'attendance:read';
  if (path.startsWith('/library')) return 'library:read';
  if (path.startsWith('/transport')) return 'transport:read';
  return null;
}

bool canAccessPath(String path, CurrentUser user) {
  if (path.startsWith('/people')) {
    return user.can('students:read') || user.can('hr:read');
  }
  if (path.startsWith('/operations')) {
    return user.can('safety:read') || user.can('health:read');
  }
  if (path.startsWith('/finance')) {
    return user.can('fees:read') || user.can('accounts:read');
  }
  if (path.startsWith('/back-office')) {
    return user.can('assets:read') ||
        user.can('inventory:read') ||
        user.can('procurement:read') ||
        user.can('facilities:read') ||
        user.can('hostel:read') ||
        user.can('canteen:read');
  }
  if (path.startsWith('/administration')) {
    return user.can('campuses:read') ||
        user.can('settings:read') ||
        user.can('users:read');
  }
  if (path.startsWith('/approvals')) {
    return user.can('admissions:approve') ||
        user.can('attendance:approve_leave') ||
        user.can('attendance:approve_correction') ||
        user.can('procurement:approve') ||
        user.can('facilities:approve');
  }
  if (path.startsWith('/hr')) {
    return user.can('hr:read') || user.can('payroll:read');
  }
  final requiredPermission = permissionForPath(path);
  return requiredPermission == null || user.can(requiredPermission);
}
