import 'package:flutter_test/flutter_test.dart';

import 'package:school_erp_mobile/shared/models/academic_models.dart';
import 'package:school_erp_mobile/shared/models/communication_models.dart';
import 'package:school_erp_mobile/shared/models/leave_models.dart';
import 'package:school_erp_mobile/shared/models/library_models.dart';
import 'package:school_erp_mobile/shared/models/student_models.dart';
import 'package:school_erp_mobile/shared/models/teacher_models.dart';
import 'package:school_erp_mobile/shared/models/transport_models.dart';

void main() {
  test('parses shared academic and communication rows', () {
    final academic = AcademicRecord.fromJson({
      'id': 'assignment-1',
      'name': 'Fractions worksheet',
      'detail': 'Grade 7 | Mathematics | due 15 Aug 2026',
      'status': 'published',
    });
    final notice = NoticeRow.fromJson({
      'id': 'notice-1',
      'title': 'Holiday',
      'body': 'Campus is closed tomorrow.',
      'audience': 'all',
      'status': 'published',
      'publishedAt': '2026-08-15T10:00:00.000Z',
    });

    expect(academic.name, 'Fractions worksheet');
    expect(academic.status, 'published');
    expect(notice.publishedAt, isNotNull);
    expect(notice.audience, 'all');
  });

  test('parses leave and teacher attendance contracts', () {
    final leave = LeaveRequest.fromJson({
      'id': 'leave-1',
      'requester': 'My request',
      'startsOn': '15 Aug 2026',
      'endsOn': '16 Aug 2026',
      'reason': 'Medical appointment',
      'status': 'pending',
      'canReview': false,
    });
    final page = TeacherAttendancePage.fromJson({
      'rows': [
        {
          'id': 'attendance-1',
          'studentId': 'student-1',
          'student': 'Asha Rao',
          'state': 'present',
          'period': 'daily',
          'markedAt': '15 Aug 2026, 9:00 AM',
        },
      ],
      'pageInfo': {'page': 1, 'pageSize': 100, 'total': 1, 'pageCount': 1},
      'attendanceDate': '2026-08-15',
    });

    expect(leave.status, 'pending');
    expect(page.rows.single.studentId, 'student-1');
    expect(page.attendanceDate, '2026-08-15');
  });

  test('parses scoped student document metadata', () {
    final document = DocumentRow.fromJson({
      'id': 'document-1',
      'category': 'report_card',
      'secureUrl': 'https://cdn.example.test/report.pdf',
      'resourceType': 'raw',
      'accessPolicy': 'linked_student',
      'status': 'active',
      'createdAt': '2026-08-15T10:00:00.000Z',
      'format': 'pdf',
      'bytes': 2048,
      'originalFilename': 'report-card.pdf',
    });

    expect(document.originalFilename, 'report-card.pdf');
    expect(document.bytes, 2048);
    expect(document.status, 'active');
  });

  test('parses library and transport read models', () {
    final item = LibraryItem.fromJson({
      'id': 'book-1',
      'title': 'The Blue Umbrella',
      'author': 'Ruskin Bond',
      'isbn': '9788129119288',
      'totalCopies': 3,
      'availableCopies': 2,
      'status': 'active',
    });
    final issue = LibraryIssue.fromJson({
      'id': 'issue-1',
      'title': 'The Blue Umbrella',
      'accessionNumber': 'ACC-1',
      'issuedAt': '2026-08-10T10:00:00.000Z',
      'dueAt': '2026-08-20T10:00:00.000Z',
      'renewalCount': 0,
    });
    final copy = LibraryCopyRow.fromJson({
      'id': 'copy-1',
      'accessionNumber': 'ACC-1',
      'status': 'available',
      'itemId': 'book-1',
      'title': 'The Blue Umbrella',
    });
    final resource = DigitalResource.fromJson({
      'id': 'resource-1',
      'name': 'Reading guide',
      'detailsJson':
          '{"url":"https://example.test/guide.pdf","description":"Guide"}',
      'status': 'active',
    });
    final allocation = TransportAllocation.fromJson({
      'id': 'allocation-1',
      'routeId': 'route-1',
      'routeName': 'Route A',
      'studentId': 'student-1',
      'studentName': 'Asha Rao',
      'stopName': 'Main gate',
      'createdAt': '2026-08-01T10:00:00.000Z',
    });
    final route = TransportRouteRow.fromJson({
      'id': 'route-1',
      'name': 'Route A',
      'capacity': 40,
      'vehicleId': 'vehicle-1',
      'status': 'active',
    });
    final vehicle = TransportVehicleRow.fromJson({
      'id': 'vehicle-1',
      'registrationNumber': 'BUS-01',
      'type': 'Bus',
      'capacity': 40,
      'status': 'active',
    });

    expect(item.availableCopies, 2);
    expect(issue.dueAt, isNotNull);
    expect(copy.status, 'available');
    expect(resource.url, 'https://example.test/guide.pdf');
    expect(allocation.stopName, 'Main gate');
    expect(route.capacity, 40);
    expect(vehicle.registrationNumber, 'BUS-01');
  });
}
