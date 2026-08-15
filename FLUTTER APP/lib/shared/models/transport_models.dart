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
