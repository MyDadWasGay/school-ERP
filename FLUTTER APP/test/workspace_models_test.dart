import 'package:flutter_test/flutter_test.dart';
import 'package:school_erp_mobile/shared/models/workspace_models.dart';

void main() {
  test('parses exam workspace contracts', () {
    final options = ExamWorkspaceOptions.fromJson({
      'exams': [
        {
          'id': 'exam-1',
          'name': 'Term 1',
          'maxMarks': 100,
          'status': 'marks_entry',
        },
      ],
      'subjects': [
        {'id': 'subject-1', 'name': 'Mathematics'},
      ],
      'students': [
        {'id': 'student-1', 'name': 'Asha Rao'},
      ],
    });
    final planning = ExamPlanningRow.fromJson({
      'id': 'exam-1',
      'name': 'Term 1',
      'maxMarks': 100,
      'status': 'moderation',
      'scheduleCount': 2,
      'startsOn': '15 Aug 2026',
      'endsOn': '30 Aug 2026',
    });

    expect(options.exams.single.maxMarks, 100);
    expect(options.students.single.name, 'Asha Rao');
    expect(planning.scheduleCount, 2);
    expect(planning.status, 'moderation');
  });

  test('parses admissions and finance workspace rows', () {
    final approval = AdmissionApproval.fromJson({
      'id': 'application-1',
      'name': 'Asha Rao',
      'applicationNumber': 'APP-2026-001',
      'status': 'submitted',
    });
    final invoice = FinanceInvoiceRow.fromJson({
      'id': 'invoice-1',
      'student': 'Asha Rao',
      'invoiceNumber': 'INV-2026-001',
      'total': '₹10,000.00',
      'balance': '₹4,000.00',
      'status': 'partial',
    });
    final payment = PaymentRow.fromJson({
      'id': 'payment-1',
      'receiptNumber': 'REC-1',
      'amount': '₹6,000.00',
      'method': 'upi',
      'paidAt': '15 Aug 2026, 10:00 AM',
      'status': 'posted',
    });

    expect(approval.applicationNumber, 'APP-2026-001');
    expect(invoice.balance, '₹4,000.00');
    expect(payment.method, 'upi');
  });

  test('parses a scoped student profile with contacts and history', () {
    final profile = StudentProfileSummary.fromJson({
      'student': {
        'id': 'student-1',
        'admissionNumber': 'ADM-1',
        'firstName': 'Asha',
        'lastName': 'Rao',
        'status': 'active',
        'joinedOn': '2026-06-01T00:00:00.000Z',
        'bloodGroup': 'O+',
        'photoUrl': 'https://example.com/asha.jpg',
        'campusName': 'Main Campus',
      },
      'guardians': [
        {
          'firstName': 'Ravi',
          'lastName': 'Rao',
          'relationship': 'Father',
          'isPrimary': true,
          'isEmergencyContact': true,
          'phone': '+911234567890',
        },
      ],
      'enrollments': [
        {
          'status': 'active',
          'rollNumber': '12',
          'startsOn': '2026-06-01T00:00:00.000Z',
          'classId': 'class-1',
          'sectionId': 'section-a',
          'className': 'Class 5',
          'sectionName': 'A',
        },
      ],
      'timeline': [
        {
          'title': 'Admission approved',
          'eventType': 'admission',
          'occurredAt': '2026-06-02T00:00:00.000Z',
          'status': 'completed',
        },
      ],
      'certificates': [],
    });

    expect(profile.name, 'Asha Rao');
    expect(profile.campusName, 'Main Campus');
    expect(profile.photoUrl, 'https://example.com/asha.jpg');
    expect(profile.guardians.single.emergencyContact, isTrue);
    expect(profile.enrollments.single.rollNumber, '12');
    expect(profile.enrollments.single.className, 'Class 5');
    expect(profile.enrollments.single.sectionName, 'A');
    expect(profile.timeline.single.title, 'Admission approved');
  });

  test('parses an admissions enquiry contact row', () {
    final enquiry = AdmissionEnquiry.fromJson({
      'id': 'enquiry-1',
      'name': 'Asha Rao',
      'detail': 'Front desk',
      'source': 'Front desk',
      'status': 'new',
      'guardianName': 'Ravi Rao',
      'guardianPhone': '+911234567890',
      'guardianEmail': 'ravi@example.com',
      'notes': 'Interested in Grade 5',
    });

    expect(enquiry.name, 'Asha Rao');
    expect(enquiry.guardianPhone, '+911234567890');
    expect(enquiry.status, 'new');
  });

  test('parses staff and payroll workspace rows', () {
    final employee = EmployeeRow.fromJson({
      'id': 'employee-1',
      'employeeNumber': 'EMP-1',
      'firstName': 'Asha',
      'lastName': 'Rao',
      'email': 'asha@example.com',
      'jobTitle': 'Teacher',
      'salaryMinor': 5000000,
      'status': 'active',
    });
    final run = PayrollRunRow.fromJson({
      'id': 'run-1',
      'period': '2026-08',
      'total': '₹50,000.00',
      'status': 'completed',
      'payslipCount': 10,
      'processedAt': '2026-08-31T10:00:00.000Z',
    });
    final payslip = PayslipRow.fromJson({
      'id': 'payslip-1',
      'employeeNumber': 'EMP-1',
      'employeeName': 'Asha Rao',
      'period': '2026-08',
      'gross': '₹50,000.00',
      'deductions': '₹2,000.00',
      'net': '₹48,000.00',
      'status': 'issued',
      'issuedAt': '2026-08-31T10:00:00.000Z',
    });

    expect(employee.name, 'Asha Rao');
    expect(run.payslipCount, 10);
    expect(payslip.net, '₹48,000.00');
  });
}
