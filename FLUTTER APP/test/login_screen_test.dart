import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:school_erp_mobile/core/auth/auth_gateway.dart';
import 'package:school_erp_mobile/core/providers.dart';
import 'package:school_erp_mobile/features/auth/presentation/login_screen.dart';

void main() {
  testWidgets('login remains usable on a small Android viewport', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final gateway = _FakeAuthGateway();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [authGatewayProvider.overrideWithValue(gateway)],
        child: const MaterialApp(home: LoginScreen()),
      ),
    );

    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('Forgot password?'), findsOneWidget);
    await tester.tap(find.text('Sign in'));
    await tester.pump();
    expect(find.text('Enter a valid email address.'), findsOneWidget);
    expect(find.text('Enter your password.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

class _FakeAuthGateway implements AuthGateway {
  @override
  Stream<User?> authStateChanges() => Stream<User?>.value(null);
  @override
  User? get currentUser => null;
  @override
  Future<String?> getIdToken({bool forceRefresh = false}) async => null;
  @override
  Future<void> sendPasswordReset(String email) async {}
  @override
  Future<void> signIn({
    required String email,
    required String password,
  }) async {}
  @override
  Future<void> signOut() async {}
}
