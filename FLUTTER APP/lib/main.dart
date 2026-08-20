import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';
import 'core/config/app_config.dart';
import 'core/notifications/push_notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final config = AppConfig.fromEnvironment();
  Object? bootstrapError;
  if (config.hasFirebaseConfiguration) {
    try {
      await Firebase.initializeApp(options: config.firebaseOptions);
    } on Object catch (error) {
      bootstrapError = error;
    }
    if (Firebase.apps.isNotEmpty) {
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    }
  }
  runApp(
    ProviderScope(
      overrides: [
        appConfigProvider.overrideWithValue(config),
        bootstrapErrorProvider.overrideWithValue(bootstrapError),
      ],
      child: const SchoolErpApp(),
    ),
  );
}
