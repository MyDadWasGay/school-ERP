import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config/app_config.dart';
import '../core/auth/biometric_gate.dart';
import '../core/providers.dart';
import '../features/auth/presentation/configuration_screen.dart';
import 'router/app_router.dart';
import 'router/route_permissions.dart';
import 'theme/app_theme.dart';

class SchoolErpApp extends ConsumerWidget {
  const SchoolErpApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);
    final bootstrapError = ref.watch(bootstrapErrorProvider);
    if (!config.hasFirebaseConfiguration || bootstrapError != null) {
      return MaterialApp(
        title: 'School ERP',
        debugShowCheckedModeBanner: false,
        theme: buildErpTheme(),
        home: ConfigurationScreen(bootstrapError: bootstrapError),
      );
    }
    final router = ref.watch(appRouterProvider);
    ref.listen(notificationIntentProvider, (_, next) {
      final intent = next.valueOrNull;
      if (intent == null) return;
      final user = ref.read(sessionProvider).valueOrNull;
      if (user == null) {
        unawaited(
          ref.read(pushNotificationServiceProvider).savePendingIntent(intent),
        );
        return;
      }
      final target = intent.resolveRoute();
      if (target == null ||
          !intent.isAllowedFor(user) ||
          !canAccessPath(target, user)) {
        return;
      }
      router.go(target);
    });
    ref.listen(sessionProvider, (_, next) {
      if (next.hasValue) {
        unawaited(
          ref.read(pushNotificationServiceProvider).replayPendingIntent(),
        );
      }
    });
    return MaterialApp.router(
      title: 'School ERP',
      debugShowCheckedModeBanner: false,
      theme: buildErpTheme(),
      routerConfig: router,
      builder: (context, child) => BiometricGate(
        child: child ?? const SizedBox.shrink(),
      ),
    );
  }
}
