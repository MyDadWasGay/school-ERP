import 'package:firebase_auth/firebase_auth.dart';

abstract interface class AuthGateway {
  Stream<User?> authStateChanges();
  User? get currentUser;
  Future<void> signIn({required String email, required String password});
  Future<void> sendPasswordReset(String email);
  Future<void> signOut();
  Future<String?> getIdToken({bool forceRefresh = false});
}

class FirebaseAuthGateway implements AuthGateway {
  FirebaseAuthGateway(this._auth);
  final FirebaseAuth _auth;

  @override
  Stream<User?> authStateChanges() => _auth.authStateChanges();

  @override
  User? get currentUser => _auth.currentUser;

  @override
  Future<void> signIn({required String email, required String password}) async {
    final credential = await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    if (!(credential.user?.emailVerified ?? false)) {
      await _auth.signOut();
      throw const AuthException('Verify your email before signing in.');
    }
  }

  @override
  Future<void> sendPasswordReset(String email) =>
      _auth.sendPasswordResetEmail(email: email.trim());

  @override
  Future<void> signOut() => _auth.signOut();

  @override
  Future<String?> getIdToken({bool forceRefresh = false}) async =>
      _auth.currentUser?.getIdToken(forceRefresh);
}

class AuthException implements Exception {
  const AuthException(this.message);
  final String message;
  @override
  String toString() => message;
}

String authMessage(Object error) {
  if (error is AuthException) return error.message;
  if (error is FirebaseAuthException) {
    return switch (error.code) {
      'invalid-email' => 'Enter a valid email address.',
      'invalid-credential' ||
      'user-not-found' ||
      'wrong-password' => 'The email or password is incorrect.',
      'user-disabled' =>
        'This account has been disabled. Contact your school administrator.',
      'too-many-requests' => 'Too many attempts. Wait a moment and try again.',
      'network-request-failed' => 'Check your connection and try again.',
      _ => 'Sign in could not be completed. Please try again.',
    };
  }
  return 'Sign in could not be completed. Please try again.';
}
