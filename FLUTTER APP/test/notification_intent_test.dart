import 'package:flutter_test/flutter_test.dart';
import 'package:school_erp_mobile/core/notifications/notification_intent.dart';
import 'package:school_erp_mobile/shared/models/identity_models.dart';

void main() {
  test('parses a payload and resolves it to an authorized module route', () {
    final intent = NotificationIntent.tryParse({
      'type': 'assignment',
      'route': '/assignments/assignment-1',
      'entity_id': 'assignment-1',
      'tenant_id': 'org-1',
      'campus_id': 'campus-1',
    });

    expect(intent, isNotNull);
    expect(intent!.entityId, 'assignment-1');
    expect(intent.resolveRoute(), '/assignments?id=assignment-1');
    expect(intent.isAllowedFor(_user()), isTrue);
  });

  test('rejects external routes and cross-tenant intents', () {
    expect(
      NotificationIntent.tryParse({
        'type': 'notice',
        'route': 'https://example.com/steal-session',
      }),
      isNull,
    );

    final intent = NotificationIntent.tryParse({
      'type': 'notice',
      'route': '/notices',
      'tenant_id': 'org-2',
    });

    expect(intent, isNotNull);
    expect(intent!.isAllowedFor(_user()), isFalse);
  });
}

CurrentUser _user() => const CurrentUser(
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'User',
  role: 'teacher',
  organization: Campus(id: 'org-1', name: 'School'),
  campus: Campus(id: 'campus-1', name: 'Main'),
  campuses: [Campus(id: 'campus-1', name: 'Main')],
  permissions: {'academics:read'},
);
