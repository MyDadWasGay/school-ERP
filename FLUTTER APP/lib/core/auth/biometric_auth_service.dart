import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BiometricAvailability {
  const BiometricAvailability({
    required this.supported,
    required this.enrolled,
  });

  final bool supported;
  final bool enrolled;

  bool get canUnlock => supported && enrolled;
}

class BiometricAuthService {
  BiometricAuthService({
    LocalAuthentication? authentication,
    SharedPreferencesAsync? preferences,
  }) : _authentication = authentication ?? LocalAuthentication(),
       _preferences = preferences ?? SharedPreferencesAsync();

  final LocalAuthentication _authentication;
  final SharedPreferencesAsync _preferences;

  Future<BiometricAvailability> availability() async {
    try {
      final supported =
          await _authentication.canCheckBiometrics ||
          await _authentication.isDeviceSupported();
      final enrolled = (await _authentication.getAvailableBiometrics()).isNotEmpty;
      return BiometricAvailability(supported: supported, enrolled: enrolled);
    } on Object {
      return const BiometricAvailability(supported: false, enrolled: false);
    }
  }

  Future<bool> isEnabled(String accountKey) async =>
      await _preferences.getBool(_storageKey(accountKey)) ?? false;

  Future<bool> enable(String accountKey) async {
    final available = await availability();
    if (!available.canUnlock) return false;
    final authenticated = await authenticate();
    if (!authenticated) return false;
    await _preferences.setBool(_storageKey(accountKey), true);
    return true;
  }

  Future<void> disable(String accountKey) async {
    await _preferences.remove(_storageKey(accountKey));
  }

  Future<bool> authenticate() async => _authentication.authenticate(
    localizedReason: 'Unlock School ERP securely.',
    biometricOnly: false,
    persistAcrossBackgrounding: true,
  );

  String _storageKey(String accountKey) =>
      'biometric_unlock_v1:${Uri.encodeComponent(accountKey)}';
}

String biometricAccountKey(String tenantId, String userId) => '$tenantId:$userId';
