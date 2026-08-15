import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../api/api_client.dart';

class PushNotificationService {
  PushNotificationService(this._apiClient);

  final ApiClient _apiClient;
  StreamSubscription<String>? _tokenSubscription;
  String? _currentToken;

  Future<void> registerCurrentDevice() async {
    if (Firebase.apps.isEmpty) return;
    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission(alert: true, badge: true, sound: true);
    final token = await messaging.getToken();
    if (token != null && token.isNotEmpty) {
      _currentToken = token;
      await _register(token);
    }
    _tokenSubscription ??= messaging.onTokenRefresh.listen((nextToken) {
      _currentToken = nextToken;
      unawaited(_register(nextToken));
    });
  }

  Future<void> unregisterCurrentDevice() async {
    final token = _currentToken;
    if (token == null || token.isEmpty) return;
    await _apiClient.unregisterMobileDevice(token);
    _currentToken = null;
  }

  Future<void> dispose() async {
    await _tokenSubscription?.cancel();
    _tokenSubscription = null;
  }

  Future<void> _register(String token) async {
    try {
      await _apiClient.registerMobileDevice(
        token: token,
        platform: Platform.isIOS ? 'ios' : 'android',
      );
    } on Object catch (error) {
      // Push registration is retryable and must not prevent sign-in or API use.
      debugPrint('Mobile push registration failed: $error');
    }
  }
}
