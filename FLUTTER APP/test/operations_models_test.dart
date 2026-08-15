import 'package:flutter_test/flutter_test.dart';
import 'package:school_erp_mobile/shared/models/operations_models.dart';

void main() {
  test('parses visitor and gate-pass details safely', () {
    final visitor = SafetyVisitorRow.fromJson({
      'id': 'visitor-1',
      'name': 'Ravi Rao',
      'effectiveAt': '2026-08-15T10:00:00.000Z',
      'detailsJson': '{"purpose":"Meeting","hostName":"Principal"}',
      'status': 'expected',
    });
    final pass = SafetyGatePassRow.fromJson({
      'id': 'pass-1',
      'name': 'Gate pass for Ravi Rao',
      'referenceId': 'visitor-1',
      'effectiveAt': '2026-08-15T18:00:00.000Z',
      'detailsJson': '{"reason":"Pickup"}',
      'status': 'requested',
    });

    expect(visitor.purpose, 'Meeting');
    expect(visitor.hostName, 'Principal');
    expect(pass.visitorId, 'visitor-1');
    expect(pass.reason, 'Pickup');
  });

  test('parses health profiles and clinic visits', () {
    final profile = HealthProfileRow.fromJson({
      'id': 'profile-1',
      'studentId': 'student-1',
      'studentName': 'Asha Rao',
      'allergies': 'Peanuts',
      'conditions': null,
      'updatedAt': '2026-08-15T10:00:00.000Z',
    });
    final visit = ClinicVisitRow.fromJson({
      'id': 'visit-1',
      'studentId': 'student-1',
      'studentName': 'Asha Rao',
      'visitedAt': '2026-08-15T10:00:00.000Z',
      'summary': 'Rested and returned to class',
      'status': 'active',
    });

    expect(profile.allergies, 'Peanuts');
    expect(profile.conditions, isNull);
    expect(visit.summary, contains('returned'));
  });
}
