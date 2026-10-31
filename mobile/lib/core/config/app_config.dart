import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

/// Central application configuration.
/// Configures backend API endpoints, OpenRouter AI, and Supabase cloud services.
class AppConfig {
  AppConfig._();

  // ─── OpenRouter Cloud AI Engine ─────────────────────────────────────────────
  /// Direct cloud AI intelligence for seamless mobile app detection without local backend
  static const String openRouterApiKey = String.fromEnvironment(
    'OPENROUTER_API_KEY',
    defaultValue:
        ',
  );
  static const String openRouterModel = '';
  static const String openRouterBaseUrl = '';
  static const String openRouterChatEndpoint = '';

  // ─── Optional Local Backend ─────────────────────────────────────────────────
  /// Base URL of local FastAPI backend server (if running)
  static String get apiBaseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    if (kIsWeb) return 'http://localhost:8000';
    try {
      if (Platform.isAndroid) return 'http://10.0.2.2:8000';
    } catch (_) {}
    return 'http://127.0.0.1:8000';
  }

  // ─── Supabase ────────────────────────────────────────────────────────────────
  /// Supabase project URL
  static const String supabaseUrl = '';

  /// Supabase publishable key
  static const String supabasePublishableKey =
      '';

  /// Backwards compatibility alias
  static const String supabaseAnonKey = supabasePublishableKey;

  // ─── Limits ─────────────────────────────────────────────────────────────────
  static const int maxImageSizeBytes = 10 * 1024 * 1024; // 10 MB
  static const int networkTimeoutSeconds = 60;
  static const int minTextLength = 5;
  static const List<String> allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
}
