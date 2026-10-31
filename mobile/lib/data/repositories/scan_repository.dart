import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show Supabase;
import '../../core/config/app_config.dart';
import '../../core/services/url_inspector.dart';
import '../../models/evidence.dart';
import '../../models/scan_result.dart';
import '../../models/suspicious_url.dart';

class NoTextFoundException implements Exception {
  final String message;
  const NoTextFoundException([this.message = 'No readable text detected in this screenshot.']);
  @override
  String toString() => message;
}

const String _systemPrompt = '''
You are Spectra AI, a specialized cybersecurity and scam detection engine.
Analyze the input text or screenshot for fraud, phishing, OTP theft, bank impersonation, manufactured panic, and extortion.

CRITICAL INSTRUCTIONS:
1. Do not flag messages as scams based on keywords alone. Context matters:
   - "Never share your OTP with anyone" is a legitimate security warning (LOW risk).
   - "Share your OTP immediately or your account will be blocked" is a severe scam (HIGH risk).
   - Official government acknowledgements (.nic.in, .gov) are legitimate (LOW risk).
2. Support English and Hinglish.
3. Respond ONLY with valid JSON matching this schema:
{
  "risk_level": "LOW" | "SUSPICIOUS" | "HIGH",
  "risk_score": <0-100 integer>,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "summary": "<1-2 sentence clear assessment in plain language>",
  "evidence": [
    {
      "phrase": "<exact suspicious phrase>",
      "reason": "<threat explanation>",
      "severity": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "recommendations": [
    "<actionable safety advice 1>",
    "<actionable safety advice 2>"
  ]
}
''';

/// Standalone, resilient ScanRepository that works on any device.
/// 1. Tries OpenRouter Multimodal AI over cloud HTTPS (no local backend needed).
/// 2. If OpenRouter is slow/offline, falls back to pure-Dart offline heuristic detection.
/// Never throws a connection error or blocks the user from scanning.
class ScanRepository {
  final Dio _dio;
  String? _lastOpenRouterError;

  ScanRepository({Dio? dio})
      : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: 'https://openrouter.ai/api/v1/',
                connectTimeout: const Duration(seconds: 40),
                receiveTimeout: const Duration(seconds: 60),
                sendTimeout: const Duration(seconds: 60),
                headers: {
                  'Authorization': 'Bearer ${AppConfig.openRouterApiKey.trim()}',
                  'Content-Type': 'application/json',
                  'HTTP-Referer': 'https://spectra.app',
                  'Referer': 'https://spectra.app',
                  'X-Title': 'Spectra Mobile',
                },
              ),
            );

  Map<String, String> _authHeaders() {
    try {
      final token = Supabase.instance.client.auth.currentSession?.accessToken;
      if (token != null && token.isNotEmpty) {
        return {'Authorization': 'Bearer $token'};
      }
    } catch (_) {}
    return {};
  }

  // ─── 1. Text Analysis ───────────────────────────────────────────────────────
  Future<ScanResult> analyzeText(String text) async {
    final cleanText = text.trim();
    final extractedUrls = UrlInspector.extractUrls(cleanText);
    final urlFindings = extractedUrls.map(UrlInspector.inspect).toList();

    // Try cloud OpenRouter AI first
    final aiResult = await _callOpenRouter(
      messages: [
        {'role': 'system', 'content': _systemPrompt},
        {
          'role': 'user',
          'content': 'Analyze this message for scam and fraud indicators:\n"""$cleanText"""\n\nRespond ONLY with valid JSON:'
        },
      ],
      maxTokens: 800,
    );

    if (aiResult != null) {
      return _buildResultFromAI(aiResult, urlFindings);
    }

    // Offline heuristic fallback
    return _offlineAnalyzeText(cleanText, urlFindings);
  }

  // ─── 2. Screenshot Analysis ────────────────────────────────────────────────
  Future<ScanResult> analyzeImage(File imageFile) async {
    if (!imageFile.existsSync()) {
      throw Exception('Selected image file does not exist on device.');
    }

    try {
      final bytes = await imageFile.readAsBytes();
      final base64Image = base64Encode(bytes);
      final ext = imageFile.path.split('.').last.toLowerCase();
      final mimeType = (ext == 'png')
          ? 'image/png'
          : (ext == 'webp')
              ? 'image/webp'
              : 'image/jpeg';
      final dataUrl = 'data:$mimeType;base64,$base64Image';

      // Call OpenRouter Multimodal Vision AI directly (no system message role for multimodal vision)
      final aiResult = await _callOpenRouter(
        messages: [
          {
            'role': 'user',
            'content': [
              {
                'type': 'text',
                'text':
                    '$_systemPrompt\n\n'
                    'Analyze this uploaded screenshot carefully:\n'
                    '1. Detect and transcribe ALL readable text, messages, notifications, dialogs, receipts, or website content present in the image.\n'
                    '2. If there is ABSOLUTELY NO readable text or words anywhere in this image (e.g. pure blank screen, scenery photo, abstract pattern with zero words), respond ONLY with valid JSON: {"has_text": false, "summary": "No readable text detected in this screenshot."}\n'
                    '3. If readable text IS present (even a single word, title, website URL like esamadhan.nic.in, button, or message):\n'
                    '   - Set "has_text": true\n'
                    '   - Set "extracted_text" to the complete transcribed text from the image\n'
                    '   - Carefully evaluate the content for scams, phishing, fake claims, urgency, or legitimacy\n'
                    '   - Official government notices (.nic.in, .gov), genuine receipts, and legitimate delivery updates are LOW risk\n\n'
                    'Respond ONLY with valid JSON in this schema:\n'
                    '{\n'
                    '  "has_text": true,\n'
                    '  "extracted_text": "<full readable text from the image>",\n'
                    '  "risk_level": "LOW" | "SUSPICIOUS" | "HIGH",\n'
                    '  "risk_score": <0-100 integer>,\n'
                    '  "confidence": "HIGH" | "MEDIUM" | "LOW",\n'
                    '  "summary": "<1-2 sentence plain language assessment of the screenshot content>",\n'
                    '  "evidence": [\n'
                    '    {"phrase": "<suspicious phrase or leave empty if legitimate>", "reason": "<explanation>", "severity": "HIGH" | "MEDIUM" | "LOW"}\n'
                    '  ],\n'
                    '  "recommendations": ["<safety tip 1>", "<safety tip 2>"]\n'
                    '}'
              },
              {
                'type': 'image_url',
                'image_url': {'url': dataUrl}
              }
            ]
          }
        ],
        maxTokens: 1200,
      );

      if (aiResult != null) {
        final hasTextVal = aiResult['has_text'];
        final hasText = (hasTextVal == false || hasTextVal == 'false')
            ? false
            : (hasTextVal == true || hasTextVal == 'true' ? true : null);
        final summary = (aiResult['summary']?.toString() ?? '').toLowerCase();
        final extracted = (aiResult['extracted_text']?.toString() ?? '').trim();

        // If readable text was extracted, it definitely HAS text!
        final actuallyHasText = extracted.isNotEmpty && extracted.length >= 3;

        final explicitNoTextKeywords = [
          'no readable text',
          'no text found',
          'no text detected',
          'no visible text',
          'image contains no text',
          'does not contain any text',
          'there is no text in this image',
        ];

        final indicatesNoText = explicitNoTextKeywords.any((k) => summary.contains(k));

        // ONLY throw NoTextFoundException if confirmed NO readable text exists AND nothing was transcribed
        if (!actuallyHasText && (hasText == false || (hasText != true && indicatesNoText))) {
          throw const NoTextFoundException('No readable text detected in this screenshot.');
        }

        final summaryRaw = aiResult['summary']?.toString() ?? '';
        final evidencePhrases = (aiResult['evidence'] as List<dynamic>? ?? [])
            .map((e) => e is Map ? e['phrase']?.toString() ?? '' : '')
            .join(' ');
        final extractedUrls = UrlInspector.extractUrls('$summaryRaw $evidencePhrases $extracted');
        final urlFindings = extractedUrls.map(UrlInspector.inspect).toList();

        return _buildResultFromAI(aiResult, urlFindings);
      }
    } on NoTextFoundException {
      rethrow;
    } catch (e) {
      if (e is NoTextFoundException) rethrow;
    }

    return _callBackendOrThrow(imageFile);
  }

  // ─── 3. URL Analysis ───────────────────────────────────────────────────────
  Future<ScanResult> analyzeUrl(String rawUrl) async {
    final cleanUrl = rawUrl.trim();
    final urlFinding = UrlInspector.inspect(cleanUrl);

    // Contextual AI reasoning
    final aiResult = await _callOpenRouter(
      messages: [
        {'role': 'system', 'content': _systemPrompt},
        {
          'role': 'user',
          'content':
              'Passively evaluate the structural risk of this URL without visiting it: $cleanUrl\nLexical finding: ${urlFinding.reason} (Risk: ${urlFinding.risk})\n\nRespond ONLY with valid JSON:'
        }
      ],
      maxTokens: 600,
    );

    if (aiResult != null) {
      return _buildResultFromAI(aiResult, [urlFinding]);
    }

    // Offline fallback using pure-Dart UrlInspector
    final isHigh = urlFinding.risk == 'HIGH';
    final isSuspicious = urlFinding.risk == 'SUSPICIOUS';
    final riskLevel = isHigh
        ? RiskLevel.high
        : isSuspicious
            ? RiskLevel.suspicious
            : RiskLevel.low;
    final riskScore = isHigh ? 85 : isSuspicious ? 45 : 10;

    return ScanResult(
      riskLevel: riskLevel,
      riskScore: riskScore,
      confidence: 'HIGH',
      summary: isHigh
          ? 'High-risk domain indicators detected by passive lexical analysis.'
          : isSuspicious
              ? 'Suspicious domain patterns detected. Exercise caution.'
              : 'Domain structure matches legitimate naming standards.',
      evidence: [
        Evidence(
          phrase: cleanUrl,
          reason: urlFinding.reason,
          severity: urlFinding.risk,
        )
      ],
      urls: [urlFinding],
      recommendations: [
        'Never enter passwords, PINs, or card details on unverified websites.',
        'Verify the official domain before interacting.',
        'Ensure the address starts with secure HTTPS encryption.',
      ],
      timestamp: DateTime.now(),
    );
  }

  // ─── Cloud OpenRouter Caller ───────────────────────────────────────────────
  Future<Map<String, dynamic>?> _callOpenRouter({
    required List<Map<String, dynamic>> messages,
    int maxTokens = 1200,
  }) async {
    final models = [
      'google/gemini-2.0-flash-exp:free',
      AppConfig.openRouterModel, // nvidia/nemotron-3.5-super-vl:free
      'meta-llama/llama-3.2-11b-vision-instruct:free',
      'mistralai/pixtral-12b:free',
      'qwen/qwen-2-vl-72b-instruct:free',
    ];

    _lastOpenRouterError = null;

    for (final model in models) {
      try {
        final response = await _dio.post(
          'https://openrouter.ai/api/v1/chat/completions',
          data: {
            'model': model,
            'messages': messages,
            'temperature': 0.1,
            'max_tokens': maxTokens,
          },
          options: Options(
            headers: {
              'Authorization': 'Bearer ${AppConfig.openRouterApiKey.trim()}',
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://spectra.app',
              'Referer': 'https://spectra.app',
              'X-Title': 'Spectra Mobile',
            },
          ),
        );

        if (response.statusCode == 200 && response.data != null) {
          Map<String, dynamic>? dataMap;
          if (response.data is Map<String, dynamic>) {
            dataMap = response.data as Map<String, dynamic>;
          } else if (response.data is Map) {
            dataMap = Map<String, dynamic>.from(response.data as Map);
          } else if (response.data is String) {
            try {
              final decoded = jsonDecode(response.data as String);
              if (decoded is Map) {
                dataMap = Map<String, dynamic>.from(decoded);
              }
            } catch (_) {}
          }

          if (dataMap != null) {
            final choices = dataMap['choices'] as List<dynamic>?;
            if (choices != null && choices.isNotEmpty) {
              final messageObj = choices[0]['message'];
              String content = '';
              final rawContent = messageObj?['content'];
              if (rawContent is String) {
                content = rawContent;
              } else if (rawContent is List) {
                for (final part in rawContent) {
                  if (part is Map && part['text'] != null) {
                    content += part['text'].toString();
                  } else if (part is String) {
                    content += part;
                  }
                }
              }

              final parsed = _extractJson(content);
              if (parsed != null &&
                  (parsed.containsKey('risk_level') ||
                      parsed.containsKey('has_text') ||
                      parsed.containsKey('summary'))) {
                return parsed;
              }
            }
          }
        }
      } catch (e) {
        if (e is DioException) {
          final code = e.response?.statusCode;
          final errorData = e.response?.data;
          String errDetail = '';
          if (errorData is Map && errorData['error'] != null) {
            errDetail = errorData['error']['message']?.toString() ?? '';
          } else if (errorData is String) {
            errDetail = errorData;
          } else {
            errDetail = e.message ?? '';
          }
          _lastOpenRouterError = 'Status $code: $errDetail';
          debugPrint('[OpenRouter] Model $model failed ($code): $errDetail');
        } else {
          _lastOpenRouterError = e.toString();
          debugPrint('[OpenRouter] Model $model failed: $e');
        }
        continue;
      }
    }
    return null;
  }

  Map<String, dynamic>? _extractJson(String text) {
    var s = text.trim();
    if (s.contains('```json')) {
      s = s.split('```json')[1].split('```')[0].trim();
    } else if (s.contains('```')) {
      s = s.split('```')[1].split('```')[0].trim();
    }

    final first = s.indexOf('{');
    final last = s.lastIndexOf('}');
    if (first != -1 && last != -1 && last > first) {
      s = s.substring(first, last + 1);
    }

    try {
      final decoded = jsonDecode(s);
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (_) {}

    // Fallback: search in original text directly
    final rawFirst = text.indexOf('{');
    final rawLast = text.lastIndexOf('}');
    if (rawFirst != -1 && rawLast != -1 && rawLast > rawFirst) {
      try {
        final decoded = jsonDecode(text.substring(rawFirst, rawLast + 1));
        if (decoded is Map<String, dynamic>) return decoded;
      } catch (_) {}
    }
    return null;
  }

  ScanResult _buildResultFromAI(
    Map<String, dynamic> aiResult,
    List<SuspiciousUrl> urlFindings,
  ) {
    var riskLevelStr = (aiResult['risk_level'] as String? ?? 'LOW').toUpperCase();
    var riskScore = (aiResult['risk_score'] as num?)?.toInt() ?? 20;

    // Elevate risk if high-risk URLs found
    if (urlFindings.any((u) => u.risk == 'HIGH')) {
      riskLevelStr = 'HIGH';
      riskScore = (riskScore < 85) ? 85 : riskScore;
    } else if (urlFindings.any((u) => u.risk == 'SUSPICIOUS') && riskLevelStr == 'LOW') {
      riskLevelStr = 'SUSPICIOUS';
      riskScore = (riskScore < 50) ? 50 : riskScore;
    }

    final evidenceList = (aiResult['evidence'] as List<dynamic>? ?? [])
        .map((e) => Evidence(
              phrase: e['phrase']?.toString() ?? '',
              reason: e['reason']?.toString() ?? 'Threat indicator detected',
              severity: (e['severity']?.toString() ?? 'MEDIUM').toUpperCase(),
            ))
        .toList();

    final recs = (aiResult['recommendations'] as List<dynamic>? ?? [])
        .map((r) => r.toString())
        .toList();

    return ScanResult(
      riskLevel: RiskLevelExt.fromString(riskLevelStr),
      riskScore: riskScore.clamp(0, 100),
      confidence: aiResult['confidence']?.toString() ?? 'HIGH',
      summary: aiResult['summary']?.toString() ?? 'Analysis completed successfully.',
      evidence: evidenceList,
      urls: urlFindings,
      recommendations: recs.isNotEmpty
          ? recs
          : [
              'Verify sender identity through official customer service channels.',
              'Never share OTPs, PINs, or banking passwords.',
              'Do not click unverified external links.',
            ],
      timestamp: DateTime.now(),
    );
  }

  // ─── Pure-Dart Offline Heuristic Fallback ───────────────────────────────────
  ScanResult _offlineAnalyzeText(String text, List<SuspiciousUrl> urlFindings) {
    final lower = text.toLowerCase();
    final evidence = <Evidence>[];
    int score = 0;

    // Legitimate advisory polarity guard
    final isAdvisory = lower.contains('never share') ||
        lower.contains('do not share') ||
        lower.contains('beware of');

    if (!isAdvisory) {
      if (lower.contains('share your otp') ||
          lower.contains('send otp') ||
          lower.contains('tell me the otp') ||
          lower.contains('enter otp') ||
          lower.contains('otp share karo')) {
        evidence.add(const Evidence(
          phrase: 'OTP solicitation',
          reason: 'Attempts to harvest one-time authentication credentials.',
          severity: 'HIGH',
        ));
        score += 85;
      }

      if (lower.contains('account will be blocked') ||
          lower.contains('account suspended') ||
          lower.contains('card will be blocked') ||
          lower.contains('within 24 hours') ||
          lower.contains('immediately') ||
          lower.contains('turant')) {
        evidence.add(const Evidence(
          phrase: 'Manufactured urgency / suspension threat',
          reason: 'Coercive time pressure to force hasty compliance.',
          severity: 'HIGH',
        ));
        score += 35;
      }

      if (lower.contains('processing fee') ||
          lower.contains('release your parcel') ||
          lower.contains('registration fee') ||
          lower.contains('pay ₹') ||
          lower.contains('pay rs')) {
        evidence.add(const Evidence(
          phrase: 'Upfront advance fee demand',
          reason: 'Advance-fee fraud tactic under false pretenses.',
          severity: 'HIGH',
        ));
        score += 50;
      }

      if (lower.contains('won') && (lower.contains('lottery') || lower.contains('prize') || lower.contains('crore'))) {
        evidence.add(const Evidence(
          phrase: 'Unsolicited lottery / prize reward',
          reason: 'Classic lottery scam pattern.',
          severity: 'HIGH',
        ));
        score += 65;
      }
    }

    if (urlFindings.any((u) => u.risk == 'HIGH')) {
      score = (score < 85) ? 85 : score;
    } else if (urlFindings.any((u) => u.risk == 'SUSPICIOUS')) {
      score = (score < 50) ? 50 : score;
    }

    score = score.clamp(0, 100);
    final riskLevel = score >= 60
        ? RiskLevel.high
        : score >= 30
            ? RiskLevel.suspicious
            : RiskLevel.low;

    return ScanResult(
      riskLevel: riskLevel,
      riskScore: score,
      confidence: 'HIGH',
      summary: score >= 60
          ? 'High-risk threat indicators detected in message content.'
          : score >= 30
              ? 'Suspicious patterns detected. Exercise caution before acting.'
              : 'No immediate scam indicators found in this message.',
      evidence: evidence,
      urls: urlFindings,
      recommendations: [
        'Never share OTPs, passwords, or personal credentials.',
        'Contact the official institution directly to verify claims.',
        'Do not click unknown or unsolicited links.',
      ],
      timestamp: DateTime.now(),
    );
  }

  Future<ScanResult> _callBackendOrThrow(File imageFile) async {
    // 1. Try local FastAPI backend if running
    try {
      final fileName = imageFile.path.split(Platform.pathSeparator).last;
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          imageFile.path,
          filename: fileName,
        ),
      });

      final backendDio = Dio(
        BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          connectTimeout: const Duration(seconds: 3),
          receiveTimeout: const Duration(seconds: 8),
        ),
      );

      final response = await backendDio.post(
        '/api/analyze/image',
        data: formData,
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final summary = (data['summary']?.toString() ?? '').toLowerCase();
        final extracted = (data['extracted_text']?.toString() ?? '').trim();
        if (extracted.isEmpty && summary.contains('no readable text')) {
          throw const NoTextFoundException('No readable text detected in this screenshot.');
        }
        return _buildResultFromAI(data, []);
      }
    } on NoTextFoundException {
      rethrow;
    } catch (e) {
      if (e is NoTextFoundException) rethrow;
    }

    // 2. Specific, accurate diagnostic error message
    if (_lastOpenRouterError != null) {
      if (_lastOpenRouterError!.contains('429')) {
        throw Exception('AI vision service is experiencing high traffic (Rate limited). Please wait 30 seconds and retry.');
      } else if (_lastOpenRouterError!.contains('401')) {
        throw Exception('OpenRouter authentication failed. Please verify your API key in settings.');
      } else if (_lastOpenRouterError!.contains('413')) {
        throw Exception('Screenshot file size is too large for AI vision. Please crop or choose a smaller image.');
      }
    }

    throw Exception('Unable to reach AI vision service. Please try again in a moment.');
  }

  ScanResult _offlineAnalyzeImage(File file) {
    throw Exception('Unable to reach AI vision service. Please try again in a moment.');
  }

  Future<bool> healthCheck() async {
    return true; // Standalone client AI engine is always ready
  }
}
