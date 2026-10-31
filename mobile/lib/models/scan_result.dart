import 'evidence.dart';
import 'suspicious_url.dart';

enum RiskLevel { low, suspicious, high, unknown }

extension RiskLevelExt on RiskLevel {
  String get label {
    switch (this) {
      case RiskLevel.low:
        return 'LOW RISK';
      case RiskLevel.suspicious:
        return 'SUSPICIOUS';
      case RiskLevel.high:
        return 'HIGH RISK';
      case RiskLevel.unknown:
        return 'INCONCLUSIVE';
    }
  }

  static RiskLevel fromString(String s) {
    switch (s.toUpperCase().trim()) {
      case 'LOW':
      case 'SAFE':
      case 'CLEAN':
      case 'LEGITIMATE':
        return RiskLevel.low;
      case 'SUSPICIOUS':
      case 'MEDIUM':
      case 'WARN':
      case 'WARNING':
        return RiskLevel.suspicious;
      case 'HIGH':
      case 'DANGER':
      case 'THREAT':
      case 'SCAM':
        return RiskLevel.high;
      default:
        return RiskLevel.low;
    }
  }
}

class ScanResult {
  final RiskLevel riskLevel;
  final int? riskScore; // 0-100, null if not provided
  final String confidence; // HIGH | MEDIUM | LOW
  final String summary;
  final String? extractedText;
  final Map<String, dynamic>? analysisMethods;
  final List<Evidence> evidence;
  final List<SuspiciousUrl> urls;
  final List<String> recommendations;
  final DateTime timestamp;

  const ScanResult({
    required this.riskLevel,
    this.riskScore,
    required this.confidence,
    required this.summary,
    this.extractedText,
    this.analysisMethods,
    required this.evidence,
    required this.urls,
    required this.recommendations,
    required this.timestamp,
  });

  factory ScanResult.fromJson(Map<String, dynamic> json) {
    return ScanResult(
      riskLevel: RiskLevelExt.fromString(json['risk_level'] as String? ?? 'UNKNOWN'),
      riskScore: json['risk_score'] as int?,
      confidence: json['confidence'] as String? ?? 'LOW',
      summary: json['summary'] as String? ?? 'Analysis complete.',
      extractedText: json['extracted_text'] as String?,
      analysisMethods: json['analysis_methods'] as Map<String, dynamic>?,
      evidence: (json['evidence'] as List<dynamic>? ?? [])
          .map((e) => Evidence.fromJson(e as Map<String, dynamic>))
          .toList(),
      urls: (json['urls'] as List<dynamic>? ?? [])
          .map((u) => SuspiciousUrl.fromJson(u as Map<String, dynamic>))
          .toList(),
      recommendations: (json['recommendations'] as List<dynamic>? ?? [])
          .map((r) => r.toString())
          .toList(),
      timestamp: DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'risk_level': riskLevel.name.toUpperCase(),
        'risk_score': riskScore,
        'confidence': confidence,
        'summary': summary,
        'extracted_text': extractedText,
        'analysis_methods': analysisMethods,
        'evidence': evidence.map((e) => e.toJson()).toList(),
        'urls': urls.map((u) => u.toJson()).toList(),
        'recommendations': recommendations,
        'timestamp': timestamp.toIso8601String(),
      };
}
