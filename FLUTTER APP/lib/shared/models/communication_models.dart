import 'identity_models.dart';

class NoticeRow {
  const NoticeRow({
    required this.id,
    required this.title,
    required this.body,
    required this.audience,
    required this.status,
    this.publishedAt,
  });

  factory NoticeRow.fromJson(Json json) => NoticeRow(
    id: asString(json['id'], 'notice.id'),
    title: asString(json['title'], 'notice.title'),
    body: asString(json['body'], 'notice.body'),
    audience: asString(json['audience'], 'notice.audience'),
    status: asString(json['status'], 'notice.status'),
    publishedAt: json['publishedAt'] == null
        ? null
        : DateTime.parse(asString(json['publishedAt'], 'notice.publishedAt')),
  );

  final String id;
  final String title;
  final String body;
  final String audience;
  final String status;
  final DateTime? publishedAt;
}

class CommunicationAudience {
  const CommunicationAudience({required this.type, this.role, this.userIds = const []});

  factory CommunicationAudience.fromJson(Json json) => CommunicationAudience(
    type: asString(json['type'], 'message.audience.type'),
    role: json['role'] as String?,
    userIds: (json['userIds'] is List)
        ? (json['userIds']! as List).whereType<String>().toList(growable: false)
        : const [],
  );

  final String type;
  final String? role;
  final List<String> userIds;
}

class CommunicationRecipient {
  const CommunicationRecipient({required this.id, required this.name, required this.role});

  factory CommunicationRecipient.fromJson(Json json) => CommunicationRecipient(
    id: asString(json['id'], 'recipient.id'),
    name: asString(json['name'], 'recipient.name'),
    role: asString(json['role'], 'recipient.role'),
  );

  final String id;
  final String name;
  final String role;
}

class CommunicationMessageRow {
  const CommunicationMessageRow({
    required this.id,
    required this.subject,
    required this.body,
    required this.status,
    required this.audience,
    this.createdAt,
    this.publishedAt,
  });

  factory CommunicationMessageRow.fromJson(Json json) =>
      CommunicationMessageRow(
        id: asString(json['id'], 'message.id'),
        subject: asString(json['subject'], 'message.subject'),
        body: asString(json['body'], 'message.body'),
        status: asString(json['status'], 'message.status'),
        audience: CommunicationAudience.fromJson(
          asJson(json['audience'], 'message.audience'),
        ),
        createdAt: _date(json['createdAt'], 'message.createdAt'),
        publishedAt: _date(json['publishedAt'], 'message.publishedAt'),
      );

  final String id;
  final String subject;
  final String body;
  final String status;
  final CommunicationAudience audience;
  final DateTime? createdAt;
  final DateTime? publishedAt;

  static DateTime? _date(Object? value, String field) =>
      value == null ? null : DateTime.parse(asString(value, field));
}
