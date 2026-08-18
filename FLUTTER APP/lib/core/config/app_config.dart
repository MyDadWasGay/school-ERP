import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final appConfigProvider = Provider<AppConfig>(
  (ref) => throw StateError('AppConfig must be supplied during bootstrap.'),
);
final bootstrapErrorProvider = Provider<Object?>((ref) => null);

enum AppEnvironment { development, staging, production }

class AppConfig {
  static const apiPath = '/api/v1';

  const AppConfig({
    required this.environment,
    required this.apiBaseUrl,
    required this.firebaseApiKey,
    required this.firebaseAppId,
    required this.firebaseMessagingSenderId,
    required this.firebaseProjectId,
  });

  factory AppConfig.fromEnvironment() {
    const environmentName = String.fromEnvironment(
      'ERP_ENV',
      defaultValue: 'development',
    );
    final environment = AppEnvironment.values.firstWhere(
      (value) => value.name == environmentName,
      orElse: () => AppEnvironment.development,
    );
    const rawApiBaseUrl = String.fromEnvironment(
      'ERP_API_BASE_URL',
      defaultValue: 'http://10.0.2.2:3001/api/v1',
    );
    final apiBaseUrl = normalizeApiBaseUrl(rawApiBaseUrl);
    final uri = Uri.parse(apiBaseUrl);
    if (environment == AppEnvironment.production && uri.scheme != 'https') {
      throw StateError('Production ERP_API_BASE_URL must use HTTPS.');
    }
    return AppConfig(
      environment: environment,
      apiBaseUrl: apiBaseUrl,
      firebaseApiKey: const String.fromEnvironment('ERP_FIREBASE_API_KEY'),
      firebaseAppId: const String.fromEnvironment('ERP_FIREBASE_APP_ID'),
      firebaseMessagingSenderId: const String.fromEnvironment(
        'ERP_FIREBASE_MESSAGING_SENDER_ID',
      ),
      firebaseProjectId: const String.fromEnvironment(
        'ERP_FIREBASE_PROJECT_ID',
      ),
    );
  }

  static String normalizeApiBaseUrl(String rawValue) {
    final value = rawValue.trim();
    final uri = Uri.tryParse(value);
    final scheme = uri?.scheme.toLowerCase();
    if (uri == null ||
        !uri.hasScheme ||
        !uri.hasAuthority ||
        uri.host.isEmpty ||
        (scheme != 'http' && scheme != 'https')) {
      throw StateError('ERP_API_BASE_URL must be an absolute HTTP(S) URL.');
    }
    if (uri.userInfo.isNotEmpty || uri.hasQuery || uri.hasFragment) {
      throw StateError(
        'ERP_API_BASE_URL must not contain credentials, a query, or a fragment.',
      );
    }

    var path = uri.path.replaceFirst(RegExp(r'/+$'), '');
    if (path.isEmpty) path = apiPath;
    if (!path.endsWith(apiPath)) {
      throw StateError(
        'ERP_API_BASE_URL must be an API origin or end with $apiPath.',
      );
    }

    return uri.replace(path: path).toString();
  }

  final AppEnvironment environment;
  final String apiBaseUrl;
  final String firebaseApiKey;
  final String firebaseAppId;
  final String firebaseMessagingSenderId;
  final String firebaseProjectId;

  bool get hasFirebaseConfiguration =>
      firebaseApiKey.isNotEmpty &&
      firebaseAppId.isNotEmpty &&
      firebaseMessagingSenderId.isNotEmpty &&
      firebaseProjectId.isNotEmpty;

  FirebaseOptions get firebaseOptions => FirebaseOptions(
    apiKey: firebaseApiKey,
    appId: firebaseAppId,
    messagingSenderId: firebaseMessagingSenderId,
    projectId: firebaseProjectId,
  );
}
