import 'identity_models.dart';

class LeaveRequest {
  const LeaveRequest({
    required this.id,
    required this.requester,
    required this.startsOn,
    required this.endsOn,
    required this.reason,
    required this.status,
    required this.canReview,
  });

  factory LeaveRequest.fromJson(Json json) => LeaveRequest(
    id: asString(json['id'], 'leave.id'),
    requester: asString(json['requester'], 'leave.requester'),
    startsOn: asString(json['startsOn'], 'leave.startsOn'),
    endsOn: asString(json['endsOn'], 'leave.endsOn'),
    reason: asString(json['reason'], 'leave.reason'),
    status: asString(json['status'], 'leave.status'),
    canReview: json['canReview'] == true,
  );

  final String id;
  final String requester;
  final String startsOn;
  final String endsOn;
  final String reason;
  final String status;
  final bool canReview;
}
