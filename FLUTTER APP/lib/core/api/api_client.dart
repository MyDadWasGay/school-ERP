import 'package:dio/dio.dart';

import '../../shared/models/academic_models.dart';
import '../../shared/models/admission_models.dart';
import '../../shared/models/asset_models.dart';
import '../../shared/models/attendance_models.dart';
import '../../shared/models/communication_models.dart';
import '../../shared/models/exam_models.dart';
import '../../shared/models/identity_models.dart';
import '../../shared/models/leave_models.dart';
import '../../shared/models/library_models.dart';
import '../../shared/models/operations_models.dart';
import '../../shared/models/finance_models.dart';
import '../../shared/models/hr_models.dart';
import '../../shared/models/admin_models.dart';
import '../../shared/models/student_models.dart';
import '../../shared/models/teacher_models.dart';
import '../../shared/models/transport_models.dart';
import '../../shared/models/workspace_models.dart';
import 'api_error.dart';

typedef TokenLoader = Future<String?> Function({bool forceRefresh});

class ApiClient {
  ApiClient({
    required String baseUrl,
    required TokenLoader tokenLoader,
    required String? Function() campusId,
  }) : _campusId = campusId,
       _dio = Dio(
         BaseOptions(
           baseUrl: baseUrl,
           connectTimeout: const Duration(seconds: 12),
           receiveTimeout: const Duration(seconds: 20),
           sendTimeout: const Duration(seconds: 20),
           headers: {'Accept': 'application/json'},
         ),
       ) {
    _dio.interceptors.add(_AuthInterceptor(_dio, tokenLoader, campusId));
  }

  final Dio _dio;
  final String? Function() _campusId;

  Future<CurrentUser> getMe({
    String? campusOverride,
    bool omitCampus = false,
  }) async {
    final data = await _get(
      '/me',
      options: omitCampus
          ? Options(extra: {'omitCampus': true})
          : campusOverride == null
          ? null
          : Options(headers: {'X-Campus-Id': campusOverride}),
    );
    return CurrentUser.fromJson(data);
  }

  Future<PortalSnapshot> getPortal(String portal) async =>
      PortalSnapshot.fromJson(
        await _get('/portal/summary', query: {'portal': portal}),
      );
  Future<ManagementDashboard> getManagementDashboard() async =>
      ManagementDashboard.fromJson(await _get('/dashboard'));

  Future<PagedRows<NotificationRow>> getNotifications() async {
    final data = await _get(
      '/notifications',
      query: {'page': 1, 'pageSize': 50},
    );
    return _paged(data, NotificationRow.fromJson);
  }

  Future<void> markNotificationRead(String id) async {
    await _request(
      () =>
          _dio.patch<Object?>('/notifications/${Uri.encodeComponent(id)}/read'),
    );
  }

  Future<void> revokeSession() async {
    await _request(() => _dio.post<Object?>('/auth/revoke'));
  }

  Future<List<NoticeRow>> getNotices() async => (await _getList(
    '/communication/notices',
  )).map(NoticeRow.fromJson).toList(growable: false);

  Future<List<CommunicationMessageRow>> getMessages() async => (await _getList(
    '/communication/messages',
  )).map(CommunicationMessageRow.fromJson).toList(growable: false);

  Future<void> createMessage({
    required String subject,
    required String body,
    required String audienceType,
    String? audienceRole,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/communication/messages',
        data: {
          'subject': subject.trim(),
          'body': body.trim(),
          'audienceType': audienceType,
          if (audienceRole != null && audienceRole.trim().isNotEmpty)
            'audienceRole': audienceRole.trim(),
        },
      ),
    );
  }

  Future<void> publishMessage(String id) async {
    await _request(
      () => _dio.post<Object?>(
        '/communication/messages/${Uri.encodeComponent(id)}/publish',
        data: {'messageId': id},
      ),
    );
  }

  Future<void> createNotice({
    required String title,
    required String body,
    required String audience,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/communication/notices',
        data: {
          'title': title.trim(),
          'body': body.trim(),
          'audience': audience,
        },
      ),
    );
  }

  Future<void> transitionNotice(String id, String status) async {
    await _request(
      () => _dio.patch<Object?>(
        '/communication/notices/${Uri.encodeComponent(id)}',
        data: {'id': id, 'status': status},
      ),
    );
  }

  Future<List<AcademicRecord>> getAcademicRecords(String kind) async {
    final encodedKind = Uri.encodeComponent(kind);
    return (await _getList(
      '/academics/$encodedKind',
    )).map(AcademicRecord.fromJson).toList(growable: false);
  }

  Future<List<AcademicOption>> getAcademicOptions(
    String kind, {
    String? search,
    String? classId,
  }) async {
    final data = await _getList(
      '/academics/options',
      query: {
        'kind': kind,
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
        if (classId != null && classId.isNotEmpty) 'classId': classId,
      },
    );
    return data.map(AcademicOption.fromJson).toList(growable: false);
  }

  Future<String> createAcademicRecord({
    required String kind,
    required String name,
    String? teacherId,
    String? classId,
    String? subjectId,
    DateTime? scheduledFor,
    DateTime? dueAt,
    String? details,
  }) async {
    final body = <String, Object?>{'name': name};
    if (teacherId != null) {
      body['teacherId'] = teacherId;
    }
    if (classId != null) {
      body['classId'] = classId;
    }
    if (subjectId != null) {
      body['subjectId'] = subjectId;
    }
    if (scheduledFor != null) {
      body['scheduledFor'] = scheduledFor.toIso8601String();
    }
    if (dueAt != null) {
      body['dueAt'] = dueAt.toIso8601String();
    }
    if (details != null && details.trim().isNotEmpty) {
      body['details'] = details.trim();
    }
    final response = await _request(
      () => _dio.post<Object?>(
        '/academics/${Uri.encodeComponent(kind)}',
        data: body,
      ),
    );
    final envelope = asJson(response.data, 'response');
    final data = asJson(envelope['data'], 'response.data');
    return asString(data['id'], 'academic.id');
  }

  Future<List<LeaveRequest>> getLeaveRequests() async => (await _getList(
    '/attendance/leave',
  )).map(LeaveRequest.fromJson).toList(growable: false);

  Future<String> createLeaveRequest({
    String? studentId,
    required DateTime startsOn,
    required DateTime endsOn,
    required String reason,
  }) async {
    final response = await _request(
      () => _dio.post<Object?>(
        '/leave-requests',
        data: {
          if (studentId != null && studentId.isNotEmpty) 'studentId': studentId,
          'startsOn': _dateKey(startsOn),
          'endsOn': _dateKey(endsOn),
          'reason': reason.trim(),
        },
      ),
    );
    final envelope = asJson(response.data, 'response');
    final data = asJson(envelope['data'], 'response.data');
    return asString(data['id'], 'leave.id');
  }

  Future<void> reviewLeaveRequest(String id, String decision) async {
    await _request(
      () => _dio.post<Object?>(
        '/leave-requests/${Uri.encodeComponent(id)}/review',
        data: {'decision': decision},
      ),
    );
  }

  Future<LibraryOverview> getLibraryOverview() async {
    final values = await Future.wait<Object?>([
      getLibraryItems(),
      getLibraryIssues(),
      getDigitalResources(),
    ]);
    return LibraryOverview(
      items: values[0] as List<LibraryItem>,
      issues: values[1] as List<LibraryIssue>,
      resources: values[2] as List<DigitalResource>,
    );
  }

  Future<List<LibraryItem>> getLibraryItems({String? search}) async =>
      (await _getList(
        '/library/items',
        query: {
          if (search != null && search.trim().isNotEmpty)
            'search': search.trim(),
        },
      )).map(LibraryItem.fromJson).toList(growable: false);

  Future<List<LibraryIssue>> getLibraryIssues() async {
    final data = await _get('/library/issues');
    return asJsonList(
      data['active'],
      'libraryIssues.active',
    ).map(LibraryIssue.fromJson).toList(growable: false);
  }

  Future<List<LibraryCopyRow>> getLibraryCopies({
    String? itemId,
    bool availableOnly = true,
  }) async => (await _getList(
    '/library/copies',
    query: {
      if (itemId != null && itemId.isNotEmpty) 'itemId': itemId,
      'availableOnly': availableOnly,
    },
  )).map(LibraryCopyRow.fromJson).toList(growable: false);

  Future<List<LibraryReservationRow>> getLibraryReservations() async =>
      (await _getList(
        '/library/reservations',
      )).map(LibraryReservationRow.fromJson).toList(growable: false);

  Future<void> reserveLibraryItem(String itemId) async {
    await _request(
      () =>
          _dio.post<Object?>('/library/reservations', data: {'itemId': itemId}),
    );
  }

  Future<void> createLibraryItem({
    required String title,
    String? author,
    String? isbn,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/library/items',
        data: {
          'title': title.trim(),
          if (author != null && author.trim().isNotEmpty)
            'author': author.trim(),
          if (isbn != null && isbn.trim().isNotEmpty) 'isbn': isbn.trim(),
        },
      ),
    );
  }

  Future<void> addLibraryCopy({
    required String itemId,
    required String accessionNumber,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/library/copies',
        data: {'itemId': itemId, 'accessionNumber': accessionNumber.trim()},
      ),
    );
  }

  Future<void> createDigitalResource({
    required String name,
    required String url,
    String? description,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/library/digital-resources',
        data: {
          'name': name.trim(),
          'url': url.trim(),
          if (description != null && description.trim().isNotEmpty)
            'description': description.trim(),
        },
      ),
    );
  }

  Future<void> issueLibraryCopy({
    required String copyId,
    required String borrowerId,
    required DateTime dueAt,
    String borrowerType = 'student',
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/library/issues',
        data: {
          'copyId': copyId,
          'borrowerType': borrowerType,
          'borrowerId': borrowerId,
          'dueAt': dueAt.toIso8601String(),
        },
      ),
    );
  }

  Future<void> returnLibraryCopy({
    required String transactionId,
    required String outcome,
    int dailyFineMinor = 100,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/library/issues/return',
        data: {
          'transactionId': transactionId,
          'outcome': outcome,
          'dailyFineMinor': dailyFineMinor,
        },
      ),
    );
  }

  Future<void> renewLibraryCopy({
    required String transactionId,
    int extensionDays = 14,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/library/issues/renew',
        data: {'transactionId': transactionId, 'extensionDays': extensionDays},
      ),
    );
  }

  Future<List<DigitalResource>> getDigitalResources() async => (await _getList(
    '/library/digital-resources',
  )).map(DigitalResource.fromJson).toList(growable: false);

  Future<List<TransportAllocation>> getTransportAllocations() async =>
      (await _getList(
        '/transport/allocations',
      )).map(TransportAllocation.fromJson).toList(growable: false);

  Future<List<TransportRouteRow>> getTransportRoutes() async => (await _getList(
    '/transport/routes',
  )).map(TransportRouteRow.fromJson).toList(growable: false);

  Future<List<TransportVehicleRow>> getTransportVehicles() async =>
      (await _getList(
        '/transport/vehicles',
      )).map(TransportVehicleRow.fromJson).toList(growable: false);

  Future<List<TransportDocumentRow>> getTransportDocuments() async =>
      (await _getList(
        '/transport/documents',
      )).map(TransportDocumentRow.fromJson).toList(growable: false);

  Future<List<TransportStudentOption>> getTransportStudents() async =>
      (await _getList(
        '/transport/students',
      )).map(TransportStudentOption.fromJson).toList(growable: false);

  Future<void> createTransportVehicle({
    required String registrationNumber,
    required String type,
    required int capacity,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/transport/vehicles',
        data: {
          'registrationNumber': registrationNumber.trim(),
          'type': type.trim(),
          'capacity': capacity,
        },
      ),
    );
  }

  Future<void> createTransportDocument({
    required String vehicleId,
    required String documentType,
    required DateTime expiresOn,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/transport/vehicle-documents',
        data: {
          'vehicleId': vehicleId,
          'documentType': documentType.trim(),
          'expiresOn': _dateKey(expiresOn),
        },
      ),
    );
  }

  Future<void> createTransportRoute({
    required String name,
    required int capacity,
    String? vehicleId,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/transport/routes',
        data: {
          'name': name.trim(),
          'capacity': capacity,
          if (vehicleId != null && vehicleId.isNotEmpty) 'vehicleId': vehicleId,
        },
      ),
    );
  }

  Future<void> createTransportStop({
    required String name,
    String? address,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/transport/stops',
        data: {
          'name': name.trim(),
          if (address != null && address.trim().isNotEmpty)
            'address': address.trim(),
        },
      ),
    );
  }

  Future<void> allocateTransportStudent({
    required String routeId,
    required String studentId,
    required String stopId,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/transport/allocations',
        data: {'routeId': routeId, 'studentId': studentId, 'stopId': stopId},
      ),
    );
  }

  Future<List<TransportStopRow>> getTransportStops() async => (await _getList(
    '/transport/stops',
  )).map(TransportStopRow.fromJson).toList(growable: false);

  Future<ExamWorkspaceOptions> getExamWorkspaceOptions() async =>
      ExamWorkspaceOptions.fromJson(await _get('/exams/workspace/options'));

  Future<ExamPlanningOptions> getExamPlanningOptions() async =>
      ExamPlanningOptions.fromJson(await _get('/exams/planning/options'));

  Future<List<ExamPlanningRow>> getExamPlanning() async => (await _getList(
    '/exams/planning',
  )).map(ExamPlanningRow.fromJson).toList(growable: false);

  Future<List<ExamResultSummary>> getExamResults() async => (await _getList(
    '/exams/results',
  )).map(ExamResultSummary.fromJson).toList(growable: false);

  Future<void> createExam({
    required String academicYearId,
    required String name,
    required int maxMarks,
    DateTime? startsOn,
    DateTime? endsOn,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/exams',
        data: {
          'academicYearId': academicYearId,
          'name': name.trim(),
          'maxMarks': maxMarks,
          if (startsOn != null) 'startsOn': _dateKey(startsOn),
          if (endsOn != null) 'endsOn': _dateKey(endsOn),
        },
      ),
    );
  }

  Future<void> scheduleExam({
    required String examId,
    required String subjectId,
    required String classId,
    required DateTime startsAt,
    required DateTime endsAt,
    String? roomId,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/exams/schedules',
        data: {
          'examId': examId,
          'subjectId': subjectId,
          'classId': classId,
          'startsAt': startsAt.toIso8601String(),
          'endsAt': endsAt.toIso8601String(),
          if (roomId != null && roomId.trim().isNotEmpty)
            'roomId': roomId.trim(),
        },
      ),
    );
  }

  Future<List<QuestionBankRow>> getQuestionBank() async => (await _getList(
    '/exams/question-bank',
  )).map(QuestionBankRow.fromJson).toList(growable: false);

  Future<DeepExamOptions> getDeepExamOptions() async =>
      DeepExamOptions.fromJson(await _get('/exams/deep/options'));

  Future<void> createQuestionBankItem({
    required String subjectId,
    required String questionType,
    required String prompt,
    String? answer,
    required int maximumMarks,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/exams/question-bank',
        data: {
          'subjectId': subjectId,
          'questionType': questionType,
          'prompt': prompt.trim(),
          if (answer != null && answer.trim().isNotEmpty)
            'answer': answer.trim(),
          'maximumMarks': maximumMarks,
        },
      ),
    );
  }

  Future<List<ReportCardRow>> getReportCards() async => (await _getList(
    '/exams/report-cards',
  )).map(ReportCardRow.fromJson).toList(growable: false);

  Future<void> generateReportCard({
    required String examId,
    required String studentId,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/exams/report-cards',
        data: {'examId': examId, 'studentId': studentId},
      ),
    );
  }

  Future<void> saveMarks({
    required String examId,
    required String studentId,
    required String subjectId,
    required int marks,
    required int maxMarks,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/exams/marks',
        data: {
          'examId': examId,
          'studentId': studentId,
          'subjectId': subjectId,
          'marks': marks,
          'maxMarks': maxMarks,
        },
      ),
    );
  }

  Future<void> transitionExamStatus(String examId, String status) async {
    await _request(
      () => _dio.patch<Object?>(
        '/exams/${Uri.encodeComponent(examId)}/status',
        data: {'status': status},
      ),
    );
  }

  Future<void> publishExamResults(String examId) async {
    await _request(
      () => _dio.post<Object?>('/exams/${Uri.encodeComponent(examId)}/publish'),
    );
  }

  Future<List<AdmissionApproval>> getAdmissionApprovals() async =>
      (await _getList(
        '/admissions/approvals',
      )).map(AdmissionApproval.fromJson).toList(growable: false);

  Future<AdmissionOptions> getAdmissionOptions({
    bool allAccessibleCampuses = false,
  }) async => AdmissionOptions.fromJson(
    await _get(
      '/admissions/options',
      query: {'allCampuses': allAccessibleCampuses},
    ),
  );

  Future<List<AdmissionSeatMatrixRow>> getAdmissionSeatMatrix({
    String? campusId,
    String? academicYearId,
    String? classId,
    String? sectionId,
  }) async => (await _getList(
    '/admissions/seat-matrix',
    query: {
      if (campusId != null && campusId.isNotEmpty) 'campusId': campusId,
      if (academicYearId != null && academicYearId.isNotEmpty)
        'academicYearId': academicYearId,
      if (classId != null && classId.isNotEmpty) 'classId': classId,
      if (sectionId != null && sectionId.isNotEmpty) 'sectionId': sectionId,
    },
  )).map(AdmissionSeatMatrixRow.fromJson).toList(growable: false);

  Future<PagedRows<AdmissionApplication>> getAdmissionApplications({
    String? search,
  }) async {
    final data = await _get(
      '/admissions/applications',
      query: {
        'page': 1,
        'pageSize': 100,
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      },
    );
    return _paged(data, AdmissionApplication.fromJson);
  }

  Future<void> reviewAdmission(
    String applicationId,
    String decision, {
    String? reason,
  }) async {
    await _request(
      () => _dio.patch<Object?>(
        '/admissions/applications/${Uri.encodeComponent(applicationId)}/review',
        data: {
          'decision': decision,
          if (reason != null && reason.trim().isNotEmpty)
            'reason': reason.trim(),
        },
      ),
    );
  }

  Future<void> approveAdmission(
    String applicationId, {
    String? rollNumber,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/admissions/applications/${Uri.encodeComponent(applicationId)}/approve',
        data: {
          if (rollNumber != null && rollNumber.trim().isNotEmpty)
            'rollNumber': rollNumber.trim(),
        },
      ),
    );
  }

  Future<void> createAdmissionApplication({
    required String campusId,
    required String applicantName,
    required String academicYearId,
    required String classId,
    required String sectionId,
    required String guardianFirstName,
    required String guardianLastName,
    required String guardianRelationship,
    String? dateOfBirth,
    String? gender,
    String? guardianEmail,
    String? guardianPhone,
    String? sourceEnquiryId,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/admissions/applications',
        data: {
          'campusId': campusId,
          'applicantName': applicantName.trim(),
          if (dateOfBirth != null && dateOfBirth.isNotEmpty)
            'dateOfBirth': dateOfBirth,
          if (gender != null && gender.isNotEmpty) 'gender': gender,
          'academicYearId': academicYearId,
          'classId': classId,
          'sectionId': sectionId,
          if (sourceEnquiryId != null && sourceEnquiryId.isNotEmpty)
            'sourceEnquiryId': sourceEnquiryId,
          'guardian': {
            'firstName': guardianFirstName.trim(),
            'lastName': guardianLastName.trim(),
            'relationship': guardianRelationship.trim(),
            if (guardianEmail != null && guardianEmail.trim().isNotEmpty)
              'email': guardianEmail.trim(),
            if (guardianPhone != null && guardianPhone.trim().isNotEmpty)
              'phone': guardianPhone.trim(),
          },
        },
      ),
    );
  }

  Future<PagedRows<StudentDirectoryRow>> getStudentDirectory({
    String? search,
  }) async {
    final data = await _get(
      '/students',
      query: {
        'page': 1,
        'pageSize': 100,
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      },
    );
    return _paged(data, StudentDirectoryRow.fromJson);
  }

  Future<StudentProfileSummary> getStudentProfile(String studentId) async =>
      StudentProfileSummary.fromJson(
        await _get('/students/${Uri.encodeComponent(studentId)}'),
      );

  Future<StudentFormOptions> getStudentFormOptions() async =>
      StudentFormOptions.fromJson(await _get('/students/form-options'));

  Future<void> createStudent({
    required String admissionNumber,
    required String firstName,
    required String lastName,
    required String campusId,
    String? gender,
    DateTime? dateOfBirth,
    String? email,
    String? phone,
    String? academicYearId,
    String? classId,
    String? sectionId,
    String? rollNumber,
    String? guardianFirstName,
    String? guardianLastName,
    String? guardianRelationship,
    String? guardianEmail,
    String? guardianPhone,
  }) async {
    final guardianReady =
        guardianFirstName != null &&
        guardianLastName != null &&
        guardianRelationship != null;
    await _request(
      () => _dio.post<Object?>(
        '/students',
        data: {
          'admissionNumber': admissionNumber.trim(),
          'firstName': firstName.trim(),
          'lastName': lastName.trim(),
          'campusId': campusId,
          if (gender != null && gender.isNotEmpty) 'gender': gender,
          if (dateOfBirth != null) 'dateOfBirth': _dateKey(dateOfBirth),
          if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
          if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
          if (academicYearId != null && academicYearId.isNotEmpty)
            'academicYearId': academicYearId,
          if (classId != null && classId.isNotEmpty) 'classId': classId,
          if (sectionId != null && sectionId.isNotEmpty) 'sectionId': sectionId,
          if (rollNumber != null && rollNumber.trim().isNotEmpty)
            'rollNumber': rollNumber.trim(),
          if (guardianReady)
            'guardian': {
              'firstName': guardianFirstName.trim(),
              'lastName': guardianLastName.trim(),
              'relationship': guardianRelationship,
              if (guardianEmail != null && guardianEmail.trim().isNotEmpty)
                'email': guardianEmail.trim(),
              if (guardianPhone != null && guardianPhone.trim().isNotEmpty)
                'phone': guardianPhone.trim(),
            },
        },
      ),
    );
  }

  Future<void> updateStudent({
    required String id,
    required String firstName,
    required String lastName,
    required String status,
    String? gender,
    String? email,
    String? phone,
  }) async {
    await _request(
      () => _dio.patch<Object?>(
        '/students/${Uri.encodeComponent(id)}',
        data: {
          'id': id,
          'firstName': firstName.trim(),
          'lastName': lastName.trim(),
          'status': status,
          'gender': ?gender,
          'email': ?email?.trim(),
          'phone': ?phone?.trim(),
        },
      ),
    );
  }

  Future<void> createStudentGuardian({
    required String studentId,
    required String firstName,
    required String lastName,
    required String relationship,
    String? email,
    String? phone,
    String? customRelationship,
    bool isPrimary = false,
    bool isEmergencyContact = false,
    bool isBillingContact = false,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/students/${Uri.encodeComponent(studentId)}/guardians',
        data: {
          'firstName': firstName.trim(),
          'lastName': lastName.trim(),
          'relationship': relationship,
          if (customRelationship != null &&
              customRelationship.trim().isNotEmpty)
            'customRelationship': customRelationship.trim(),
          if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
          if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
          'isPrimary': isPrimary,
          'isEmergencyContact': isEmergencyContact,
          'isBillingContact': isBillingContact,
        },
      ),
    );
  }

  Future<void> updateStudentGuardian({
    required String studentId,
    required String linkId,
    required String firstName,
    required String lastName,
    required String relationship,
    String? email,
    String? phone,
    String? customRelationship,
    bool isPrimary = false,
    bool isEmergencyContact = false,
    bool isBillingContact = false,
  }) async {
    await _request(
      () => _dio.patch<Object?>(
        '/students/${Uri.encodeComponent(studentId)}/guardians/${Uri.encodeComponent(linkId)}',
        data: {
          'id': linkId,
          'firstName': firstName.trim(),
          'lastName': lastName.trim(),
          'relationship': relationship,
          if (customRelationship != null &&
              customRelationship.trim().isNotEmpty)
            'customRelationship': customRelationship.trim(),
          if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
          if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
          'isPrimary': isPrimary,
          'isEmergencyContact': isEmergencyContact,
          'isBillingContact': isBillingContact,
        },
      ),
    );
  }

  Future<void> unlinkStudentGuardian({
    required String studentId,
    required String guardianId,
  }) async {
    await _request(
      () => _dio.delete<Object?>(
        '/students/${Uri.encodeComponent(studentId)}/guardians/${Uri.encodeComponent(guardianId)}',
      ),
    );
  }

  Future<StudentMedicalProfile?> getStudentMedical(String studentId) async {
    final response = await _request(
      () => _dio.get<Object?>(
        '/students/${Uri.encodeComponent(studentId)}/medical',
      ),
    );
    final envelope = asJson(response.data, 'response');
    final raw = envelope['data'];
    if (raw == null) return null;
    return StudentMedicalProfile.fromJson(asJson(raw, 'response.data'));
  }

  Future<void> saveStudentMedical({
    required String studentId,
    String? allergies,
    String? conditions,
    String? medications,
    String? emergencyNotes,
  }) async {
    await _request(
      () => _dio.put<Object?>(
        '/students/${Uri.encodeComponent(studentId)}/medical',
        data: {
          'allergies': allergies?.trim() ?? '',
          'conditions': conditions?.trim() ?? '',
          'medications': medications?.trim() ?? '',
          'emergencyNotes': emergencyNotes?.trim() ?? '',
        },
      ),
    );
  }

  Future<void> transferStudentEnrollment({
    required String studentId,
    required String academicYearId,
    required String classId,
    required String sectionId,
    DateTime? startsOn,
    String? rollNumber,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/students/${Uri.encodeComponent(studentId)}/enrollment',
        data: {
          'academicYearId': academicYearId,
          'classId': classId,
          'sectionId': sectionId,
          'startsOn': _dateKey(startsOn ?? DateTime.now()),
          if (rollNumber != null && rollNumber.trim().isNotEmpty)
            'rollNumber': rollNumber.trim(),
        },
      ),
    );
  }

  Future<void> issueStudentCertificate({
    required String studentId,
    required String certificateType,
    String? templateId,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/students/${Uri.encodeComponent(studentId)}/certificates',
        data: {
          'certificateType': certificateType.trim(),
          if (templateId != null && templateId.isNotEmpty)
            'templateId': templateId,
        },
      ),
    );
  }

  Future<PagedRows<AdmissionEnquiry>> getAdmissionEnquiries({
    String? search,
  }) async {
    final data = await _get(
      '/admissions/enquiries',
      query: {
        'page': 1,
        'pageSize': 100,
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      },
    );
    return _paged(data, AdmissionEnquiry.fromJson);
  }

  Future<void> createAdmissionEnquiry({
    required String campusId,
    required String applicantName,
    required String guardianName,
    required String guardianEmail,
    required String guardianPhone,
    required String source,
    required String notes,
    DateTime? nextFollowUpAt,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/admissions/enquiries',
        data: {
          'campusId': campusId,
          'applicantName': applicantName.trim(),
          'guardianName': guardianName.trim(),
          'guardianEmail': guardianEmail.trim(),
          'guardianPhone': guardianPhone.trim(),
          'source': source.trim(),
          'notes': notes.trim(),
          if (nextFollowUpAt != null)
            'nextFollowUpAt': nextFollowUpAt.toIso8601String(),
        },
      ),
    );
  }

  Future<void> updateAdmissionEnquiry({
    required String id,
    required String status,
    required String source,
    String? campaign,
    String? lostReason,
    String? guardianName,
    String? guardianEmail,
    String? guardianPhone,
    String? notes,
    DateTime? nextFollowUpAt,
  }) async {
    await _request(
      () => _dio.patch<Object?>(
        '/admissions/enquiries/${Uri.encodeComponent(id)}',
        data: {
          'status': status,
          'source': source.trim(),
          if (campaign != null) 'campaign': campaign.trim(),
          if (lostReason != null) 'lostReason': lostReason.trim(),
          if (guardianName != null) 'guardianName': guardianName.trim(),
          if (guardianEmail != null) 'guardianEmail': guardianEmail.trim(),
          if (guardianPhone != null) 'guardianPhone': guardianPhone.trim(),
          if (notes != null) 'notes': notes.trim(),
          if (nextFollowUpAt != null)
            'nextFollowUpAt': nextFollowUpAt.toIso8601String(),
        },
      ),
    );
  }

  Future<void> scheduleAdmissionFollowUp({
    required String enquiryId,
    required DateTime dueAt,
    required String note,
    String? assignedTo,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/admissions/enquiries/${Uri.encodeComponent(enquiryId)}/follow-ups',
        data: {
          'dueAt': dueAt.toIso8601String(),
          'note': note.trim(),
          if (assignedTo != null && assignedTo.isNotEmpty)
            'assignedTo': assignedTo,
        },
      ),
    );
  }

  Future<void> completeAdmissionFollowUp({
    required String id,
    required String outcome,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/admissions/follow-ups/${Uri.encodeComponent(id)}/complete',
        data: {'outcome': outcome.trim()},
      ),
    );
  }

  Future<void> scheduleAdmissionAssessment({
    required String applicationId,
    required String campusId,
    required String assessmentType,
    required DateTime scheduledAt,
    String? notes,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/admissions/applications/${Uri.encodeComponent(applicationId)}/assessments',
        data: {
          'campusId': campusId,
          'assessmentType': assessmentType,
          'scheduledAt': scheduledAt.toIso8601String(),
          if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
        },
      ),
    );
  }

  Future<void> recordAdmissionAssessment({
    required String id,
    int? score,
    required String outcome,
    String? notes,
  }) async {
    await _request(
      () => _dio.patch<Object?>(
        '/admissions/assessments/${Uri.encodeComponent(id)}',
        data: {
          'score': ?score,
          'outcome': outcome,
          if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
        },
      ),
    );
  }

  Future<PagedRows<FinanceInvoiceRow>> getFinanceInvoices() async {
    final data = await _get(
      '/fees/invoices',
      query: {'page': 1, 'pageSize': 100},
    );
    return _paged(data, FinanceInvoiceRow.fromJson);
  }

  Future<List<PaymentOption>> getPaymentOptions() async => (await _getList(
    '/fees/payments/options',
  )).map(PaymentOption.fromJson).toList(growable: false);

  Future<List<PaymentRow>> getPayments() async => (await _getList(
    '/fees/payments',
  )).map(PaymentRow.fromJson).toList(growable: false);

  Future<void> recordPayment({
    required String invoiceId,
    required String studentId,
    required int amountMinor,
    required String method,
    required String idempotencyKey,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/payments',
        data: {
          'invoiceId': invoiceId,
          'studentId': studentId,
          'amountMinor': amountMinor,
          'method': method,
          'idempotencyKey': idempotencyKey,
        },
      ),
    );
  }

  Future<List<FinanceRefundOption>> getRefundOptions() async => (await _getList(
    '/fees/refunds/options',
  )).map(FinanceRefundOption.fromJson).toList(growable: false);

  Future<void> refundPayment({
    required String paymentId,
    required int amountMinor,
    required String reason,
    required String idempotencyKey,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/payments/refunds',
        data: {
          'paymentId': paymentId,
          'amountMinor': amountMinor,
          'reason': reason.trim(),
          'idempotencyKey': idempotencyKey,
        },
      ),
    );
  }

  Future<List<FinanceAccountRow>> getFinanceAccounts() async => (await _getList(
    '/accounts/chart-of-accounts',
  )).map(FinanceAccountRow.fromJson).toList(growable: false);

  Future<List<FinanceExpenseRow>> getFinanceExpenses() async => (await _getList(
    '/accounts/expenses',
  )).map(FinanceExpenseRow.fromJson).toList(growable: false);

  Future<List<FinanceLedgerRow>> getFinanceLedger() async => (await _getList(
    '/accounts/ledger',
  )).map(FinanceLedgerRow.fromJson).toList(growable: false);

  Future<List<FinanceDonationRow>> getFinanceDonations() async =>
      (await _getList(
        '/accounts/donations',
      )).map(FinanceDonationRow.fromJson).toList(growable: false);

  Future<void> createFinanceAccount({
    required String code,
    required String name,
    required String accountType,
    String? parentId,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/accounts/chart-of-accounts',
        data: {
          'code': code.trim(),
          'name': name.trim(),
          'accountType': accountType,
          if (parentId != null && parentId.trim().isNotEmpty)
            'parentId': parentId.trim(),
        },
      ),
    );
  }

  Future<void> createFinanceExpense({
    required String accountId,
    required String description,
    required int amountMinor,
    required DateTime incurredOn,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/accounts/expenses',
        data: {
          'accountId': accountId,
          'description': description.trim(),
          'amountMinor': amountMinor,
          'incurredOn': _dateKey(incurredOn),
        },
      ),
    );
  }

  Future<void> createFinanceDonation({
    required String donorName,
    String? donorEmail,
    required int amountMinor,
    required String purpose,
    String? paymentReference,
    required DateTime receivedAt,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/accounts/donations',
        data: {
          'donorName': donorName.trim(),
          if (donorEmail != null && donorEmail.trim().isNotEmpty)
            'donorEmail': donorEmail.trim(),
          'amountMinor': amountMinor,
          'purpose': purpose.trim(),
          if (paymentReference != null && paymentReference.trim().isNotEmpty)
            'paymentReference': paymentReference.trim(),
          'receivedAt': _dateKey(receivedAt),
        },
      ),
    );
  }

  Future<FinanceConfiguration> getFeeConfiguration() async =>
      FinanceConfiguration.fromJson(await _get('/fees/configuration'));

  Future<List<FinanceInvoiceStudentOption>> getInvoiceStudentOptions() async =>
      (await _getList(
        '/fees/invoices/options',
      )).map(FinanceInvoiceStudentOption.fromJson).toList(growable: false);

  Future<void> createFeeInvoice({
    required String studentId,
    required DateTime dueOn,
    required String description,
    required int amountMinor,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/fees/invoices',
        data: {
          'studentId': studentId,
          'dueOn': _dateKey(dueOn),
          'description': description.trim(),
          'amountMinor': amountMinor,
        },
      ),
    );
  }

  Future<void> createFeeHead({
    required String name,
    required String code,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/fees/configuration/heads',
        data: {'name': name.trim(), 'code': code.trim()},
      ),
    );
  }

  Future<void> createFeeStructure({
    required String academicYearId,
    String? classId,
    required String name,
    required DateTime effectiveFrom,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/fees/configuration/structures',
        data: {
          'academicYearId': academicYearId,
          if (classId != null && classId.trim().isNotEmpty)
            'classId': classId.trim(),
          'name': name.trim(),
          'effectiveFrom': _dateKey(effectiveFrom),
        },
      ),
    );
  }

  Future<void> createFeeInstallment({
    required String feeStructureId,
    required String feeHeadId,
    required String name,
    required int amountMinor,
    required DateTime dueOn,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/fees/configuration/installments',
        data: {
          'feeStructureId': feeStructureId,
          'feeHeadId': feeHeadId,
          'name': name.trim(),
          'amountMinor': amountMinor,
          'dueOn': _dateKey(dueOn),
        },
      ),
    );
  }

  Future<List<EmployeeRow>> getEmployees({String? search}) async =>
      (await _getList(
        '/hr/employees',
        query: {
          if (search != null && search.trim().isNotEmpty)
            'search': search.trim(),
        },
      )).map(EmployeeRow.fromJson).toList(growable: false);

  Future<List<PayrollRunRow>> getPayrollRuns() async => (await _getList(
    '/payroll/runs',
  )).map(PayrollRunRow.fromJson).toList(growable: false);

  Future<List<PayslipRow>> getPayslips() async => (await _getList(
    '/payroll/payslips',
  )).map(PayslipRow.fromJson).toList(growable: false);

  Future<void> createPayrollRun(String period) async {
    await _request(
      () => _dio.post<Object?>('/payroll/runs', data: {'period': period}),
    );
  }

  Future<void> processPayrollRun(String id) async {
    await _request(
      () => _dio.post<Object?>(
        '/payroll/runs/${Uri.encodeComponent(id)}/process',
      ),
    );
  }

  Future<List<StaffAttendanceRow>> getStaffAttendance() async =>
      (await _getList(
        '/attendance/staff',
      )).map(StaffAttendanceRow.fromJson).toList(growable: false);

  Future<List<EmployeeOption>> getStaffAttendanceOptions() async =>
      (await _getList(
        '/attendance/staff/options',
      )).map(EmployeeOption.fromJson).toList(growable: false);

  Future<void> recordStaffAttendance({
    required String employeeId,
    required DateTime attendanceDate,
    required String state,
    String? note,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/attendance/staff',
        data: {
          'employeeId': employeeId,
          'attendanceDate': _dateKey(attendanceDate),
          'state': state,
          if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
        },
      ),
    );
  }

  Future<AttendanceOverview> getAttendanceOverview() async =>
      AttendanceOverview.fromJson(await _get('/attendance/overview'));

  Future<List<AttendanceCorrectionRow>> getAttendanceCorrections() async =>
      (await _getList(
        '/attendance/corrections',
      )).map(AttendanceCorrectionRow.fromJson).toList(growable: false);

  Future<void> reviewAttendanceCorrection(String id, String decision) async {
    await _request(
      () => _dio.post<Object?>(
        '/attendance/corrections/${Uri.encodeComponent(id)}/review',
        data: {'decision': decision},
      ),
    );
  }

  Future<List<LowAttendanceRow>> getLowAttendance({
    double threshold = 75,
  }) async => (await _getList(
    '/attendance/low',
    query: {'threshold': threshold},
  )).map(LowAttendanceRow.fromJson).toList(growable: false);

  Future<List<DisciplineIncidentRow>> getDisciplineIncidents() async =>
      (await _getList(
        '/attendance/discipline',
      )).map(DisciplineIncidentRow.fromJson).toList(growable: false);

  Future<void> createDisciplineIncident({
    required String studentId,
    required String severity,
    required String title,
    required DateTime occurredAt,
    required String details,
    required bool confidential,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/attendance/discipline',
        data: {
          'studentId': studentId,
          'severity': severity,
          'title': title.trim(),
          'occurredAt': occurredAt.toIso8601String(),
          if (details.trim().isNotEmpty) 'details': details.trim(),
          'confidential': confidential,
        },
      ),
    );
  }

  Future<void> updateDisciplineStatus(String id, String status) async {
    await _request(
      () => _dio.patch<Object?>(
        '/attendance/discipline/${Uri.encodeComponent(id)}',
        data: {'status': status},
      ),
    );
  }

  Future<List<SafetyVisitorRow>> getSafetyVisitors() async => (await _getList(
    '/safety/visitors',
  )).map(SafetyVisitorRow.fromJson).toList(growable: false);

  Future<List<SafetyGatePassRow>> getSafetyGatePasses() async =>
      (await _getList(
        '/safety/gate-passes',
      )).map(SafetyGatePassRow.fromJson).toList(growable: false);

  Future<List<SafetyIncidentRow>> getSafetyIncidents() async => (await _getList(
    '/safety/incidents',
  )).map(SafetyIncidentRow.fromJson).toList(growable: false);

  Future<void> createVisitor({
    required String visitorName,
    required String purpose,
    required String hostName,
    required DateTime visitAt,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/safety/visitors',
        data: {
          'visitorName': visitorName.trim(),
          'purpose': purpose.trim(),
          'hostName': hostName.trim(),
          'visitAt': visitAt.toIso8601String(),
        },
      ),
    );
  }

  Future<void> createGatePass({
    required String visitorId,
    required String reason,
    required DateTime validUntil,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/safety/gate-passes',
        data: {
          'visitorId': visitorId,
          'reason': reason.trim(),
          'validUntil': validUntil.toIso8601String(),
        },
      ),
    );
  }

  Future<void> transitionGatePass(String id, String toStatus) async {
    await _request(
      () => _dio.patch<Object?>(
        '/safety/gate-passes/${Uri.encodeComponent(id)}/status',
        data: {'toStatus': toStatus},
      ),
    );
  }

  Future<void> createSecurityIncident({
    required String title,
    required String severity,
    required DateTime occurredAt,
    required String details,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/safety/incidents',
        data: {
          'title': title.trim(),
          'severity': severity,
          'occurredAt': occurredAt.toIso8601String(),
          'details': details.trim(),
        },
      ),
    );
  }

  Future<void> transitionSecurityIncident(String id, String toStatus) async {
    await _request(
      () => _dio.patch<Object?>(
        '/safety/incidents/${Uri.encodeComponent(id)}/status',
        data: {'toStatus': toStatus},
      ),
    );
  }

  Future<List<HealthStudentOption>> getHealthStudents() async =>
      (await _getList(
        '/health/students',
      )).map(HealthStudentOption.fromJson).toList(growable: false);

  Future<List<HealthProfileRow>> getHealthProfiles() async => (await _getList(
    '/health/profiles',
  )).map(HealthProfileRow.fromJson).toList(growable: false);

  Future<List<ClinicVisitRow>> getClinicVisits() async => (await _getList(
    '/health/clinic-visits',
  )).map(ClinicVisitRow.fromJson).toList(growable: false);

  Future<void> createClinicVisit({
    required String studentId,
    required DateTime visitedAt,
    required String summary,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/health/clinic-visits',
        data: {
          'studentId': studentId,
          'visitedAt': visitedAt.toIso8601String(),
          'summary': summary.trim(),
        },
      ),
    );
  }

  Future<void> saveHealthProfile({
    required String studentId,
    String? allergies,
    String? conditions,
  }) async {
    await _request(
      () => _dio.put<Object?>(
        '/health/students/${Uri.encodeComponent(studentId)}/profile',
        data: {
          'allergies': allergies?.trim() ?? '',
          'conditions': conditions?.trim() ?? '',
        },
      ),
    );
  }

  Future<List<AssetRow>> getAssets({bool includeInactive = false}) async =>
      (await _getList(
        includeInactive ? '/assets/all' : '/assets',
      )).map(AssetRow.fromJson).toList(growable: false);

  Future<List<AssetAssignmentRow>> getAssetAssignments() async =>
      (await _getList(
        '/assets/assignments',
      )).map(AssetAssignmentRow.fromJson).toList(growable: false);

  Future<List<AssetMaintenanceRow>> getAssetMaintenance() async =>
      (await _getList(
        '/assets/maintenance',
      )).map(AssetMaintenanceRow.fromJson).toList(growable: false);

  Future<List<AssetDepreciationRow>> getAssetDepreciation() async =>
      (await _getList(
        '/assets/depreciation',
      )).map(AssetDepreciationRow.fromJson).toList(growable: false);

  Future<void> createAsset({
    required String name,
    required String code,
    required String category,
    String? serialNumber,
    required int acquisitionMinor,
    required int usefulLifeMonths,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/assets',
        data: {
          'name': name.trim(),
          'code': code.trim(),
          'category': category.trim(),
          if (serialNumber != null && serialNumber.trim().isNotEmpty)
            'serialNumber': serialNumber.trim(),
          'acquisitionMinor': acquisitionMinor,
          'usefulLifeMonths': usefulLifeMonths,
        },
      ),
    );
  }

  Future<void> transitionAsset(String id, String toStatus) async {
    await _request(
      () => _dio.patch<Object?>(
        '/assets/${Uri.encodeComponent(id)}/status',
        data: {'toStatus': toStatus},
      ),
    );
  }

  Future<void> assignAsset({
    required String assetId,
    required String assigneeType,
    required String assigneeId,
    String? notes,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/assets/assignments',
        data: {
          'assetId': assetId,
          'assigneeType': assigneeType,
          'assigneeId': assigneeId,
          if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
        },
      ),
    );
  }

  Future<void> transitionAssetAssignment(String id, String toStatus) async {
    await _request(
      () => _dio.patch<Object?>(
        '/assets/assignments/${Uri.encodeComponent(id)}/status',
        data: {'toStatus': toStatus},
      ),
    );
  }

  Future<void> createAssetMaintenance({
    required String assetId,
    required String title,
    required int costMinor,
    String? notes,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/assets/maintenance',
        data: {
          'assetId': assetId,
          'title': title.trim(),
          'costMinor': costMinor,
          if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
        },
      ),
    );
  }

  Future<void> transitionAssetMaintenance(String id, String toStatus) async {
    await _request(
      () => _dio.patch<Object?>(
        '/assets/maintenance/${Uri.encodeComponent(id)}/status',
        data: {'toStatus': toStatus},
      ),
    );
  }

  Future<void> postAssetDepreciation({
    required String assetId,
    required String period,
    required int amountMinor,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/assets/depreciation',
        data: {
          'assetId': assetId,
          'period': period,
          'amountMinor': amountMinor,
        },
      ),
    );
  }

  Future<List<InventorySupplierRow>> getInventorySuppliers() async =>
      (await _getList(
        '/inventory/suppliers',
      )).map(InventorySupplierRow.fromJson).toList(growable: false);

  Future<List<InventoryItemRow>> getInventoryItems({String? search}) async =>
      (await _getList(
        '/inventory/items',
        query: {
          if (search != null && search.trim().isNotEmpty)
            'search': search.trim(),
        },
      )).map(InventoryItemRow.fromJson).toList(growable: false);

  Future<List<StockMovementRow>> getStockMovements() async => (await _getList(
    '/inventory/stock-movements',
  )).map(StockMovementRow.fromJson).toList(growable: false);

  Future<void> createInventorySupplier({
    required String name,
    String? contactEmail,
    String? phone,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/inventory/suppliers',
        data: {
          'name': name.trim(),
          if (contactEmail != null && contactEmail.trim().isNotEmpty)
            'contactEmail': contactEmail.trim(),
          if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
        },
      ),
    );
  }

  Future<void> createInventoryItem({
    required String name,
    required String sku,
    required int reorderLevel,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/inventory/items',
        data: {
          'name': name.trim(),
          'sku': sku.trim(),
          'reorderLevel': reorderLevel,
        },
      ),
    );
  }

  Future<void> postStockMovement({
    required String inventoryItemId,
    required int quantity,
    required String direction,
    String? reference,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/inventory/stock-movements',
        data: {
          'inventoryItemId': inventoryItemId,
          'quantity': quantity,
          'direction': direction,
          if (reference != null && reference.trim().isNotEmpty)
            'reference': reference.trim(),
        },
      ),
    );
  }

  Future<List<ProcurementRequisitionRow>> getProcurementRequisitions() async =>
      (await _getList(
        '/procurement/requisitions',
      )).map(ProcurementRequisitionRow.fromJson).toList(growable: false);

  Future<List<ProcurementPurchaseOrderRow>>
  getProcurementPurchaseOrders() async => (await _getList(
    '/procurement/purchase-orders',
  )).map(ProcurementPurchaseOrderRow.fromJson).toList(growable: false);

  Future<List<ProcurementGoodsReceiptRow>>
  getProcurementGoodsReceipts() async => (await _getList(
    '/procurement/goods-receipts',
  )).map(ProcurementGoodsReceiptRow.fromJson).toList(growable: false);

  Future<void> createProcurementRequisition({
    required String name,
    required int quantity,
    required int estimatedMinor,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/procurement/requisitions',
        data: {
          'name': name.trim(),
          'quantity': quantity,
          'estimatedMinor': estimatedMinor,
        },
      ),
    );
  }

  Future<void> transitionProcurementRequisition(
    String id,
    String toStatus,
  ) async {
    await _request(
      () => _dio.patch<Object?>(
        '/procurement/requisitions/${Uri.encodeComponent(id)}/status',
        data: {'toStatus': toStatus},
      ),
    );
  }

  Future<void> createProcurementPurchaseOrder({
    required String requisitionId,
    String? supplierId,
    String? supplierName,
    required int amountMinor,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/procurement/purchase-orders',
        data: {
          'requisitionId': requisitionId,
          if (supplierId != null && supplierId.isNotEmpty)
            'supplierId': supplierId,
          if (supplierName != null && supplierName.trim().isNotEmpty)
            'supplierName': supplierName.trim(),
          'amountMinor': amountMinor,
        },
      ),
    );
  }

  Future<void> transitionProcurementPurchaseOrder(
    String id,
    String toStatus,
  ) async {
    await _request(
      () => _dio.patch<Object?>(
        '/procurement/purchase-orders/${Uri.encodeComponent(id)}/status',
        data: {'toStatus': toStatus},
      ),
    );
  }

  Future<void> postGoodsReceipt({
    required String purchaseOrderId,
    required String inventoryItemId,
    required int quantity,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/procurement/goods-receipts',
        data: {
          'purchaseOrderId': purchaseOrderId,
          'inventoryItemId': inventoryItemId,
          'quantity': quantity,
        },
      ),
    );
  }

  Future<List<FacilityBookingRow>> getFacilityBookings() async =>
      (await _getList(
        '/facilities/bookings',
      )).map(FacilityBookingRow.fromJson).toList(growable: false);

  Future<List<FacilityMaintenanceRow>> getFacilityMaintenance() async =>
      (await _getList(
        '/facilities/maintenance',
      )).map(FacilityMaintenanceRow.fromJson).toList(growable: false);

  Future<List<FacilityComplaintRow>> getFacilityComplaints() async =>
      (await _getList(
        '/facilities/complaints',
      )).map(FacilityComplaintRow.fromJson).toList(growable: false);

  Future<void> createFacilityBooking({
    required String facilityName,
    required String purpose,
    required DateTime startsAt,
    required DateTime endsAt,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/facilities/bookings',
        data: {
          'facilityName': facilityName.trim(),
          'purpose': purpose.trim(),
          'startsAt': startsAt.toIso8601String(),
          'endsAt': endsAt.toIso8601String(),
        },
      ),
    );
  }

  Future<void> transitionFacilityBooking(String id, String toStatus) async {
    await _request(
      () => _dio.patch<Object?>(
        '/facilities/bookings/${Uri.encodeComponent(id)}/status',
        data: {'toStatus': toStatus},
      ),
    );
  }

  Future<void> createFacilityMaintenance({
    required String facilityName,
    required String title,
    required String priority,
    required String details,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/facilities/maintenance',
        data: {
          'facilityName': facilityName.trim(),
          'title': title.trim(),
          'priority': priority,
          'details': details.trim(),
        },
      ),
    );
  }

  Future<void> transitionFacilityMaintenance(String id, String toStatus) async {
    await _request(
      () => _dio.patch<Object?>(
        '/facilities/maintenance/${Uri.encodeComponent(id)}/status',
        data: {'toStatus': toStatus},
      ),
    );
  }

  Future<void> createFacilityComplaint({
    required String facilityName,
    required String title,
    required String details,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/facilities/complaints',
        data: {
          'facilityName': facilityName.trim(),
          'title': title.trim(),
          'details': details.trim(),
        },
      ),
    );
  }

  Future<void> transitionFacilityComplaint(String id, String toStatus) async {
    await _request(
      () => _dio.patch<Object?>(
        '/facilities/complaints/${Uri.encodeComponent(id)}/status',
        data: {'toStatus': toStatus},
      ),
    );
  }

  Future<List<HostelRoomRow>> getHostelRooms() async => (await _getList(
    '/hostel/rooms',
  )).map(HostelRoomRow.fromJson).toList(growable: false);

  Future<List<HostelBedRow>> getHostelBeds() async => (await _getList(
    '/hostel/beds',
  )).map(HostelBedRow.fromJson).toList(growable: false);

  Future<List<HostelStudentOption>> getHostelStudents() async =>
      (await _getList(
        '/hostel/students',
      )).map(HostelStudentOption.fromJson).toList(growable: false);

  Future<List<HostelAllotmentRow>> getHostelAllotments() async =>
      (await _getList(
        '/hostel/allotments',
      )).map(HostelAllotmentRow.fromJson).toList(growable: false);

  Future<void> createHostelRoom({
    required String building,
    String? floor,
    required String roomNumber,
    required int capacity,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/hostel/rooms',
        data: {
          'building': building.trim(),
          if (floor != null && floor.trim().isNotEmpty) 'floor': floor.trim(),
          'roomNumber': roomNumber.trim(),
          'capacity': capacity,
        },
      ),
    );
  }

  Future<void> createHostelBed({
    required String roomId,
    required String code,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/hostel/beds',
        data: {'roomId': roomId, 'code': code.trim()},
      ),
    );
  }

  Future<void> allocateHostelBed({
    required String roomId,
    required String bedId,
    required String studentId,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/hostel/allotments',
        data: {'roomId': roomId, 'bedId': bedId, 'studentId': studentId},
      ),
    );
  }

  Future<void> checkoutHostelAllotment(String id) async {
    await _request(
      () => _dio.post<Object?>(
        '/hostel/allotments/${Uri.encodeComponent(id)}/checkout',
      ),
    );
  }

  Future<List<CanteenMenuRow>> getCanteenMenu() async => (await _getList(
    '/canteen/menu',
  )).map(CanteenMenuRow.fromJson).toList(growable: false);

  Future<List<CanteenStudentOption>> getCanteenStudents() async =>
      (await _getList(
        '/canteen/students',
      )).map(CanteenStudentOption.fromJson).toList(growable: false);

  Future<List<CanteenTransactionRow>> getCanteenTransactions() async =>
      (await _getList(
        '/canteen/transactions',
      )).map(CanteenTransactionRow.fromJson).toList(growable: false);

  Future<void> createCanteenMenu({
    required String name,
    required int priceMinor,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/canteen/menu',
        data: {'name': name.trim(), 'priceMinor': priceMinor},
      ),
    );
  }

  Future<void> createCanteenTransaction({
    required String menuId,
    required String studentId,
    required int quantity,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/canteen/transactions',
        data: {'menuId': menuId, 'studentId': studentId, 'quantity': quantity},
      ),
    );
  }

  Future<List<AdminCampusRow>> getAdminCampuses() async => (await _getList(
    '/campuses',
  )).map(AdminCampusRow.fromJson).toList(growable: false);

  Future<void> createCampus({
    required String name,
    required String code,
    String? address,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/campuses',
        data: {
          'name': name.trim(),
          'code': code.trim(),
          if (address != null && address.trim().isNotEmpty)
            'address': address.trim(),
        },
      ),
    );
  }

  Future<void> updateCampus({
    required String id,
    required String name,
    required String code,
    String? address,
  }) async {
    await _request(
      () => _dio.patch<Object?>(
        '/campuses/${Uri.encodeComponent(id)}',
        data: {
          'name': name.trim(),
          'code': code.trim(),
          if (address != null && address.trim().isNotEmpty)
            'address': address.trim(),
        },
      ),
    );
  }

  Future<void> archiveCampus(String id) async {
    await _request(
      () => _dio.post<Object?>('/campuses/${Uri.encodeComponent(id)}/archive'),
    );
  }

  Future<List<AcademicSetupRow>> getAcademicSetup(String kind) async =>
      (await _getList(
        '/settings/${Uri.encodeComponent(kind)}',
      )).map(AcademicSetupRow.fromJson).toList(growable: false);

  Future<AcademicSetupOptions> getAcademicSetupOptions() async =>
      AcademicSetupOptions.fromJson(await _get('/settings/options'));

  Future<void> createAcademicSetup({
    required String kind,
    required String campusId,
    required String name,
    String? code,
    DateTime? startsOn,
    DateTime? endsOn,
    bool isActive = false,
    int? sortOrder,
    String? classId,
    int? capacity,
    bool isOptional = false,
  }) async {
    final data = <String, Object?>{
      'kind': kind,
      'campusId': campusId,
      'name': name.trim(),
      if (code?.trim().isNotEmpty == true) 'code': code!.trim(),
      if (startsOn != null) 'startsOn': _dateKey(startsOn),
      if (endsOn != null) 'endsOn': _dateKey(endsOn),
      if (kind == 'academic_year') 'isActive': isActive,
      if (kind == 'subject') 'isOptional': isOptional,
    };
    if (sortOrder != null) data['sortOrder'] = sortOrder;
    if (classId?.isNotEmpty == true) data['classId'] = classId;
    if (capacity != null) data['capacity'] = capacity;
    await _request(() => _dio.post<Object?>('/settings', data: data));
  }

  Future<void> archiveAcademicSetup(String kind, String id) async {
    await _request(
      () => _dio.post<Object?>(
        '/settings/${Uri.encodeComponent(kind)}/${Uri.encodeComponent(id)}/archive',
      ),
    );
  }

  Future<AdminUsersPage> getAdminUsers({String? search}) async =>
      AdminUsersPage.fromJson(
        await _get(
          '/users',
          query: {
            'page': 1,
            'pageSize': 100,
            if (search != null && search.trim().isNotEmpty)
              'search': search.trim(),
          },
        ),
      );

  Future<AdminUserAccessDetail> getAdminUserAccess(String userId) async =>
      AdminUserAccessDetail.fromJson(
        await _get('/users/${Uri.encodeComponent(userId)}/access'),
      );

  Future<void> updateAdminUserAccess({
    required String userId,
    required String displayName,
    required String role,
    required String status,
    required String primaryCampusId,
    required List<String> campusIds,
    required List<AdminClassSectionScope> classSectionScopes,
  }) async {
    await _request(
      () => _dio.patch<Object?>(
        '/users/${Uri.encodeComponent(userId)}/access',
        data: {
          'displayName': displayName.trim(),
          'role': role,
          'status': status,
          'primaryCampusId': primaryCampusId,
          'campusIds': campusIds,
          'classSectionScopes': [
            for (final scope in classSectionScopes)
              {'classId': scope.classId, 'sectionId': scope.sectionId},
          ],
        },
      ),
    );
  }

  Future<List<StudentOption>> getStudentOptions({String? search}) async =>
      (await _getList(
        '/attendance/students/options',
        query: {
          if (search != null && search.trim().isNotEmpty)
            'search': search.trim(),
        },
      )).map(StudentOption.fromJson).toList(growable: false);

  Future<TeacherAttendancePage> getTeacherAttendance({DateTime? date}) async {
    final data = await _get(
      '/attendance/students',
      query: {
        'page': 1,
        'pageSize': 100,
        if (date != null) 'date': _dateKey(date),
      },
    );
    return TeacherAttendancePage.fromJson(data);
  }

  Future<void> markAttendance({
    required String studentId,
    required DateTime attendanceDate,
    required String periodKey,
    required String state,
    String? note,
  }) async {
    await _request(
      () => _dio.post<Object?>(
        '/attendance/records',
        data: {
          'studentId': studentId,
          'attendanceDate': _dateKey(attendanceDate),
          'periodKey': periodKey,
          'state': state,
          if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
        },
      ),
    );
  }

  Future<PagedRows<AttendanceRow>> getAttendance(String studentId) =>
      _studentRows(studentId, 'attendance', AttendanceRow.fromJson);
  Future<PagedRows<InvoiceRow>> getInvoices(String studentId) =>
      _studentRows(studentId, 'invoices', InvoiceRow.fromJson);
  Future<PagedRows<ResultRow>> getResults(String studentId) =>
      _studentRows(studentId, 'results', ResultRow.fromJson);

  Future<List<DocumentRow>> getDocuments(String studentId) async {
    final data = await _get(
      '/students/${Uri.encodeComponent(studentId)}/documents',
    );
    return asJsonList(
      data['documents'],
      'documents',
    ).map(DocumentRow.fromJson).toList(growable: false);
  }

  Future<PagedRows<T>> _studentRows<T>(
    String studentId,
    String suffix,
    T Function(Json) parser,
  ) async {
    final data = await _get(
      '/students/${Uri.encodeComponent(studentId)}/$suffix',
      query: {'page': 1, 'pageSize': 50},
    );
    return _paged(data, parser);
  }

  PagedRows<T> _paged<T>(Json data, T Function(Json) parser) => PagedRows(
    rows: asJsonList(data['rows'], 'rows').map(parser).toList(growable: false),
    pageInfo: PageInfo.fromJson(asJson(data['pageInfo'], 'pageInfo')),
  );

  Future<Json> _get(
    String path, {
    Map<String, Object?>? query,
    Options? options,
  }) async {
    final response = await _request(
      () => _dio.get<Object?>(path, queryParameters: query, options: options),
    );
    final envelope = asJson(response.data, 'response');
    return asJson(envelope['data'], 'response.data');
  }

  Future<List<Json>> _getList(
    String path, {
    Map<String, Object?>? query,
  }) async {
    final response = await _request(
      () => _dio.get<Object?>(path, queryParameters: query),
    );
    final envelope = asJson(response.data, 'response');
    return asJsonList(envelope['data'], 'response.data');
  }

  Future<Response<Object?>> _request(
    Future<Response<Object?>> Function() call,
  ) async {
    try {
      return await call();
    } on DioException catch (error) {
      throw ApiError.fromDio(error);
    } on FormatException catch (_) {
      throw const ApiError(
        kind: ApiErrorKind.serverFailure,
        message: 'The school service returned an unexpected response.',
      );
    }
  }

  String? get activeCampusId => _campusId();

  static String _dateKey(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-'
      '${date.month.toString().padLeft(2, '0')}-'
      '${date.day.toString().padLeft(2, '0')}';
}

class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._dio, this._tokenLoader, this._campusId);
  final Dio _dio;
  final TokenLoader _tokenLoader;
  final String? Function() _campusId;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _tokenLoader(forceRefresh: false);
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    if (options.extra['omitCampus'] != true &&
        !options.headers.containsKey('X-Campus-Id')) {
      final campus = _campusId();
      if (campus != null && campus.isNotEmpty) {
        options.headers['X-Campus-Id'] = campus;
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    final request = error.requestOptions;
    if (error.response?.statusCode != 401 ||
        request.extra['tokenRetried'] == true) {
      handler.next(error);
      return;
    }
    final token = await _tokenLoader(forceRefresh: true);
    if (token == null || token.isEmpty) {
      handler.next(error);
      return;
    }
    request.extra['tokenRetried'] = true;
    request.headers['Authorization'] = 'Bearer $token';
    try {
      handler.resolve(await _dio.fetch<Object?>(request));
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }
}
