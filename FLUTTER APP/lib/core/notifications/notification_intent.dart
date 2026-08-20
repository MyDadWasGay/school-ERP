import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../shared/models/identity_models.dart';

class NotificationIntent {
  const NotificationIntent({
    required this.type,
    required this.route,
    this.entityId,
    this.tenantId,
    this.campusId,
  });

  factory NotificationIntent.fromJson(Json json) {
    final intent = tryParse(json);
    if (intent == null) {
      throw const FormatException('Invalid notification intent.');
    }
    return intent;
  }

  static NotificationIntent? tryParse(Map<dynamic, dynamic> data) {
    final type = _value(data, 'type');
    final route = _value(data, 'route');
    if (type == null || route == null || type.isEmpty || route.isEmpty) {
      return null;
    }
    final uri = Uri.tryParse(route);
    if (uri == null || uri.hasScheme || uri.hasAuthority || !uri.path.startsWith('/')) {
      return null;
    }
    return NotificationIntent(
      type: type,
      route: route,
      entityId: _value(data, 'entity_id') ?? _value(data, 'entityId'),
      tenantId: _value(data, 'tenant_id') ?? _value(data, 'tenantId'),
      campusId: _value(data, 'campus_id') ?? _value(data, 'campusId'),
    );
  }

  Json toJson() => {
    'type': type,
    'route': route,
    if (entityId != null) 'entityId': entityId,
    if (tenantId != null) 'tenantId': tenantId,
    if (campusId != null) 'campusId': campusId,
  };

  String? resolveRoute() {
    final path = Uri.tryParse(route)?.path;
    if (path == null) return null;
    const allowed = {
      '/assignments',
      '/approvals',
      '/attendance',
      '/finance',
      '/leave',
      '/notices',
      '/transport',
      '/exams',
      '/admissions',
      '/notifications',
    };
    for (final base in allowed) {
      if (path == base || path.startsWith('$base/')) {
        return _withEntity(base, entityId ?? _pathEntity(path, base));
      }
    }
    const byType = {
      'assignment': '/assignments',
      'homework': '/assignments',
      'approval': '/approvals',
      'attendance': '/attendance',
      'fee': '/finance',
      'notice': '/notices',
      'transport': '/transport',
      'exam': '/exams',
      'admission': '/admissions',
      'leave': '/leave',
    };
    return _withEntity(byType[type] ?? '/notifications', entityId);
  }

  String _withEntity(String base, String? id) =>
      id == null || id.isEmpty ? base : '$base?id=${Uri.encodeComponent(id)}';

  String? _pathEntity(String path, String base) {
    final suffix = path.substring(base.length).replaceFirst('/', '');
    return suffix.isEmpty ? null : suffix;
  }

  bool isAllowedFor(CurrentUser user) {
    if (tenantId != null && tenantId != user.organization.id) return false;
    if (campusId == null) return true;
    return user.campus?.id == campusId ||
        user.campuses.any((campus) => campus.id == campusId);
  }

  final String type;
  final String route;
  final String? entityId;
  final String? tenantId;
  final String? campusId;

  static String? _value(Map<dynamic, dynamic> data, String key) {
    final value = data[key]?.toString().trim();
    return value == null || value.isEmpty ? null : value;
  }
}

class NotificationIntentStore {
  const NotificationIntentStore(this._preferences);

  static const _key = 'pending_notification_intent_v1';
  final SharedPreferencesAsync _preferences;

  Future<void> save(NotificationIntent intent) async {
    await _preferences.setString(_key, jsonEncode(intent.toJson()));
  }

  Future<NotificationIntent?> take() async {
    final raw = await _preferences.getString(_key);
    await _preferences.remove(_key);
    if (raw == null || raw.trim().isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return null;
      return NotificationIntent.tryParse(decoded);
    } on Object {
      return null;
    }
  }
}
