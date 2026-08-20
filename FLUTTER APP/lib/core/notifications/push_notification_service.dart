import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import 'notification_intent.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  final intent = NotificationIntent.tryParse(message.data);
  if (intent == null) return;
  await NotificationIntentStore(SharedPreferencesAsync()).save(intent);
}

class PushNotificationService {
  PushNotificationService(
    this._apiClient, {
    NotificationIntentStore? intentStore,
  }) : _intentStore =
           intentStore ?? NotificationIntentStore(SharedPreferencesAsync());

  final ApiClient _apiClient;
  final NotificationIntentStore _intentStore;
  StreamSubscription<String>? _tokenSubscription;
  final _messageSubscriptions = <StreamSubscription<dynamic>>[];
  final _intentController = StreamController<NotificationIntent>.broadcast();
  bool _messageHandlersRegistered = false;
  String? _currentToken;

  Stream<NotificationIntent> get intents => _intentController.stream;

  Future<void> registerCurrentDevice() async {
    if (Firebase.apps.isEmpty) return;
    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission(alert: true, badge: true, sound: true);
    await _registerMessageHandlers(messaging);
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
    for (final subscription in _messageSubscriptions) {
      await subscription.cancel();
    }
    _messageSubscriptions.clear();
    await _intentController.close();
  }

  Future<void> savePendingIntent(NotificationIntent intent) =>
      _intentStore.save(intent);

  Future<void> replayPendingIntent() async {
    final intent = await _intentStore.take();
    if (intent != null) _intentController.add(intent);
  }

  Future<void> _registerMessageHandlers(FirebaseMessaging messaging) async {
    if (_messageHandlersRegistered) return;
    _messageHandlersRegistered = true;
    _messageSubscriptions.add(FirebaseMessaging.onMessage.listen(_emitMessage));
    _messageSubscriptions.add(
      FirebaseMessaging.onMessageOpenedApp.listen(_emitMessage),
    );
    try {
      final initialMessage = await messaging.getInitialMessage();
      final pendingIntent = await _intentStore.take();
      if (initialMessage != null) {
        _emitMessage(initialMessage);
      } else if (pendingIntent != null) {
        _intentController.add(pendingIntent);
      }
    } on Object catch (error) {
      debugPrint('Mobile notification initialization failed: $error');
    }
  }

  void _emitMessage(RemoteMessage message) {
    final intent = NotificationIntent.tryParse(message.data);
    if (intent != null) _intentController.add(intent);
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
