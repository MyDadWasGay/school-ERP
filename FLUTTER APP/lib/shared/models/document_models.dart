import 'dart:typed_data';

class UploadableFile {
  const UploadableFile({
    required this.name,
    required this.size,
    required this.resourceType,
    required this.format,
    this.path,
    this.bytes,
  });

  final String name;
  final int size;
  final String resourceType;
  final String format;
  final String? path;
  final Uint8List? bytes;
}

class CloudinaryUploadSignature {
  const CloudinaryUploadSignature({
    required this.timestamp,
    required this.folder,
    required this.type,
    required this.allowedFormats,
    required this.signature,
    required this.apiKey,
    required this.cloudName,
  });

  factory CloudinaryUploadSignature.fromJson(
    Map<String, Object?> json,
  ) => CloudinaryUploadSignature(
    timestamp: json['timestamp'] is num
        ? (json['timestamp']! as num).toInt()
        : throw const FormatException('upload.timestamp must be an integer.'),
    folder: _string(json['folder'], 'upload.folder'),
    type: _string(json['type'], 'upload.type'),
    allowedFormats: _string(json['allowed_formats'], 'upload.allowed_formats'),
    signature: _string(json['signature'], 'upload.signature'),
    apiKey: _string(json['apiKey'], 'upload.apiKey'),
    cloudName: _string(json['cloudName'], 'upload.cloudName'),
  );

  final int timestamp;
  final String folder;
  final String type;
  final String allowedFormats;
  final String signature;
  final String apiKey;
  final String cloudName;

  static String _string(Object? value, String field) {
    if (value is String) return value;
    throw FormatException('$field must be a string.');
  }
}
