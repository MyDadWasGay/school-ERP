import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final appConfigProvider = Provider<AppConfig>(
  (ref) => throw StateError('AppConfig must be supplied during bootstrap.'),
);
final bootstrapErrorProvider = Provider<Object?>((ref) => null);

enum AppEnvironment { development, staging, production }

class AppConfig {
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
    const apiBaseUrl = String.fromEnvironment(
      'ERP_API_BASE_URL',
      defaultValue: 'http://10.0.2.2:3001/api/v1',
    );
    final uri = Uri.tryParse(apiBaseUrl);
    if (uri == null || !uri.hasScheme || !uri.hasAuthority) {
      throw StateError('ERP_API_BASE_URL must be an absolute URL.');
    }
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
