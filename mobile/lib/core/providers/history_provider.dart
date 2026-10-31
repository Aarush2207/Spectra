import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/supabase/supabase_service.dart';
import '../../models/scan_history_item.dart';
import '../../models/scan_result.dart';

final historyProvider =
    StateNotifierProvider<HistoryNotifier, List<ScanHistoryItem>>(
  (ref) => HistoryNotifier(),
);

class HistoryNotifier extends StateNotifier<List<ScanHistoryItem>> {
  HistoryNotifier() : super([]) {
    loadHistory();
  }

  static const _localKey = 'spectra_local_scan_history';
  bool _isLoading = false;
  bool get isLoading => _isLoading;

  /// Load scan history from Supabase backend database and local storage.
  Future<void> loadHistory() async {
    _isLoading = true;
    try {
      // 1. Fetch real scans stored in backend / Supabase database
      final backendItems = await SupabaseService.fetchScanHistory();

      // 2. Fetch locally saved real scans
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString(_localKey);
      final localItems = <ScanHistoryItem>[];
      if (jsonStr != null && jsonStr.isNotEmpty) {
        final List<dynamic> list = jsonDecode(jsonStr);
        localItems.addAll(list
            .map((e) => ScanHistoryItem.fromJson(e as Map<String, dynamic>)));
      }

      // 3. Merge both sources without duplicates
      final map = <String, ScanHistoryItem>{};
      for (final item in backendItems) {
        map[item.id] = item;
      }
      for (final item in localItems) {
        map[item.id] = item;
      }

      final merged = map.values.toList()
        ..sort((a, b) => b.timestamp.compareTo(a.timestamp));

      state = merged;
      await _saveLocalHistory();
    } catch (_) {
      // Graceful fallback
    } finally {
      _isLoading = false;
    }
  }

  /// Add a newly completed scan into history.
  Future<void> addScan({
    required RiskLevel riskLevel,
    required ScanType scanType,
    String? messagePreview,
    int? riskScore,
  }) async {
    final newItem = ScanHistoryItem(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      timestamp: DateTime.now(),
      riskLevel: riskLevel,
      scanType: scanType,
      messagePreview: messagePreview,
      riskScore: riskScore,
    );
    state = [newItem, ...state];
    await _saveLocalHistory();
  }

  Future<void> _saveLocalHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = state.take(150).map((i) => i.toJson()).toList();
      await prefs.setString(_localKey, jsonEncode(list));
    } catch (_) {}
  }

  /// Remove a single scan by ID.
  Future<void> removeItem(String id) async {
    state = state.where((i) => i.id != id).toList();
    await _saveLocalHistory();
    try {
      if (SupabaseService.isAuthenticated) {
        await SupabaseService.deleteScan(id);
      }
    } catch (_) {
      await loadHistory();
    }
  }

  /// Clear all scans.
  Future<void> clearAll() async {
    state = [];
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_localKey);
      if (SupabaseService.isAuthenticated) {
        await SupabaseService.clearAllScans();
      }
    } catch (_) {
      await loadHistory();
    }
  }
}
