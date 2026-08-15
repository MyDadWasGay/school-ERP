import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../shared/models/attendance_models.dart';

class AttendanceDraftStore {
  AttendanceDraftStore(this._preferences);

  static const _key = 'attendance_drafts_v1';
  final SharedPreferencesAsync _preferences;

  Future<List<AttendanceDraft>> read({
    required String userId,
    required String campusId,
  }) async {
    final drafts = await _readAll();
    return drafts
        .where((draft) => draft.userId == userId && draft.campusId == campusId)
        .toList(growable: false);
  }

  Future<void> upsert(AttendanceDraft draft) async {
    final drafts = await _readAll();
    final index = drafts.indexWhere((item) => item.id == draft.id);
    if (index == -1) {
      drafts.add(draft);
    } else {
      drafts[index] = draft;
    }
    await _write(drafts);
  }

  Future<void> remove(String id) async {
    final drafts = await _readAll();
    drafts.removeWhere((draft) => draft.id == id);
    await _write(drafts);
  }

  Future<List<AttendanceDraft>> _readAll() async {
    final raw = await _preferences.getString(_key);
    if (raw == null || raw.trim().isEmpty) return [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return [];
      return decoded
          .whereType<Map>()
          .map((item) {
            try {
              return AttendanceDraft.fromJson(
                item.map((key, value) => MapEntry(key.toString(), value)),
              );
            } on Object {
              return null;
            }
          })
          .whereType<AttendanceDraft>()
          .toList(growable: true);
    } on Object {
      return [];
    }
  }

  Future<void> _write(List<AttendanceDraft> drafts) async {
    if (drafts.isEmpty) {
      await _preferences.remove(_key);
      return;
    }
    await _preferences.setString(
      _key,
      jsonEncode(drafts.map((draft) => draft.toJson()).toList(growable: false)),
    );
  }
}
