import 'package:flutter/material.dart';

import '../../../app/theme/app_theme.dart';

class ConfigurationScreen extends StatelessWidget {
  const ConfigurationScreen({super.key, this.bootstrapError});
  final Object? bootstrapError;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Padding(
            padding: const EdgeInsets.all(ErpSpacing.xl),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(ErpSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.admin_panel_settings_outlined,
                      size: 48,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(height: ErpSpacing.lg),
                    Text(
                      'App configuration required',
                      style: Theme.of(context).textTheme.headlineSmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: ErpSpacing.md),
                    const Text(
                      'This build does not contain Firebase credentials. Add the required Android dart-defines and rebuild. No secrets should be committed to the app.',
                      textAlign: TextAlign.center,
                    ),
                    if (bootstrapError != null) ...[
                      const SizedBox(height: ErpSpacing.md),
                      Text(
                        'Firebase could not start. Verify the build configuration.',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
