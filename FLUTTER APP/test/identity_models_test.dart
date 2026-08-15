import 'package:flutter_test/flutter_test.dart';
import 'package:school_erp_mobile/shared/models/identity_models.dart';

void main() {
  test('parses the live /me contract and evaluates permissions', () {
    final user = CurrentUser.fromJson({
      'id': 'user-1',
      'email': 'parent@example.com',
      'displayName': 'Parent User',
      'role': 'parent',
      'organization': {'id': 'org-1', 'name': 'School One'},
      'campus': {'id': 'campus-1', 'name': 'Main Campus'},
      'campuses': [
        {'id': 'campus-1', 'name': 'Main Campus'},
      ],
      'linkedStudentId': null,
      'linkedEmployeeId': null,
      'linkedGuardianId': 'guardian-1',
      'permissions': ['portals:read', 'attendance:read'],
    });

    expect(user.role, 'parent');
    expect(user.campus?.name, 'Main Campus');
    expect(user.can('attendance:read'), isTrue);
    expect(user.can('fees:refund'), isFalse);
  });
}
