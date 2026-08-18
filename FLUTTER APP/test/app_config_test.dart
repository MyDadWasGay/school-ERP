import 'package:flutter_test/flutter_test.dart';
import 'package:school_erp_mobile/core/config/app_config.dart';

void main() {
  test('adds the versioned API path to an origin', () {
    expect(
      AppConfig.normalizeApiBaseUrl('https://api.example.com/'),
      'https://api.example.com/api/v1',
    );
  });

  test('preserves a versioned API path and removes trailing slash', () {
    expect(
      AppConfig.normalizeApiBaseUrl('https://api.example.com/api/v1/'),
      'https://api.example.com/api/v1',
    );
  });

  test('rejects a non-API path', () {
    expect(
      () => AppConfig.normalizeApiBaseUrl('https://web.example.com/app'),
      throwsStateError,
    );
  });

  test('rejects query strings and fragments', () {
    expect(
      () => AppConfig.normalizeApiBaseUrl('https://api.example.com?env=prod'),
      throwsStateError,
    );
  });
}
