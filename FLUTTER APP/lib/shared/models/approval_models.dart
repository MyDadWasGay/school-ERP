import 'attendance_models.dart';
import 'leave_models.dart';
import 'operations_models.dart';
import 'workspace_models.dart';

class ApprovalInbox {
  const ApprovalInbox({
    required this.admissions,
    required this.leaveRequests,
    required this.attendanceCorrections,
    required this.requisitions,
    required this.facilityBookings,
  });

  final List<AdmissionApproval> admissions;
  final List<LeaveRequest> leaveRequests;
  final List<AttendanceCorrectionRow> attendanceCorrections;
  final List<ProcurementRequisitionRow> requisitions;
  final List<FacilityBookingRow> facilityBookings;

  int get count =>
      admissions.length +
      leaveRequests.length +
      attendanceCorrections.length +
      requisitions.length +
      facilityBookings.length;

  bool get isEmpty => count == 0;
}
