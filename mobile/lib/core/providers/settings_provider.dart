import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppSettings {
  final bool onboardingComplete;
  final bool historyConsentGiven;
  final bool biometricLock;
  final bool realTimeNotifications;
  final bool autoCheckClipboard;

  const AppSettings({
    this.onboardingComplete = false,
    this.historyConsentGiven = false,
    this.biometricLock = false,
    this.realTimeNotifications = true,
    this.autoCheckClipboard = true,
  });

  AppSettings copyWith({
    bool? onboardingComplete,
    bool? historyConsentGiven,
    bool? biometricLock,
    bool? realTimeNotifications,
    bool? autoCheckClipboard,
  }) =>
      AppSettings(
        onboardingComplete: onboardingComplete ?? this.onboardingComplete,
        historyConsentGiven: historyConsentGiven ?? this.historyConsentGiven,
        biometricLock: biometricLock ?? this.biometricLock,
        realTimeNotifications:
            realTimeNotifications ?? this.realTimeNotifications,
        autoCheckClipboard: autoCheckClipboard ?? this.autoCheckClipboard,
      );
}

class SettingsNotifier extends StateNotifier<AppSettings> {
  SettingsNotifier() : super(const AppSettings()) {
    _load();
  }

  static const _keyOnboarding = 'onboarding_complete';
  static const _keyConsent = 'history_consent';
  static const _keyBiometric = 'biometric_lock';
  static const _keyNotifications = 'realtime_notifications';
  static const _keyClipboard = 'auto_check_clipboard';

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    state = AppSettings(
      onboardingComplete: prefs.getBool(_keyOnboarding) ?? false,
      historyConsentGiven: prefs.getBool(_keyConsent) ?? false,
      biometricLock: prefs.getBool(_keyBiometric) ?? false,
      realTimeNotifications: prefs.getBool(_keyNotifications) ?? true,
      autoCheckClipboard: prefs.getBool(_keyClipboard) ?? true,
    );
  }

  Future<void> completeOnboarding() async {
    state = state.copyWith(onboardingComplete: true);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyOnboarding, true);
  }

  Future<void> setHistoryConsent(bool value) async {
    state = state.copyWith(historyConsentGiven: value);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyConsent, value);
  }

  Future<void> toggleBiometricLock(bool value) async {
    state = state.copyWith(biometricLock: value);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyBiometric, value);
  }

  Future<void> toggleNotifications(bool value) async {
    state = state.copyWith(realTimeNotifications: value);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyNotifications, value);
  }

  Future<void> toggleAutoClipboard(bool value) async {
    state = state.copyWith(autoCheckClipboard: value);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyClipboard, value);
  }
}

final settingsProvider = StateNotifierProvider<SettingsNotifier, AppSettings>(
  (_) => SettingsNotifier(),
);
