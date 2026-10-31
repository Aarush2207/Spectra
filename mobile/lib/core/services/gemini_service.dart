import 'dart:io';
import '../../data/repositories/scan_repository.dart';

/// Client-side Gemini API service wrapper.
/// Direct client-side Gemini API calls have been completely removed for security.
/// All AI analysis calls are forwarded strictly to the Spectra FastAPI backend.
class GeminiService {
  final ScanRepository _scanRepository;

  GeminiService({ScanRepository? scanRepository})
      : _scanRepository = scanRepository ?? ScanRepository();

  /// Analyzes text through the FastAPI backend (`POST /api/analyze/text`)
  Future<Map<String, dynamic>> analyzeText(String text) async {
    final result = await _scanRepository.analyzeText(text);
    return result.toJson();
  }

  /// Analyzes screenshot image through the FastAPI backend (`POST /api/analyze/image`)
  Future<Map<String, dynamic>> analyzeImage(File imageFile) async {
    final result = await _scanRepository.analyzeImage(imageFile);
    return result.toJson();
  }

  /// Checks connectivity to the Spectra backend
  Future<bool> checkHealth() async {
    return await _scanRepository.healthCheck();
  }
}
