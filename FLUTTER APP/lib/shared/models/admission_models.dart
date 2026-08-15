import 'identity_models.dart';

class AdmissionOption {
  const AdmissionOption({
    required this.id,
    required this.name,
    this.campusId,
    this.classId,
  });

  factory AdmissionOption.fromJson(Json json) => AdmissionOption(
    id: asString(json['id'], 'admissionOption.id'),
    name: asString(json['name'], 'admissionOption.name'),
    campusId: json['campusId'] as String?,
    classId: json['classId'] as String?,
  );

  final String id;
  final String name;
  final String? campusId;
  final String? classId;
}

class AdmissionOptions {
  const AdmissionOptions({
    required this.campuses,
    required this.academicYears,
    required this.classes,
    required this.sections,
    required this.enquiries,
  });

  factory AdmissionOptions.fromJson(Json json) => AdmissionOptions(
    campuses: _list(json['campuses'], 'admissionOptions.campuses'),
    academicYears: _list(
      json['academicYears'],
      'admissionOptions.academicYears',
    ),
    classes: _list(json['classes'], 'admissionOptions.classes'),
    sections: _list(json['sections'], 'admissionOptions.sections'),
    enquiries: _list(json['enquiries'], 'admissionOptions.enquiries'),
  );

  static List<AdmissionOption> _list(Object? value, String field) => asJsonList(
    value,
    field,
  ).map(AdmissionOption.fromJson).toList(growable: false);

  final List<AdmissionOption> campuses;
  final List<AdmissionOption> academicYears;
  final List<AdmissionOption> classes;
  final List<AdmissionOption> sections;
  final List<AdmissionOption> enquiries;
}

class AdmissionSeatMatrixRow {
  const AdmissionSeatMatrixRow({
    required this.classId,
    required this.className,
    required this.sectionId,
    required this.sectionName,
    required this.campusId,
    required this.capacity,
    required this.occupied,
    required this.available,
    required this.overbooked,
  });

  factory AdmissionSeatMatrixRow.fromJson(Json json) => AdmissionSeatMatrixRow(
    classId: asString(json['classId'], 'seatMatrix.classId'),
    className: asString(json['className'], 'seatMatrix.className'),
    sectionId: asString(json['sectionId'], 'seatMatrix.sectionId'),
    sectionName: asString(json['sectionName'], 'seatMatrix.sectionName'),
    campusId: asString(json['campusId'], 'seatMatrix.campusId'),
    capacity: asInt(json['capacity'], 'seatMatrix.capacity'),
    occupied: asInt(json['occupied'], 'seatMatrix.occupied'),
    available: asInt(json['available'], 'seatMatrix.available'),
    overbooked: json['overbooked'] == true,
  );

  final String classId;
  final String className;
  final String sectionId;
  final String sectionName;
  final String campusId;
  final int capacity;
  final int occupied;
  final int available;
  final bool overbooked;
}
