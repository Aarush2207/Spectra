import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// ─── Auth state ───────────────────────────────────────────────────────────────
enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final User? user;
  final String? errorMessage;
  final bool isLoading;

  const AuthState({
    this.status = AuthStatus.unknown,
    this.user,
    this.errorMessage,
    this.isLoading = false,
  });

  AuthState copyWith({
    AuthStatus? status,
    User? user,
    String? errorMessage,
    bool? isLoading,
  }) =>
      AuthState(
        status: status ?? this.status,
        user: user ?? this.user,
        errorMessage: errorMessage,
        isLoading: isLoading ?? this.isLoading,
      );
}

// ─── Auth notifier ────────────────────────────────────────────────────────────
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _init();
  }

  final _supabase = Supabase.instance.client;
  StreamSubscription<dynamic>? _authSub;

  void _init() {
    // Check current session
    final session = _supabase.auth.currentSession;
    if (session != null) {
      state = AuthState(
        status: AuthStatus.authenticated,
        user: _supabase.auth.currentUser,
      );
    } else {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }

    // Listen for auth changes
    _authSub = _supabase.auth.onAuthStateChange.listen((data) {
      final session = data.session;
      if (session != null) {
        state = AuthState(
          status: AuthStatus.authenticated,
          user: _supabase.auth.currentUser,
        );
      } else {
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    });
  }

  // ─── Email sign up ──────────────────────────────────────────────────────────
  Future<void> signUp({
    required String email,
    required String password,
    String? displayName,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _supabase.auth.signUp(
        email: email,
        password: password,
        data: displayName != null ? {'display_name': displayName} : null,
      );

      if (response.user != null) {
        state = AuthState(
          status: AuthStatus.authenticated,
          user: response.user,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Sign up succeeded. Please check your email to verify.',
        );
      }
    } on AuthException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'An unexpected error occurred.',
      );
    }
  }

  // ─── Email sign in ──────────────────────────────────────────────────────────
  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );

      state = AuthState(
        status: AuthStatus.authenticated,
        user: response.user,
      );
    } on AuthException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'An unexpected error occurred.',
      );
    }
  }

  // ─── Sign out ───────────────────────────────────────────────────────────────
  Future<void> signOut() async {
    await _supabase.auth.signOut();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  // ─── Clear error ────────────────────────────────────────────────────────────
  void clearError() {
    state = state.copyWith(errorMessage: null);
  }

  @override
  void dispose() {
    _authSub?.cancel();
    super.dispose();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (_) => AuthNotifier(),
);
