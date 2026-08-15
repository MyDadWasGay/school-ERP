import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../../shared/widgets/erp_states.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text(
          'You will need to sign in again to access school information on this device.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await ref.read(pushNotificationServiceProvider).unregisterCurrentDevice();
    } on Object {
      // Device revocation is best effort; it must not block local sign-out.
    }
    try {
      await ref.read(apiClientProvider).revokeSession();
    } on Object {
      // Local sign-out must remain available during an outage. The server also
      // rejects expired/revoked ID tokens on every protected request.
    }
    await ref.read(campusStoreProvider).clear();
    ref.read(currentCampusIdProvider.notifier).state = null;
    ref.read(selectedStudentIdProvider.notifier).state = null;
    await ref.read(authGatewayProvider).signOut();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    return session.when(
      loading: () => const ErpLoadingList(),
      error: (error, stack) => ErpErrorState(
        error: error,
        onRetry: () => ref.invalidate(sessionProvider),
      ),
      data: (user) => ListView(
        padding: const EdgeInsets.all(ErpSpacing.lg),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(ErpSpacing.xl),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 34,
                    child: Text(
                      _initials(user.displayName),
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  const SizedBox(height: ErpSpacing.md),
                  Text(
                    user.displayName,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: ErpSpacing.xs),
                  Text(
                    user.email,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: ErpSpacing.xs),
                  Text(
                    user.role.replaceAll('_', ' '),
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: ErpSpacing.lg),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.apartment_outlined),
                  title: const Text('Organization'),
                  subtitle: Text(user.organization.name),
                ),
                const Divider(height: 1),
                if (user.campuses.length > 1)
                  Padding(
                    padding: const EdgeInsets.all(ErpSpacing.lg),
                    child: DropdownButtonFormField<String>(
                      initialValue: user.campus?.id,
                      decoration: const InputDecoration(
                        labelText: 'Active campus',
                        prefixIcon: Icon(Icons.location_city_outlined),
                      ),
                      items: [
                        for (final campus in user.campuses)
                          DropdownMenuItem(
                            value: campus.id,
                            child: Text(campus.name),
                          ),
                      ],
                      onChanged: session.isRefreshing
                          ? null
                          : (id) {
                              if (id == null || id == user.campus?.id) return;
                              ref
                                  .read(sessionProvider.notifier)
                                  .selectCampus(
                                    user.campuses.firstWhere(
                                      (campus) => campus.id == id,
                                    ),
                                  );
                            },
                    ),
                  )
                else
                  ListTile(
                    leading: const Icon(Icons.location_city_outlined),
                    title: const Text('Campus'),
                    subtitle: Text(
                      user.campus?.name ?? 'All authorized campuses',
                    ),
                  ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.verified_user_outlined),
                  title: const Text('Access'),
                  subtitle: Text(
                    '${user.permissions.length} server-authorized capabilities',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: ErpSpacing.xl),
          OutlinedButton.icon(
            onPressed: () => _logout(context, ref),
            icon: const Icon(Icons.logout),
            label: const Text('Sign out'),
          ),
          const SizedBox(height: ErpSpacing.md),
          Text(
            'School ERP for Android',
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  String _initials(String name) {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .take(2);
    return parts.map((part) => part[0].toUpperCase()).join();
  }
}
