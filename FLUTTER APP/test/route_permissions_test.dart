import 'package:flutter_test/flutter_test.dart';
import 'package:school_erp_mobile/app/router/route_permissions.dart';
import 'package:school_erp_mobile/shared/models/identity_models.dart';

CurrentUser testUser(List<String> permissions) => CurrentUser.fromJson({
  'id': 'user-test',
  'email': 'test@example.com',
  'displayName': 'Test user',
  'role': 'office_staff',
  'organization': {'id': 'org-1', 'name': 'School'},
  'campus': {'id': 'campus-1', 'name': 'Main'},
  'campuses': [],
  'permissions': permissions,
});

void main() {
  test('maps protected routes to their server capabilities', () {
    expect(permissionForPath('/exams'), 'exams:read');
    expect(permissionForPath('/admissions'), 'admissions:read');
    expect(permissionForPath('/finance'), 'fees:read');
    expect(permissionForPath('/hr'), 'hr:read');
    expect(permissionForPath('/profile'), isNull);
    expect(permissionForPath('/operations'), isNull);
    expect(
      canAccessPath('/approvals', testUser(['attendance:approve_leave'])),
      isTrue,
    );
    expect(canAccessPath('/approvals', testUser(['attendance:read'])), isFalse);
  });

  test('allows people directory for either student or staff scope', () {
    final studentReader = CurrentUser.fromJson({
      'id': 'user-1',
      'email': 'admin@example.com',
      'displayName': 'Admin',
      'role': 'office_staff',
      'organization': {'id': 'org-1', 'name': 'School'},
      'campus': {'id': 'campus-1', 'name': 'Main'},
      'campuses': [],
      'permissions': ['students:read'],
    });
    final hrReader = CurrentUser.fromJson({
      'id': 'user-2',
      'email': 'hr@example.com',
      'displayName': 'HR',
      'role': 'hr',
      'organization': {'id': 'org-1', 'name': 'School'},
      'campus': {'id': 'campus-1', 'name': 'Main'},
      'campuses': [],
      'permissions': ['hr:read'],
    });

    expect(canAccessPath('/people', studentReader), isTrue);
    expect(canAccessPath('/people', hrReader), isTrue);

    expect(canAccessPath('/operations', studentReader), isFalse);

    final assetReader = CurrentUser.fromJson({
      'id': 'user-3',
      'email': 'assets@example.com',
      'displayName': 'Asset manager',
      'role': 'office_staff',
      'organization': {'id': 'org-1', 'name': 'School'},
      'campus': {'id': 'campus-1', 'name': 'Main'},
      'campuses': [],
      'permissions': ['assets:read'],
    });
    expect(canAccessPath('/back-office', assetReader), isTrue);
  });

  test('keeps grouped mobile workspaces aligned with their visible tabs', () {
    final accountsReader = testUser(['accounts:read']);
    expect(canAccessPath('/finance', accountsReader), isTrue);
    expect(canAccessPath('/operations', accountsReader), isFalse);

    final inventoryReader = testUser(['inventory:read']);
    expect(canAccessPath('/back-office', inventoryReader), isTrue);
    expect(canAccessPath('/operations', inventoryReader), isFalse);

    final payrollReader = testUser(['payroll:read']);
    expect(canAccessPath('/hr', payrollReader), isTrue);
  });
}
