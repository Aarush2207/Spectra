import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/scan_repository.dart';
import '../../models/scan_result.dart';

// ─── Repository provider ──────────────────────────────────────────────────────
final scanRepositoryProvider = Provider<ScanRepository>((_) => ScanRepository());

// ─── Scan state ───────────────────────────────────────────────────────────────
enum ScanStatus { idle, loading, success, error }

class ScanState {
  final ScanStatus status;
  final int currentStage; // 0-5
  final ScanResult? result;
  final String? errorMessage;
  final String scanType; // 'text', 'screenshot', or 'url'

  const ScanState({
    this.status = ScanStatus.idle,
    this.currentStage = 0,
    this.result,
    this.errorMessage,
    this.scanType = 'text',
  });

  ScanState copyWith({
    ScanStatus? status,
    int? currentStage,
    ScanResult? result,
    String? errorMessage,
    String? scanType,
  }) =>
      ScanState(
        status: status ?? this.status,
        currentStage: currentStage ?? this.currentStage,
        result: result ?? this.result,
        errorMessage: errorMessage ?? this.errorMessage,
        scanType: scanType ?? this.scanType,
      );
}

// ─── Notifier ─────────────────────────────────────────────────────────────────
class ScanNotifier extends StateNotifier<ScanState> {
  ScanNotifier(this._repository) : super(const ScanState());

  final ScanRepository _repository;

  /// Animates stages 0→4 while [apiFuture] runs in parallel.
  /// After [apiFuture] resolves, jumps to stage 5 and marks success.
  Future<void> _runWithStages({
    required Future<ScanResult> apiFuture,
    required String scanType,
    int stageDelayMs = 450,
  }) async {
    state = ScanState(
      status: ScanStatus.loading,
      currentStage: 0,
      scanType: scanType,
    );

    try {
      // Start stage animation and API call concurrently
      bool apiDone = false;
      ScanResult? apiResult;
      Object? apiError;

      // Fire-and-forget the API call; capture result when ready
      apiFuture.then((r) {
        apiResult = r;
        apiDone = true;
      }).catchError((e) {
        apiError = e;
        apiDone = true;
      });

      // Animate through stages 0-4 while API is in progress
      for (int i = 0; i <= 4; i++) {
        await Future.delayed(Duration(milliseconds: stageDelayMs));
        if (state.status != ScanStatus.loading) return;
        if (apiDone && apiError != null) break;
        state = state.copyWith(currentStage: i);
      }

      // If API hasn't finished yet, wait for it on stage 4
      while (!apiDone) {
        await Future.delayed(const Duration(milliseconds: 150));
        if (state.status != ScanStatus.loading) return;
      }

      // Check for error
      if (apiError != null) throw apiError!;

      // Final stage
      state = state.copyWith(currentStage: 5);
      await Future.delayed(const Duration(milliseconds: 250));

      state = ScanState(
        status: ScanStatus.success,
        result: apiResult,
        currentStage: 5,
        scanType: scanType,
      );
    } catch (e) {
      state = ScanState(
        status: ScanStatus.error,
        errorMessage: e.toString().replaceFirst('Exception: ', ''),
        scanType: scanType,
      );
    }
  }

  Future<void> analyzeText(String text) async {
    await _runWithStages(
      apiFuture: _repository.analyzeText(text),
      scanType: 'text',
      stageDelayMs: 400,
    );
  }

  Future<void> analyzeImage(File imageFile) async {
    await _runWithStages(
      apiFuture: _repository.analyzeImage(imageFile),
      scanType: 'screenshot',
      stageDelayMs: 500,
    );
  }

  Future<void> analyzeUrl(String url) async {
    await _runWithStages(
      apiFuture: _repository.analyzeUrl(url),
      scanType: 'url',
      stageDelayMs: 400,
    );
  }

  void loadExistingResult(ScanResult result, String scanType) {
    state = ScanState(
      status: ScanStatus.success,
      result: result,
      currentStage: 5,
      scanType: scanType,
    );
  }

  void reset() => state = const ScanState();
}

final scanProvider = StateNotifierProvider<ScanNotifier, ScanState>(
  (ref) => ScanNotifier(ref.watch(scanRepositoryProvider)),
);
