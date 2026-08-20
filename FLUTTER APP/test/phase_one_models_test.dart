import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:school_erp_mobile/shared/models/academic_models.dart';
import 'package:school_erp_mobile/shared/models/approval_models.dart';
import 'package:school_erp_mobile/shared/pdf/erp_pdf.dart';
import 'package:school_erp_mobile/shared/models/student_models.dart';
import 'package:school_erp_mobile/shared/models/workspace_models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('parses assignment attachment metadata and payslip snapshots', () {
    final submission = AssignmentSubmission.fromJson({
      'id': 'submission-1',
      'studentId': 'student-1',
      'studentName': 'Asha Rao',
      'response': 'Completed work',
      'submittedAt': '2026-08-19T08:00:00Z',
      'status': 'active',
      'score': null,
      'feedback': null,
      'attachments': [
        {
          'id': 'document-1',
          'category': 'assignment_attachment',
          'secureUrl': 'https://res.cloudinary.com/demo/raw/upload/file.pdf',
          'resourceType': 'raw',
          'format': 'pdf',
          'bytes': 1200,
          'originalFilename': 'work.pdf',
          'accessPolicy': 'private',
          'createdAt': '2026-08-19T08:01:00Z',
          'status': 'active',
        },
      ],
    });
    final payslip = PayslipRow.fromJson({
      'id': 'payslip-1',
      'employeeNumber': 'EMP-1',
      'employeeName': 'Maya Teacher',
      'period': 'August 2026',
      'gross': 'INR 50,000.00',
      'deductions': 'INR 5,000.00',
      'net': 'INR 45,000.00',
      'status': 'issued',
      'issuedAt': '2026-08-19T08:00:00Z',
      'snapshotJson': jsonEncode({
        'salaryMinor': 4500000,
        'allowanceMinor': 500000,
      }),
    });

    expect(submission.attachments.single.originalFilename, 'work.pdf');
    expect(payslip.snapshot?['salaryMinor'], 4500000);
  });

  test('counts a unified approval inbox', () {
    final inbox = ApprovalInbox(
      admissions: [
        AdmissionApproval(
          id: 'application-1',
          name: 'Asha Rao',
          applicationNumber: 'APP-1',
          status: 'submitted',
        ),
      ],
      leaveRequests: const [],
      attendanceCorrections: const [],
      requisitions: const [],
      facilityBookings: const [],
    );

    expect(inbox.count, 1);
    expect(inbox.isEmpty, isFalse);
  });

  test('builds a shareable fee receipt PDF without platform IO', () async {
    final bytes = await ErpPdfBuilder.feeReceipt(
      schoolName: 'School One',
      studentName: 'Asha Rao',
      payment: StudentPaymentRow(
        id: 'payment-1',
        invoiceId: 'invoice-1',
        invoiceNumber: 'INV-1',
        receiptNumber: 'REC-1',
        amountMinor: 12500,
        currency: 'INR',
        method: 'upi',
        paidAt: DateTime.utc(2026, 8, 19),
        status: 'posted',
      ),
    );
    expect(String.fromCharCodes(bytes.take(8)), startsWith('%PDF-'));
    expect(bytes.length, greaterThan(500));
  });
}
