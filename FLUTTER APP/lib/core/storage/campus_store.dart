import 'package:shared_preferences/shared_preferences.dart';

class CampusStore {
  CampusStore(this._preferences);
  static const _key = 'active_campus_id';
  final SharedPreferencesAsync _preferences;

  Future<String?> read() => _preferences.getString(_key);
  Future<void> write(String campusId) => _preferences.setString(_key, campusId);
  Future<void> clear() => _preferences.remove(_key);
}
