import 'dart:convert';

import 'identity_models.dart';

Map<String, Object?>? _payslipSnapshot(Object? value) {
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  if (value is! String || value.trim().isEmpty) return null;
  try {
    final decoded = jsonDecode(value);
    if (decoded is Map) {
      return decoded.map((key, item) => MapEntry(key.toString(), item));
    }
  } on FormatException {
    // Older or incomplete payslips remain readable without detail fields.
  }
  return null;
}

class ExamOption {
  const ExamOption({
    required this.id,
    required this.name,
    required this.maxMarks,
    required this.status,
  });

  factory ExamOption.fromJson(Json json) => ExamOption(
    id: asString(json['id'], 'exam.id'),
    name: asString(json['name'], 'exam.name'),
    maxMarks: asInt(json['maxMarks'], 'exam.maxMarks'),
    status: asString(json['status'], 'exam.status'),
  );

  final String id;
  final String name;
  final int maxMarks;
  final String status;
}

class SubjectOption {
  const SubjectOption({required this.id, required this.name});

  factory SubjectOption.fromJson(Json json) => SubjectOption(
    id: asString(json['id'], 'subject.id'),
    name: asString(json['name'], 'subject.name'),
  );

  final String id;
  final String name;
}

class ExamStudentOption {
  const ExamStudentOption({required this.id, required this.name});

  factory ExamStudentOption.fromJson(Json json) => ExamStudentOption(
    id: asString(json['id'], 'examStudent.id'),
    name: asString(json['name'], 'examStudent.name'),
  );

  final String id;
  final String name;
}

class ExamWorkspaceOptions {
  const ExamWorkspaceOptions({
    required this.exams,
    required this.subjects,
    required this.students,
  });

  factory ExamWorkspaceOptions.fromJson(Json json) => ExamWorkspaceOptions(
    exams: asJsonList(
      json['exams'],
      'examOptions',
    ).map(ExamOption.fromJson).toList(growable: false),
    subjects: asJsonList(
      json['subjects'],
      'subjectOptions',
    ).map(SubjectOption.fromJson).toList(growable: false),
    students: asJsonList(
      json['students'],
      'examStudentOptions',
    ).map(ExamStudentOption.fromJson).toList(growable: false),
  );

  final List<ExamOption> exams;
  final List<SubjectOption> subjects;
  final List<ExamStudentOption> students;
}

class ExamPlanningRow {
  const ExamPlanningRow({
    required this.id,
    required this.name,
    required this.maxMarks,
    required this.status,
    required this.scheduleCount,
    this.startsOn,
    this.endsOn,
  });

  factory ExamPlanningRow.fromJson(Json json) => ExamPlanningRow(
    id: asString(json['id'], 'examPlanning.id'),
    name: asString(json['name'], 'examPlanning.name'),
    maxMarks: asInt(json['maxMarks'], 'examPlanning.maxMarks'),
    status: asString(json['status'], 'examPlanning.status'),
    scheduleCount: asInt(json['scheduleCount'], 'examPlanning.scheduleCount'),
    startsOn: json['startsOn'] as String?,
    endsOn: json['endsOn'] as String?,
  );

  final String id;
  final String name;
  final int maxMarks;
  final String status;
  final int scheduleCount;
  final String? startsOn;
  final String? endsOn;
}

class ExamResultSummary {
  const ExamResultSummary({
    required this.id,
    required this.name,
    required this.maxMarks,
    required this.status,
    this.publishedAt,
  });

  factory ExamResultSummary.fromJson(Json json) => ExamResultSummary(
    id: asString(json['id'], 'examResult.id'),
    name: asString(json['name'], 'examResult.name'),
    maxMarks: asInt(json['maxMarks'], 'examResult.maxMarks'),
    status: asString(json['status'], 'examResult.status'),
    publishedAt: json['publishedAt'] as String?,
  );

  final String id;
  final String name;
  final int maxMarks;
  final String status;
  final String? publishedAt;
}

class AdmissionApproval {
  const AdmissionApproval({
    required this.id,
    required this.name,
    required this.applicationNumber,
    required this.status,
  });

  factory AdmissionApproval.fromJson(Json json) => AdmissionApproval(
    id: asString(json['id'], 'admissionApproval.id'),
    name: asString(json['name'], 'admissionApproval.name'),
    applicationNumber: asString(
      json['applicationNumber'],
      'admissionApproval.applicationNumber',
    ),
    status: asString(json['status'], 'admissionApproval.status'),
  );

  final String id;
  final String name;
  final String applicationNumber;
  final String status;
}

class AdmissionFollowUpSummary {
  const AdmissionFollowUpSummary({
    required this.id,
    required this.dueAt,
    required this.note,
    required this.status,
  });

  factory AdmissionFollowUpSummary.fromJson(Json json) =>
      AdmissionFollowUpSummary(
        id: asString(json['id'], 'followUp.id'),
        dueAt: asString(json['dueAt'], 'followUp.dueAt'),
        note: asString(json['note'], 'followUp.note'),
        status: json['status'] is String ? json['status']! as String : 'open',
      );

  final String id;
  final String dueAt;
  final String note;
  final String status;
}

class AdmissionAssessmentSummary {
  const AdmissionAssessmentSummary({
    required this.id,
    required this.assessmentType,
    required this.scheduledAt,
    required this.outcome,
    required this.status,
  });

  factory AdmissionAssessmentSummary.fromJson(Json json) =>
      AdmissionAssessmentSummary(
        id: asString(json['id'], 'assessment.id'),
        assessmentType: asString(
          json['assessmentType'],
          'assessment.assessmentType',
        ),
        scheduledAt: asString(json['scheduledAt'], 'assessment.scheduledAt'),
        outcome: json['outcome'] as String?,
        status: asString(json['status'], 'assessment.status'),
      );

  final String id;
  final String assessmentType;
  final String scheduledAt;
  final String? outcome;
  final String status;
}

class AdmissionApplication {
  const AdmissionApplication({
    required this.id,
    required this.name,
    required this.applicationNumber,
    required this.status,
    this.campusId,
    this.openAssessment,
  });

  factory AdmissionApplication.fromJson(Json json) => AdmissionApplication(
    id: asString(json['id'], 'admissionApplication.id'),
    name: asString(json['name'], 'admissionApplication.name'),
    applicationNumber: asString(
      json['detail'] ?? json['applicationNumber'],
      'admissionApplication.applicationNumber',
    ),
    status: asString(json['status'], 'admissionApplication.status'),
    campusId: json['campusId'] as String?,
    openAssessment: json['openAssessment'] == null
        ? null
        : AdmissionAssessmentSummary.fromJson(
            asJson(json['openAssessment'], 'admissionApplication.assessment'),
          ),
  );

  final String id;
  final String name;
  final String applicationNumber;
  final String status;
  final String? campusId;
  final AdmissionAssessmentSummary? openAssessment;
}

class StudentDirectoryRow {
  const StudentDirectoryRow({
    required this.id,
    required this.name,
    required this.detail,
    required this.status,
  });

  factory StudentDirectoryRow.fromJson(Json json) => StudentDirectoryRow(
    id: asString(json['id'], 'studentDirectory.id'),
    name: asString(json['name'], 'studentDirectory.name'),
    detail: asString(json['detail'], 'studentDirectory.detail'),
    status: asString(json['status'], 'studentDirectory.status'),
  );

  final String id;
  final String name;
  final String detail;
  final String status;
}

class StudentGuardianSummary {
  const StudentGuardianSummary({
    this.id,
    this.linkId,
    required this.name,
    required this.relationship,
    this.relationshipCode,
    this.customRelationship,
    required this.primary,
    required this.emergencyContact,
    this.billingContact = false,
    this.email,
    this.phone,
  });

  factory StudentGuardianSummary.fromJson(Json json) => StudentGuardianSummary(
    id: json['id'] as String?,
    linkId: json['linkId'] as String?,
    name:
        '${asString(json['firstName'], 'guardian.firstName')} '
        '${asString(json['lastName'], 'guardian.lastName')}',
    relationship: asString(
      json['customRelationship'] ?? json['relationship'],
      'guardian.relationship',
    ),
    relationshipCode: json['relationship'] as String?,
    customRelationship: json['customRelationship'] as String?,
    primary: json['isPrimary'] == true,
    emergencyContact: json['isEmergencyContact'] == true,
    billingContact: json['isBillingContact'] == true,
    email: json['email'] as String?,
    phone: json['phone'] as String?,
  );

  final String name;
  final String? id;
  final String? linkId;
  final String relationship;
  final String? relationshipCode;
  final String? customRelationship;
  final bool primary;
  final bool emergencyContact;
  final bool billingContact;
  final String? email;
  final String? phone;
}

class StudentEnrollmentSummary {
  const StudentEnrollmentSummary({
    required this.status,
    required this.rollNumber,
    required this.startsOn,
    this.endsOn,
    this.classId,
    this.sectionId,
  });

  factory StudentEnrollmentSummary.fromJson(Json json) =>
      StudentEnrollmentSummary(
        status: asString(json['status'], 'enrollment.status'),
        rollNumber: json['rollNumber'] as String?,
        startsOn: asString(json['startsOn'], 'enrollment.startsOn'),
        endsOn: json['endsOn'] as String?,
        classId: json['classId'] as String?,
        sectionId: json['sectionId'] as String?,
      );

  final String status;
  final String? rollNumber;
  final String startsOn;
  final String? endsOn;
  final String? classId;
  final String? sectionId;
}

class StudentTimelineEvent {
  const StudentTimelineEvent({
    required this.title,
    required this.eventType,
    required this.occurredAt,
    required this.status,
  });

  factory StudentTimelineEvent.fromJson(Json json) => StudentTimelineEvent(
    title: asString(json['title'], 'studentTimeline.title'),
    eventType: asString(json['eventType'], 'studentTimeline.eventType'),
    occurredAt: asString(json['occurredAt'], 'studentTimeline.occurredAt'),
    status: asString(json['status'], 'studentTimeline.status'),
  );

  final String title;
  final String eventType;
  final String occurredAt;
  final String status;
}

class StudentCertificateSummary {
  const StudentCertificateSummary({
    required this.number,
    required this.type,
    required this.issuedAt,
    required this.status,
  });

  factory StudentCertificateSummary.fromJson(Json json) =>
      StudentCertificateSummary(
        number: asString(json['certificateNumber'], 'certificate.number'),
        type: asString(json['certificateType'], 'certificate.type'),
        issuedAt: asString(json['issuedAt'], 'certificate.issuedAt'),
        status: asString(json['status'], 'certificate.status'),
      );

  final String number;
  final String type;
  final String issuedAt;
  final String status;
}

class StudentProfileSummary {
  const StudentProfileSummary({
    required this.id,
    required this.name,
    required this.admissionNumber,
    required this.status,
    required this.joinedOn,
    required this.guardians,
    required this.enrollments,
    required this.timeline,
    required this.certificates,
    this.email,
    this.phone,
    this.dateOfBirth,
    this.gender,
    this.bloodGroup,
  });

  factory StudentProfileSummary.fromJson(Json json) {
    final student = asJson(json['student'], 'studentProfile.student');
    return StudentProfileSummary(
      id: asString(student['id'], 'studentProfile.id'),
      name:
          '${asString(student['firstName'], 'student.firstName')} '
          '${asString(student['lastName'], 'student.lastName')}',
      admissionNumber: asString(
        student['admissionNumber'],
        'student.admissionNumber',
      ),
      status: asString(student['status'], 'student.status'),
      joinedOn: asString(student['joinedOn'], 'student.joinedOn'),
      email: student['email'] as String?,
      phone: student['phone'] as String?,
      dateOfBirth: student['dateOfBirth'] as String?,
      gender: student['gender'] as String?,
      bloodGroup: student['bloodGroup'] as String?,
      guardians: asJsonList(
        json['guardians'],
        'studentProfile.guardians',
      ).map(StudentGuardianSummary.fromJson).toList(growable: false),
      enrollments: asJsonList(
        json['enrollments'],
        'studentProfile.enrollments',
      ).map(StudentEnrollmentSummary.fromJson).toList(growable: false),
      timeline: asJsonList(
        json['timeline'],
        'studentProfile.timeline',
      ).map(StudentTimelineEvent.fromJson).toList(growable: false),
      certificates: asJsonList(
        json['certificates'],
        'studentProfile.certificates',
      ).map(StudentCertificateSummary.fromJson).toList(growable: false),
    );
  }

  final String id;
  final String name;
  final String admissionNumber;
  final String status;
  final String joinedOn;
  final List<StudentGuardianSummary> guardians;
  final List<StudentEnrollmentSummary> enrollments;
  final List<StudentTimelineEvent> timeline;
  final List<StudentCertificateSummary> certificates;
  final String? email;
  final String? phone;
  final String? dateOfBirth;
  final String? gender;
  final String? bloodGroup;
}

class AdmissionEnquiry {
  const AdmissionEnquiry({
    required this.id,
    required this.name,
    required this.detail,
    required this.status,
    required this.source,
    this.guardianName,
    this.guardianEmail,
    this.guardianPhone,
    this.notes,
    this.nextFollowUpAt,
    this.campusId,
    this.campaign,
    this.lostReason,
    this.openFollowUp,
  });

  factory AdmissionEnquiry.fromJson(Json json) => AdmissionEnquiry(
    id: asString(json['id'], 'admissionEnquiry.id'),
    name: asString(json['name'], 'admissionEnquiry.name'),
    detail: asString(json['detail'], 'admissionEnquiry.detail'),
    status: asString(json['status'], 'admissionEnquiry.status'),
    source: asString(json['source'], 'admissionEnquiry.source'),
    guardianName: json['guardianName'] as String?,
    guardianEmail: json['guardianEmail'] as String?,
    guardianPhone: json['guardianPhone'] as String?,
    notes: json['notes'] as String?,
    nextFollowUpAt: json['nextFollowUpAt'] as String?,
    campusId: json['campusId'] as String?,
    campaign: json['campaign'] as String?,
    lostReason: json['lostReason'] as String?,
    openFollowUp: json['openFollowUp'] == null
        ? null
        : AdmissionFollowUpSummary.fromJson(
            asJson(json['openFollowUp'], 'admissionEnquiry.followUp'),
          ),
  );

  final String id;
  final String name;
  final String detail;
  final String status;
  final String source;
  final String? guardianName;
  final String? guardianEmail;
  final String? guardianPhone;
  final String? notes;
  final String? nextFollowUpAt;
  final String? campusId;
  final String? campaign;
  final String? lostReason;
  final AdmissionFollowUpSummary? openFollowUp;
}

class FinanceInvoiceRow {
  const FinanceInvoiceRow({
    required this.id,
    required this.student,
    required this.invoiceNumber,
    required this.total,
    required this.balance,
    required this.status,
  });

  factory FinanceInvoiceRow.fromJson(Json json) => FinanceInvoiceRow(
    id: asString(json['id'], 'financeInvoice.id'),
    student: asString(json['student'], 'financeInvoice.student'),
    invoiceNumber: asString(
      json['invoiceNumber'],
      'financeInvoice.invoiceNumber',
    ),
    total: asString(json['total'], 'financeInvoice.total'),
    balance: asString(json['balance'], 'financeInvoice.balance'),
    status: asString(json['status'], 'financeInvoice.status'),
  );

  final String id;
  final String student;
  final String invoiceNumber;
  final String total;
  final String balance;
  final String status;
}

class PaymentOption {
  const PaymentOption({
    required this.id,
    required this.studentId,
    required this.label,
    required this.balanceMinor,
  });

  factory PaymentOption.fromJson(Json json) => PaymentOption(
    id: asString(json['id'], 'paymentOption.id'),
    studentId: asString(json['studentId'], 'paymentOption.studentId'),
    label: asString(json['label'], 'paymentOption.label'),
    balanceMinor: asInt(json['balanceMinor'], 'paymentOption.balanceMinor'),
  );

  final String id;
  final String studentId;
  final String label;
  final int balanceMinor;
}

class PaymentRow {
  const PaymentRow({
    required this.id,
    required this.receiptNumber,
    required this.amount,
    required this.method,
    required this.paidAt,
    required this.status,
  });

  factory PaymentRow.fromJson(Json json) => PaymentRow(
    id: asString(json['id'], 'payment.id'),
    receiptNumber: asString(json['receiptNumber'], 'payment.receiptNumber'),
    amount: asString(json['amount'], 'payment.amount'),
    method: asString(json['method'], 'payment.method'),
    paidAt: asString(json['paidAt'], 'payment.paidAt'),
    status: asString(json['status'], 'payment.status'),
  );

  final String id;
  final String receiptNumber;
  final String amount;
  final String method;
  final String paidAt;
  final String status;
}

class EmployeeRow {
  const EmployeeRow({
    required this.id,
    required this.employeeNumber,
    required this.name,
    required this.status,
    required this.salaryMinor,
    this.email,
    this.jobTitle,
  });

  factory EmployeeRow.fromJson(Json json) => EmployeeRow(
    id: asString(json['id'], 'employee.id'),
    employeeNumber: asString(json['employeeNumber'], 'employee.number'),
    name:
        '${asString(json['firstName'], 'employee.firstName')} '
        '${asString(json['lastName'], 'employee.lastName')}',
    status: asString(json['status'], 'employee.status'),
    salaryMinor: asInt(json['salaryMinor'], 'employee.salaryMinor'),
    email: json['email'] as String?,
    jobTitle: json['jobTitle'] as String?,
  );

  final String id;
  final String employeeNumber;
  final String name;
  final String status;
  final int salaryMinor;
  final String? email;
  final String? jobTitle;
}

class PayrollRunRow {
  const PayrollRunRow({
    required this.id,
    required this.period,
    required this.total,
    required this.status,
    required this.payslipCount,
    this.processedAt,
  });

  factory PayrollRunRow.fromJson(Json json) => PayrollRunRow(
    id: asString(json['id'], 'payrollRun.id'),
    period: asString(json['period'], 'payrollRun.period'),
    total: asString(json['total'], 'payrollRun.total'),
    status: asString(json['status'], 'payrollRun.status'),
    payslipCount: asInt(json['payslipCount'], 'payrollRun.payslipCount'),
    processedAt: json['processedAt'] as String?,
  );

  final String id;
  final String period;
  final String total;
  final String status;
  final int payslipCount;
  final String? processedAt;
}

class PayslipRow {
  const PayslipRow({
    required this.id,
    required this.employeeNumber,
    required this.employeeName,
    required this.period,
    required this.gross,
    required this.deductions,
    required this.net,
    required this.status,
    required this.issuedAt,
    this.snapshot,
  });

  factory PayslipRow.fromJson(Json json) => PayslipRow(
    id: asString(json['id'], 'payslip.id'),
    employeeNumber: asString(json['employeeNumber'], 'payslip.employeeNumber'),
    employeeName: asString(json['employeeName'], 'payslip.employeeName'),
    period: asString(json['period'], 'payslip.period'),
    gross: asString(json['gross'], 'payslip.gross'),
    deductions: asString(json['deductions'], 'payslip.deductions'),
    net: asString(json['net'], 'payslip.net'),
    status: asString(json['status'], 'payslip.status'),
    issuedAt: asString(json['issuedAt'], 'payslip.issuedAt'),
    snapshot: _payslipSnapshot(json['snapshotJson']),
  );

  final String id;
  final String employeeNumber;
  final String employeeName;
  final String period;
  final String gross;
  final String deductions;
  final String net;
  final String status;
  final String issuedAt;
  final Map<String, Object?>? snapshot;
}
