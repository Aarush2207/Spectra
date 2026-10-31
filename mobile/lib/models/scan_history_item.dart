import 'scan_result.dart';

enum ScanType { text, screenshot, url }

class ScanHistoryItem {
  final String id;
  final DateTime timestamp;
  final RiskLevel riskLevel;
  final ScanType scanType;
  final String? messagePreview; // Only set when user explicitly consents
  final int? riskScore;

  const ScanHistoryItem({
    required this.id,
    required this.timestamp,
    required this.riskLevel,
    required this.scanType,
    this.messagePreview,
    this.riskScore,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'timestamp': timestamp.toIso8601String(),
        'risk_level': riskLevel.name,
        'scan_type': scanType.name,
        'message_preview': messagePreview,
        'risk_score': riskScore,
      };

  factory ScanHistoryItem.fromJson(Map<String, dynamic> json) => ScanHistoryItem(
        id: json['id'] as String,
        timestamp: DateTime.parse(json['timestamp'] as String),
        riskLevel: RiskLevel.values.firstWhere(
          (r) => r.name.toLowerCase() == (json['risk_level'] as String?)?.toLowerCase(),
          orElse: () => RiskLevel.unknown,
        ),
        scanType: ScanType.values.firstWhere(
          (t) => t.name.toLowerCase() == (json['scan_type'] as String?)?.toLowerCase(),
          orElse: () => ScanType.text,
        ),
        messagePreview: json['message_preview'] as String?,
        riskScore: json['risk_score'] as int?,
      );
}
