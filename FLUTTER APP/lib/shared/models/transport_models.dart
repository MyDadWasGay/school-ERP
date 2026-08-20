import 'dart:convert';

import 'identity_models.dart';

class TransportAllocation {
  const TransportAllocation({
    required this.id,
    required this.routeName,
    required this.studentId,
    required this.studentName,
    required this.stopName,
    required this.createdAt,
    this.routeId,
  });

  factory TransportAllocation.fromJson(Json json) => TransportAllocation(
    id: asString(json['id'], 'transportAllocation.id'),
    routeName: asString(json['routeName'], 'transportAllocation.routeName'),
    studentId: asString(json['studentId'], 'transportAllocation.studentId'),
    studentName: asString(
      json['studentName'],
      'transportAllocation.studentName',
    ),
    stopName: asString(json['stopName'], 'transportAllocation.stopName'),
    createdAt: DateTime.parse(
      asString(json['createdAt'], 'transportAllocation.createdAt'),
    ),
    routeId: json['routeId'] as String?,
  );

  final String id;
  final String routeName;
  final String studentId;
  final String studentName;
  final String stopName;
  final DateTime createdAt;
  final String? routeId;
}

class TransportRouteRow {
  const TransportRouteRow({
    required this.id,
    required this.name,
    required this.capacity,
    required this.status,
    this.vehicleId,
  });

  factory TransportRouteRow.fromJson(Json json) => TransportRouteRow(
    id: asString(json['id'], 'transportRoute.id'),
    name: asString(json['name'], 'transportRoute.name'),
    capacity: asInt(json['capacity'], 'transportRoute.capacity'),
    status: asString(json['status'], 'transportRoute.status'),
    vehicleId: json['vehicleId'] as String?,
  );

  final String id;
  final String name;
  final int capacity;
  final String status;
  final String? vehicleId;
}

class TransportVehicleRow {
  const TransportVehicleRow({
    required this.id,
    required this.registrationNumber,
    required this.type,
    required this.capacity,
    required this.status,
  });

  factory TransportVehicleRow.fromJson(Json json) => TransportVehicleRow(
    id: asString(json['id'], 'transportVehicle.id'),
    registrationNumber: asString(
      json['registrationNumber'],
      'transportVehicle.registrationNumber',
    ),
    type: asString(json['type'], 'transportVehicle.type'),
    capacity: asInt(json['capacity'], 'transportVehicle.capacity'),
    status: asString(json['status'], 'transportVehicle.status'),
  );

  final String id;
  final String registrationNumber;
  final String type;
  final int capacity;
  final String status;
}

class TransportStopRow {
  const TransportStopRow({
    required this.id,
    required this.name,
    required this.status,
    this.address,
  });

  factory TransportStopRow.fromJson(Json json) => TransportStopRow(
    id: asString(json['id'], 'transportStop.id'),
    name: asString(json['name'], 'transportStop.name'),
    status: asString(json['status'], 'transportStop.status'),
    address: json['address'] as String?,
  );

  final String id;
  final String name;
  final String status;
  final String? address;
}

class TransportStudentOption {
  const TransportStudentOption({required this.id, required this.name});

  factory TransportStudentOption.fromJson(Json json) => TransportStudentOption(
    id: asString(json['id'], 'transportStudent.id'),
    name: asString(json['name'], 'transportStudent.name'),
  );

  final String id;
  final String name;
}

class TransportDocumentRow {
  const TransportDocumentRow({
    required this.id,
    required this.name,
    required this.vehicleId,
    required this.registrationNumber,
    required this.status,
    this.expiresOn,
  });

  factory TransportDocumentRow.fromJson(Json json) {
    DateTime? expiresOn;
    final raw = json['detailsJson'];
    if (raw is String) {
      try {
        final details = asJson(
          jsonDecode(raw),
          'transportDocument.detailsJson',
        );
        final value = details['expiresOn'];
        if (value is String) expiresOn = DateTime.tryParse(value);
      } on FormatException {
        // Keep the document visible even if legacy metadata is malformed.
      }
    }
    return TransportDocumentRow(
      id: asString(json['id'], 'transportDocument.id'),
      name: asString(json['name'], 'transportDocument.name'),
      vehicleId: asString(json['vehicleId'], 'transportDocument.vehicleId'),
      registrationNumber: asString(
        json['registrationNumber'],
        'transportDocument.registrationNumber',
      ),
      status: asString(json['status'], 'transportDocument.status'),
      expiresOn: expiresOn,
    );
  }

  final String id;
  final String name;
  final String vehicleId;
  final String registrationNumber;
  final String status;
  final DateTime? expiresOn;
}

class TransportChecklistStudent {
  const TransportChecklistStudent({
    required this.allocationId,
    required this.studentId,
    required this.studentName,
    required this.stopId,
    required this.stopName,
    this.eventId,
    this.eventType,
    this.note,
  });

  factory TransportChecklistStudent.fromJson(Json json) =>
      TransportChecklistStudent(
        allocationId: asString(json['allocationId'], 'transportChecklist.allocationId'),
        studentId: asString(json['studentId'], 'transportChecklist.studentId'),
        studentName: asString(json['studentName'], 'transportChecklist.studentName'),
        stopId: asString(json['stopId'], 'transportChecklist.stopId'),
        stopName: asString(json['stopName'], 'transportChecklist.stopName'),
        eventId: json['eventId'] as String?,
        eventType: json['eventType'] as String?,
        note: json['note'] as String?,
      );

  final String allocationId;
  final String studentId;
  final String studentName;
  final String stopId;
  final String stopName;
  final String? eventId;
  final String? eventType;
  final String? note;
}

class TransportChecklist {
  const TransportChecklist({
    required this.routeId,
    required this.routeName,
    required this.eventDate,
    required this.tripType,
    required this.students,
    this.vehicleId,
  });

  factory TransportChecklist.fromJson(Json json) {
    final route = asJson(json['route'], 'transportChecklist.route');
    return TransportChecklist(
      routeId: asString(route['id'], 'transportChecklist.route.id'),
      routeName: asString(route['name'], 'transportChecklist.route.name'),
      vehicleId: route['vehicleId'] as String?,
      eventDate: DateTime.parse(
        asString(json['eventDate'], 'transportChecklist.eventDate'),
      ),
      tripType: asString(json['tripType'], 'transportChecklist.tripType'),
      students: asJsonList(
        json['students'],
        'transportChecklist.students',
      ).map(TransportChecklistStudent.fromJson).toList(growable: false),
    );
  }

  final String routeId;
  final String routeName;
  final String? vehicleId;
  final DateTime eventDate;
  final String tripType;
  final List<TransportChecklistStudent> students;
}

class TransportLocation {
  const TransportLocation({
    required this.routeId,
    required this.latitude,
    required this.longitude,
    required this.recordedAt,
    required this.stale,
    this.accuracyMeters,
  });

  factory TransportLocation.fromJson(Json json) => TransportLocation(
    routeId: asString(json['routeId'], 'transportLocation.routeId'),
    latitude: asDouble(json['latitude'], 'transportLocation.latitude'),
    longitude: asDouble(json['longitude'], 'transportLocation.longitude'),
    accuracyMeters: json['accuracyMeters'] == null
        ? null
        : asDouble(json['accuracyMeters'], 'transportLocation.accuracyMeters'),
    recordedAt: DateTime.parse(
      asString(json['recordedAt'], 'transportLocation.recordedAt'),
    ),
    stale: json['stale'] == true,
  );

  final String routeId;
  final double latitude;
  final double longitude;
  final double? accuracyMeters;
  final DateTime recordedAt;
  final bool stale;
}
