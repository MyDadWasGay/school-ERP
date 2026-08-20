import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';
import 'biometric_auth_service.dart';

class BiometricGate extends ConsumerStatefulWidget {
  const BiometricGate({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<BiometricGate> createState() => _BiometricGateState();
}

class _BiometricGateState extends ConsumerState<BiometricGate> {
  String? _accountKey;
  String? _unlockedAccountKey;
  String? _error;
  bool _checking = false;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).valueOrNull;
    if (user == null) {
      if (_accountKey != null || _unlockedAccountKey != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          setState(() {
            _accountKey = null;
            _unlockedAccountKey = null;
            _error = null;
            _checking = false;
          });
        });
      }
      return widget.child;
    }

    final accountKey = biometricAccountKey(user.organization.id, user.id);
    if (_accountKey != accountKey && !_checking) {
      _accountKey = accountKey;
      _error = null;
      _checking = true;
      unawaited(_check(accountKey));
    }
    if (_unlockedAccountKey == accountKey) return widget.child;
    return _BiometricLockScreen(
      checking: _checking,
      error: _error,
      onUnlock: _checking ? null : () => _check(accountKey),
      onSignOut: () async {
        await ref.read(biometricAuthServiceProvider).disable(accountKey);
        await ref.read(authGatewayProvider).signOut();
      },
    );
  }

  Future<void> _check(String accountKey) async {
    try {
      final service = ref.read(biometricAuthServiceProvider);
      final enabled = await service.isEnabled(accountKey);
      final unlocked = !enabled || await service.authenticate();
      if (!mounted || _accountKey != accountKey) return;
      setState(() {
        _checking = false;
        _error = unlocked ? null : 'Unlock was cancelled.';
        _unlockedAccountKey = unlocked ? accountKey : null;
      });
    } on Object {
      if (!mounted || _accountKey != accountKey) return;
      setState(() {
        _checking = false;
        _error = 'Biometric unlock is unavailable. Try again or sign out.';
      });
    }
  }
}

class _BiometricLockScreen extends StatelessWidget {
  const _BiometricLockScreen({
    required this.checking,
    required this.error,
    required this.onUnlock,
    required this.onSignOut,
  });

  final bool checking;
  final String? error;
  final VoidCallback? onUnlock;
  final Future<void> Function() onSignOut;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.fingerprint, size: 56),
              const SizedBox(height: 16),
              Text(
                'Unlock School ERP',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                error ?? 'Verify your device to continue.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: onUnlock,
                icon: checking
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.lock_open_outlined),
                label: Text(checking ? 'Checking…' : 'Unlock'),
              ),
              TextButton(
                onPressed: checking ? null : onSignOut,
                child: const Text('Sign out'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
