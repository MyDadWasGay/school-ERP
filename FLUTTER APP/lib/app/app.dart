import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config/app_config.dart';
import '../features/auth/presentation/configuration_screen.dart';
import 'router/app_router.dart';
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
    return MaterialApp.router(
      title: 'School ERP',
      debugShowCheckedModeBanner: false,
      theme: buildErpTheme(),
      routerConfig: ref.watch(appRouterProvider),
    );
  }
}
