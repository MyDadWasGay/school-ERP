import 'dart:convert';

import 'identity_models.dart';

Map<String, Object?> _details(Json json, String field) {
  final value = json['detailsJson'];
  if (value is String && value.trim().isNotEmpty) {
    try {
      return asJson(jsonDecode(value), field);
    } on FormatException {
      return const {};
    } on JsonUnsupportedObjectError {
      return const {};
    }
  }
  if (value is Map) return asJson(value, field);
  return const {};
}

class SafetyVisitorRow {
  const SafetyVisitorRow({
    required this.id,
    required this.name,
    required this.effectiveAt,
    required this.status,
    this.purpose,
    this.hostName,
  });

  factory SafetyVisitorRow.fromJson(Json json) {
    final details = _details(json, 'visitor.details');
    return SafetyVisitorRow(
      id: asString(json['id'], 'visitor.id'),
      name: asString(json['name'], 'visitor.name'),
      effectiveAt: DateTime.parse(
        asString(json['effectiveAt'], 'visitor.effectiveAt'),
      ),
      status: asString(json['status'], 'visitor.status'),
      purpose: details['purpose'] as String?,
      hostName: details['hostName'] as String?,
    );
  }

  final String id;
  final String name;
  final DateTime effectiveAt;
  final String status;
  final String? purpose;
  final String? hostName;
}

class SafetyGatePassRow {
  const SafetyGatePassRow({
    required this.id,
    required this.name,
    required this.visitorId,
    required this.validUntil,
    required this.status,
    this.reason,
  });

  factory SafetyGatePassRow.fromJson(Json json) {
    final details = _details(json, 'gatePass.details');
    return SafetyGatePassRow(
      id: asString(json['id'], 'gatePass.id'),
      name: asString(json['name'], 'gatePass.name'),
      visitorId: asString(json['referenceId'], 'gatePass.visitorId'),
      validUntil: DateTime.parse(
        asString(json['effectiveAt'], 'gatePass.effectiveAt'),
      ),
      status: asString(json['status'], 'gatePass.status'),
      reason: details['reason'] as String?,
    );
  }

  final String id;
  final String name;
  final String visitorId;
  final DateTime validUntil;
  final String status;
  final String? reason;
}

class SafetyIncidentRow {
  const SafetyIncidentRow({
    required this.id,
    required this.title,
    required this.occurredAt,
    required this.status,
    required this.severity,
    this.details,
  });

  factory SafetyIncidentRow.fromJson(Json json) {
    final details = _details(json, 'securityIncident.details');
    return SafetyIncidentRow(
      id: asString(json['id'], 'securityIncident.id'),
      title: asString(json['name'], 'securityIncident.title'),
      occurredAt: DateTime.parse(
        asString(json['effectiveAt'], 'securityIncident.occurredAt'),
      ),
      status: asString(json['status'], 'securityIncident.status'),
      severity: asString(details['severity'], 'securityIncident.severity'),
      details: details['details'] as String?,
    );
  }

  final String id;
  final String title;
  final DateTime occurredAt;
  final String status;
  final String severity;
  final String? details;
}

class HealthStudentOption {
  const HealthStudentOption({required this.id, required this.name});

  factory HealthStudentOption.fromJson(Json json) => HealthStudentOption(
    id: asString(json['id'], 'healthStudent.id'),
    name: asString(json['name'], 'healthStudent.name'),
  );

  final String id;
  final String name;
}

class HealthProfileRow {
  const HealthProfileRow({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.updatedAt,
    this.allergies,
    this.conditions,
  });

  factory HealthProfileRow.fromJson(Json json) => HealthProfileRow(
    id: asString(json['id'], 'healthProfile.id'),
    studentId: asString(json['studentId'], 'healthProfile.studentId'),
    studentName: asString(json['studentName'], 'healthProfile.studentName'),
    updatedAt: DateTime.parse(
      asString(json['updatedAt'], 'healthProfile.updatedAt'),
    ),
    allergies: json['allergies'] as String?,
    conditions: json['conditions'] as String?,
  );

  final String id;
  final String studentId;
  final String studentName;
  final DateTime updatedAt;
  final String? allergies;
  final String? conditions;
}

class ClinicVisitRow {
  const ClinicVisitRow({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.visitedAt,
    required this.summary,
    required this.status,
  });

  factory ClinicVisitRow.fromJson(Json json) => ClinicVisitRow(
    id: asString(json['id'], 'clinicVisit.id'),
    studentId: asString(json['studentId'], 'clinicVisit.studentId'),
    studentName: asString(json['studentName'], 'clinicVisit.studentName'),
    visitedAt: DateTime.parse(
      asString(json['visitedAt'], 'clinicVisit.visitedAt'),
    ),
    summary: asString(json['summary'], 'clinicVisit.summary'),
    status: asString(json['status'], 'clinicVisit.status'),
  );

  final String id;
  final String studentId;
  final String studentName;
  final DateTime visitedAt;
  final String summary;
  final String status;
}

class InventorySupplierRow {
  const InventorySupplierRow({
    required this.id,
    required this.name,
    required this.status,
    this.contactEmail,
    this.phone,
  });

  factory InventorySupplierRow.fromJson(Json json) => InventorySupplierRow(
    id: asString(json['id'], 'supplier.id'),
    name: asString(json['name'], 'supplier.name'),
    status: asString(json['status'], 'supplier.status'),
    contactEmail: json['contactEmail'] as String?,
    phone: json['phone'] as String?,
  );

  final String id;
  final String name;
  final String status;
  final String? contactEmail;
  final String? phone;
}

class InventoryItemRow {
  const InventoryItemRow({
    required this.id,
    required this.name,
    required this.sku,
    required this.quantity,
    required this.reorderLevel,
    required this.status,
  });

  factory InventoryItemRow.fromJson(Json json) => InventoryItemRow(
    id: asString(json['id'], 'inventoryItem.id'),
    name: asString(json['name'], 'inventoryItem.name'),
    sku: asString(json['sku'], 'inventoryItem.sku'),
    quantity: asInt(json['quantity'], 'inventoryItem.quantity'),
    reorderLevel: asInt(json['reorderLevel'], 'inventoryItem.reorderLevel'),
    status: asString(json['status'], 'inventoryItem.status'),
  );

  final String id;
  final String name;
  final String sku;
  final int quantity;
  final int reorderLevel;
  final String status;
}

class StockMovementRow {
  const StockMovementRow({
    required this.id,
    required this.itemName,
    required this.sku,
    required this.quantity,
    required this.direction,
    required this.createdAt,
    this.reference,
  });

  factory StockMovementRow.fromJson(Json json) => StockMovementRow(
    id: asString(json['id'], 'stockMovement.id'),
    itemName: asString(json['itemName'], 'stockMovement.itemName'),
    sku: asString(json['sku'], 'stockMovement.sku'),
    quantity: asInt(json['quantity'], 'stockMovement.quantity'),
    direction: asString(json['direction'], 'stockMovement.direction'),
    createdAt: DateTime.parse(
      asString(json['createdAt'], 'stockMovement.createdAt'),
    ),
    reference: json['reference'] as String?,
  );

  final String id;
  final String itemName;
  final String sku;
  final int quantity;
  final String direction;
  final DateTime createdAt;
  final String? reference;
}

class ProcurementRequisitionRow {
  const ProcurementRequisitionRow({
    required this.id,
    required this.name,
    required this.code,
    required this.status,
    required this.quantity,
    required this.estimatedMinor,
    required this.createdAt,
  });

  factory ProcurementRequisitionRow.fromJson(Json json) {
    final details = _details(json, 'requisition.details');
    return ProcurementRequisitionRow(
      id: asString(json['id'], 'requisition.id'),
      name: asString(json['name'], 'requisition.name'),
      code: asString(json['code'], 'requisition.code'),
      status: asString(json['status'], 'requisition.status'),
      quantity: asInt(details['quantity'], 'requisition.quantity'),
      estimatedMinor: asInt(
        details['estimatedMinor'],
        'requisition.estimatedMinor',
      ),
      createdAt: DateTime.parse(
        asString(json['createdAt'], 'requisition.createdAt'),
      ),
    );
  }

  final String id;
  final String name;
  final String code;
  final String status;
  final int quantity;
  final int estimatedMinor;
  final DateTime createdAt;
}

class ProcurementPurchaseOrderRow {
  const ProcurementPurchaseOrderRow({
    required this.id,
    required this.name,
    required this.code,
    required this.referenceId,
    required this.status,
    required this.supplierName,
    required this.amountMinor,
    required this.createdAt,
  });

  factory ProcurementPurchaseOrderRow.fromJson(Json json) {
    final details = _details(json, 'purchaseOrder.details');
    return ProcurementPurchaseOrderRow(
      id: asString(json['id'], 'purchaseOrder.id'),
      name: asString(json['name'], 'purchaseOrder.name'),
      code: asString(json['code'], 'purchaseOrder.code'),
      referenceId: asString(json['referenceId'], 'purchaseOrder.referenceId'),
      status: asString(json['status'], 'purchaseOrder.status'),
      supplierName: asString(
        details['supplierName'],
        'purchaseOrder.supplierName',
      ),
      amountMinor: asInt(details['amountMinor'], 'purchaseOrder.amountMinor'),
      createdAt: DateTime.parse(
        asString(json['createdAt'], 'purchaseOrder.createdAt'),
      ),
    );
  }

  final String id;
  final String name;
  final String code;
  final String referenceId;
  final String status;
  final String supplierName;
  final int amountMinor;
  final DateTime createdAt;
}

class ProcurementGoodsReceiptRow {
  const ProcurementGoodsReceiptRow({
    required this.id,
    required this.name,
    required this.purchaseOrderId,
    required this.status,
    required this.inventoryItemId,
    required this.quantity,
    required this.createdAt,
  });

  factory ProcurementGoodsReceiptRow.fromJson(Json json) {
    final details = _details(json, 'goodsReceipt.details');
    return ProcurementGoodsReceiptRow(
      id: asString(json['id'], 'goodsReceipt.id'),
      name: asString(json['name'], 'goodsReceipt.name'),
      purchaseOrderId: asString(
        json['purchaseOrderId'],
        'goodsReceipt.purchaseOrderId',
      ),
      status: asString(json['status'], 'goodsReceipt.status'),
      inventoryItemId: asString(
        details['inventoryItemId'],
        'goodsReceipt.inventoryItemId',
      ),
      quantity: asInt(details['quantity'], 'goodsReceipt.quantity'),
      createdAt: DateTime.parse(
        asString(json['createdAt'], 'goodsReceipt.createdAt'),
      ),
    );
  }

  final String id;
  final String name;
  final String purchaseOrderId;
  final String status;
  final String inventoryItemId;
  final int quantity;
  final DateTime createdAt;
}

class FacilityBookingRow {
  const FacilityBookingRow({
    required this.id,
    required this.name,
    required this.status,
    required this.startsAt,
    required this.endsAt,
    required this.purpose,
  });

  factory FacilityBookingRow.fromJson(Json json) {
    final details = _details(json, 'facilityBooking.details');
    return FacilityBookingRow(
      id: asString(json['id'], 'facilityBooking.id'),
      name: asString(json['name'], 'facilityBooking.name'),
      status: asString(json['status'], 'facilityBooking.status'),
      startsAt: DateTime.parse(
        asString(details['startsAt'], 'facilityBooking.startsAt'),
      ),
      endsAt: DateTime.parse(
        asString(details['endsAt'], 'facilityBooking.endsAt'),
      ),
      purpose: asString(details['purpose'], 'facilityBooking.purpose'),
    );
  }

  final String id;
  final String name;
  final String status;
  final DateTime startsAt;
  final DateTime endsAt;
  final String purpose;
}

class FacilityMaintenanceRow {
  const FacilityMaintenanceRow({
    required this.id,
    required this.name,
    required this.status,
    required this.facilityName,
    required this.priority,
    required this.details,
    required this.createdAt,
  });

  factory FacilityMaintenanceRow.fromJson(Json json) {
    final details = _details(json, 'facilityMaintenance.details');
    return FacilityMaintenanceRow(
      id: asString(json['id'], 'facilityMaintenance.id'),
      name: asString(json['name'], 'facilityMaintenance.name'),
      status: asString(json['status'], 'facilityMaintenance.status'),
      facilityName: asString(
        details['facilityName'],
        'facilityMaintenance.facilityName',
      ),
      priority: asString(details['priority'], 'facilityMaintenance.priority'),
      details: asString(details['details'], 'facilityMaintenance.details'),
      createdAt: DateTime.parse(
        asString(json['createdAt'], 'facilityMaintenance.createdAt'),
      ),
    );
  }

  final String id;
  final String name;
  final String status;
  final String facilityName;
  final String priority;
  final String details;
  final DateTime createdAt;
}

class FacilityComplaintRow {
  const FacilityComplaintRow({
    required this.id,
    required this.name,
    required this.status,
    required this.facilityName,
    required this.details,
    required this.createdAt,
  });

  factory FacilityComplaintRow.fromJson(Json json) {
    final details = _details(json, 'facilityComplaint.details');
    return FacilityComplaintRow(
      id: asString(json['id'], 'facilityComplaint.id'),
      name: asString(json['name'], 'facilityComplaint.name'),
      status: asString(json['status'], 'facilityComplaint.status'),
      facilityName: asString(
        details['facilityName'],
        'facilityComplaint.facilityName',
      ),
      details: asString(details['details'], 'facilityComplaint.details'),
      createdAt: DateTime.parse(
        asString(json['createdAt'], 'facilityComplaint.createdAt'),
      ),
    );
  }

  final String id;
  final String name;
  final String status;
  final String facilityName;
  final String details;
  final DateTime createdAt;
}

class HostelRoomRow {
  const HostelRoomRow({
    required this.id,
    required this.building,
    required this.roomNumber,
    required this.capacity,
    required this.occupancy,
    required this.available,
    this.floor,
  });

  factory HostelRoomRow.fromJson(Json json) => HostelRoomRow(
    id: asString(json['id'], 'hostelRoom.id'),
    building: asString(json['building'], 'hostelRoom.building'),
    roomNumber: asString(json['roomNumber'], 'hostelRoom.roomNumber'),
    capacity: asInt(json['capacity'], 'hostelRoom.capacity'),
    occupancy: asInt(json['occupancy'], 'hostelRoom.occupancy'),
    available: asInt(json['available'], 'hostelRoom.available'),
    floor: json['floor'] as String?,
  );

  final String id;
  final String building;
  final String roomNumber;
  final int capacity;
  final int occupancy;
  final int available;
  final String? floor;
}

class HostelBedRow {
  const HostelBedRow({
    required this.id,
    required this.code,
    required this.name,
    required this.roomId,
    required this.building,
    required this.roomNumber,
    required this.status,
  });

  factory HostelBedRow.fromJson(Json json) => HostelBedRow(
    id: asString(json['id'], 'hostelBed.id'),
    code: asString(json['code'], 'hostelBed.code'),
    name: asString(json['name'], 'hostelBed.name'),
    roomId: asString(json['roomId'], 'hostelBed.roomId'),
    building: asString(json['building'], 'hostelBed.building'),
    roomNumber: asString(json['roomNumber'], 'hostelBed.roomNumber'),
    status: asString(json['status'], 'hostelBed.status'),
  );

  final String id;
  final String code;
  final String name;
  final String roomId;
  final String building;
  final String roomNumber;
  final String status;
}

class HostelStudentOption {
  const HostelStudentOption({required this.id, required this.name});

  factory HostelStudentOption.fromJson(Json json) => HostelStudentOption(
    id: asString(json['id'], 'hostelStudent.id'),
    name: asString(json['name'], 'hostelStudent.name'),
  );

  final String id;
  final String name;
}

class HostelAllotmentRow {
  const HostelAllotmentRow({
    required this.id,
    required this.studentName,
    required this.building,
    required this.roomNumber,
    required this.bedCode,
    required this.allottedOn,
    required this.status,
    this.checkedOutOn,
  });

  factory HostelAllotmentRow.fromJson(Json json) => HostelAllotmentRow(
    id: asString(json['id'], 'hostelAllotment.id'),
    studentName:
        '${asString(json['studentName'], 'hostelAllotment.studentName')} '
        '${asString(json['studentLastName'], 'hostelAllotment.studentLastName')}',
    building: asString(json['building'], 'hostelAllotment.building'),
    roomNumber: asString(json['roomNumber'], 'hostelAllotment.roomNumber'),
    bedCode: asString(json['bedCode'], 'hostelAllotment.bedCode'),
    allottedOn: DateTime.parse(
      asString(json['allottedOn'], 'hostelAllotment.allottedOn'),
    ),
    checkedOutOn: json['checkedOutOn'] == null
        ? null
        : DateTime.parse(
            asString(json['checkedOutOn'], 'hostelAllotment.checkedOutOn'),
          ),
    status: asString(json['status'], 'hostelAllotment.status'),
  );

  final String id;
  final String studentName;
  final String building;
  final String roomNumber;
  final String bedCode;
  final DateTime allottedOn;
  final DateTime? checkedOutOn;
  final String status;
}

class CanteenMenuRow {
  const CanteenMenuRow({
    required this.id,
    required this.name,
    required this.priceMinor,
    required this.status,
  });

  factory CanteenMenuRow.fromJson(Json json) {
    final details = _details(json, 'canteenMenu.details');
    return CanteenMenuRow(
      id: asString(json['id'], 'canteenMenu.id'),
      name: asString(json['name'], 'canteenMenu.name'),
      priceMinor: asInt(details['priceMinor'], 'canteenMenu.priceMinor'),
      status: asString(json['status'], 'canteenMenu.status'),
    );
  }

  final String id;
  final String name;
  final int priceMinor;
  final String status;
}

class CanteenStudentOption {
  const CanteenStudentOption({required this.id, required this.name});

  factory CanteenStudentOption.fromJson(Json json) => CanteenStudentOption(
    id: asString(json['id'], 'canteenStudent.id'),
    name: asString(json['name'], 'canteenStudent.name'),
  );

  final String id;
  final String name;
}

class CanteenTransactionRow {
  const CanteenTransactionRow({
    required this.id,
    required this.name,
    required this.status,
    required this.menuId,
    required this.studentId,
    required this.quantity,
    required this.priceMinor,
    required this.createdAt,
  });

  factory CanteenTransactionRow.fromJson(Json json) {
    final details = _details(json, 'canteenTransaction.details');
    return CanteenTransactionRow(
      id: asString(json['id'], 'canteenTransaction.id'),
      name: asString(json['name'], 'canteenTransaction.name'),
      status: asString(json['status'], 'canteenTransaction.status'),
      menuId: asString(details['menuId'], 'canteenTransaction.menuId'),
      studentId: asString(details['studentId'], 'canteenTransaction.studentId'),
      quantity: asInt(details['quantity'], 'canteenTransaction.quantity'),
      priceMinor: asInt(details['priceMinor'], 'canteenTransaction.priceMinor'),
      createdAt: DateTime.parse(
        asString(json['createdAt'], 'canteenTransaction.createdAt'),
      ),
    );
  }

  final String id;
  final String name;
  final String status;
  final String menuId;
  final String studentId;
  final int quantity;
  final int priceMinor;
  final DateTime createdAt;
}
