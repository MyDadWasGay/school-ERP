import 'dart:convert';

import 'identity_models.dart';

Map<String, Object?> _assetDetails(Json json, String field) {
  final value = json['detailsJson'];
  if (value is Map) return asJson(value, field);
  if (value is String && value.trim().isNotEmpty) {
    try {
      return asJson(jsonDecode(value), field);
    } on FormatException {
      return const {};
    } on JsonUnsupportedObjectError {
      return const {};
    }
  }
  return const {};
}

String? _optionalString(Object? value) =>
    value is String && value.isNotEmpty ? value : null;

int _optionalInt(Object? value) => value is num ? value.toInt() : 0;

class AssetRow {
  const AssetRow({
    required this.id,
    required this.name,
    required this.code,
    required this.category,
    required this.status,
    required this.acquisitionMinor,
    required this.bookValueMinor,
    required this.usefulLifeMonths,
    this.serialNumber,
    this.createdAt,
  });

  factory AssetRow.fromJson(Json json) {
    final details = _assetDetails(json, 'asset.details');
    return AssetRow(
      id: asString(json['id'], 'asset.id'),
      name: asString(json['name'], 'asset.name'),
      code: asString(json['code'], 'asset.code'),
      category: asString(details['category'], 'asset.category'),
      status: asString(json['status'], 'asset.status'),
      acquisitionMinor: _optionalInt(details['acquisitionMinor']),
      bookValueMinor: _optionalInt(details['bookValueMinor']),
      usefulLifeMonths: _optionalInt(details['usefulLifeMonths']),
      serialNumber: _optionalString(details['serialNumber']),
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(asString(json['createdAt'], 'asset.createdAt')),
    );
  }

  final String id;
  final String name;
  final String code;
  final String category;
  final String status;
  final int acquisitionMinor;
  final int bookValueMinor;
  final int usefulLifeMonths;
  final String? serialNumber;
  final DateTime? createdAt;
}

class AssetAssignmentRow {
  const AssetAssignmentRow({
    required this.id,
    required this.assetId,
    required this.assetName,
    required this.assetCode,
    required this.assigneeType,
    required this.assigneeId,
    required this.status,
    required this.effectiveAt,
    this.assigneeName,
    this.notes,
  });

  factory AssetAssignmentRow.fromJson(Json json) {
    final details = _assetDetails(json, 'assetAssignment.details');
    return AssetAssignmentRow(
      id: asString(json['id'], 'assetAssignment.id'),
      assetId: asString(json['assetId'], 'assetAssignment.assetId'),
      assetName: asString(json['assetName'], 'assetAssignment.assetName'),
      assetCode: asString(json['assetCode'], 'assetAssignment.assetCode'),
      assigneeType: asString(
        json['assigneeType'],
        'assetAssignment.assigneeType',
      ),
      assigneeId: asString(json['assigneeId'], 'assetAssignment.assigneeId'),
      status: asString(json['status'], 'assetAssignment.status'),
      effectiveAt: DateTime.parse(
        asString(json['effectiveAt'], 'assetAssignment.effectiveAt'),
      ),
      assigneeName: _optionalString(details['assigneeName']),
      notes: _optionalString(details['notes']),
    );
  }

  final String id;
  final String assetId;
  final String assetName;
  final String assetCode;
  final String assigneeType;
  final String assigneeId;
  final String status;
  final DateTime effectiveAt;
  final String? assigneeName;
  final String? notes;
}

class AssetMaintenanceRow {
  const AssetMaintenanceRow({
    required this.id,
    required this.assetId,
    required this.assetName,
    required this.title,
    required this.status,
    required this.createdAt,
    required this.costMinor,
    this.notes,
  });

  factory AssetMaintenanceRow.fromJson(Json json) {
    final details = _assetDetails(json, 'assetMaintenance.details');
    return AssetMaintenanceRow(
      id: asString(json['id'], 'assetMaintenance.id'),
      assetId: asString(json['assetId'], 'assetMaintenance.assetId'),
      assetName: asString(json['assetName'], 'assetMaintenance.assetName'),
      title: asString(json['title'], 'assetMaintenance.title'),
      status: asString(json['status'], 'assetMaintenance.status'),
      createdAt: DateTime.parse(
        asString(json['createdAt'], 'assetMaintenance.createdAt'),
      ),
      costMinor: _optionalInt(details['costMinor']),
      notes: _optionalString(details['notes']),
    );
  }

  final String id;
  final String assetId;
  final String assetName;
  final String title;
  final String status;
  final DateTime createdAt;
  final int costMinor;
  final String? notes;
}

class AssetDepreciationRow {
  const AssetDepreciationRow({
    required this.id,
    required this.assetId,
    required this.assetName,
    required this.period,
    required this.status,
    required this.effectiveAt,
    required this.amountMinor,
    required this.bookValueBeforeMinor,
    required this.bookValueAfterMinor,
  });

  factory AssetDepreciationRow.fromJson(Json json) {
    final details = _assetDetails(json, 'assetDepreciation.details');
    return AssetDepreciationRow(
      id: asString(json['id'], 'assetDepreciation.id'),
      assetId: asString(json['assetId'], 'assetDepreciation.assetId'),
      assetName: asString(json['assetName'], 'assetDepreciation.assetName'),
      period: asString(json['period'], 'assetDepreciation.period'),
      status: asString(json['status'], 'assetDepreciation.status'),
      effectiveAt: DateTime.parse(
        asString(json['effectiveAt'], 'assetDepreciation.effectiveAt'),
      ),
      amountMinor: _optionalInt(details['amountMinor']),
      bookValueBeforeMinor: _optionalInt(details['bookValueBeforeMinor']),
      bookValueAfterMinor: _optionalInt(details['bookValueAfterMinor']),
    );
  }

  final String id;
  final String assetId;
  final String assetName;
  final String period;
  final String status;
  final DateTime effectiveAt;
  final int amountMinor;
  final int bookValueBeforeMinor;
  final int bookValueAfterMinor;
}
