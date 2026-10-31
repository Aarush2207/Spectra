// ─── Models ────────────────────────────────────────────────────────────────────

class Evidence {
  final String phrase;
  final String reason;
  final String severity; // HIGH | MEDIUM | LOW

  const Evidence({
    required this.phrase,
    required this.reason,
    required this.severity,
  });

  factory Evidence.fromJson(Map<String, dynamic> json) => Evidence(
        phrase: json['phrase'] as String? ?? '',
        reason: json['reason'] as String? ?? '',
        severity: json['severity'] as String? ?? 'MEDIUM',
      );

  Map<String, dynamic> toJson() => {
        'phrase': phrase,
        'reason': reason,
        'severity': severity,
      };
}
