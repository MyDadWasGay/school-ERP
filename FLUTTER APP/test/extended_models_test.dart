import 'package:flutter_test/flutter_test.dart';
import 'package:school_erp_mobile/shared/models/admission_models.dart';
import 'package:school_erp_mobile/shared/models/asset_models.dart';
import 'package:school_erp_mobile/shared/models/attendance_models.dart';
import 'package:school_erp_mobile/shared/models/communication_models.dart';
import 'package:school_erp_mobile/shared/models/library_models.dart';
import 'package:school_erp_mobile/shared/models/student_models.dart';
import 'package:school_erp_mobile/shared/models/transport_models.dart';

void main() {
  test('parses communication, admission and student management contracts', () {
    final message = CommunicationMessageRow.fromJson({
      'id': 'message-1',
      'subject': 'Exam update',
      'body': 'The schedule is ready.',
      'status': 'draft',
      'audience': {'type': 'role', 'role': 'teacher'},
      'createdAt': '2026-08-15T08:00:00Z',
      'publishedAt': null,
    });
    final options = AdmissionOptions.fromJson({
      'campuses': [
        {'id': 'campus-1', 'name': 'Main'},
      ],
      'academicYears': [
        {'id': 'year-1', 'name': '2026-27'},
      ],
      'classes': [
        {'id': 'class-1', 'name': 'Grade 7'},
      ],
      'sections': [
        {'id': 'section-1', 'name': 'A', 'classId': 'class-1'},
      ],
      'enquiries': [],
    });
    final studentOptions = StudentFormOptions.fromJson({
      'campuses': [
        {'id': 'campus-1', 'name': 'Main', 'code': 'M'},
      ],
      'academicYears': [],
      'classes': [],
      'sections': [],
    });

    expect(message.audience.role, 'teacher');
    expect(options.campuses.single.name, 'Main');
    expect(studentOptions.campuses.single.code, 'M');
  });

  test('parses operations, transport and library metadata', () {
    final asset = AssetRow.fromJson({
      'id': 'asset-1',
      'name': 'Laptop',
      'status': 'active',
      'code': 'LAP-1',
      'detailsJson':
          '{"category":"IT","serialNumber":"SN-1","acquisitionMinor":50000}',
    });
    final document = TransportDocumentRow.fromJson({
      'id': 'doc-1',
      'name': 'Insurance',
      'vehicleId': 'vehicle-1',
      'registrationNumber': 'KA01AB1234',
      'status': 'active',
      'detailsJson': '{"expiresOn":"2027-01-01T00:00:00Z"}',
    });
    final reservation = LibraryReservationRow.fromJson({
      'id': 'reservation-1',
      'name': 'Mathematics',
      'itemId': 'item-1',
      'status': 'pending',
      'createdAt': '2026-08-15T08:00:00Z',
    });

    expect(asset.category, 'IT');
    expect(asset.acquisitionMinor, 50000);
    expect(document.expiresOn?.year, 2027);
    expect(reservation.status, 'pending');
  });

  test('offline attendance drafts retain scope and state', () {
    final draft = AttendanceDraft(
      id: 'draft-1',
      userId: 'user-1',
      campusId: 'campus-1',
      studentId: 'student-1',
      attendanceDate: '2026-08-15',
      periodKey: 'period-1',
      state: 'absent',
      note: 'Medical leave',
      savedAt: DateTime(2026, 8, 15, 9),
    );
    final restored = AttendanceDraft.fromJson(draft.toJson());

    expect(restored.studentId, draft.studentId);
    expect(restored.state, 'absent');
    expect(restored.campusId, 'campus-1');
    expect(restored.attendanceDate, '2026-08-15');
  });
}
