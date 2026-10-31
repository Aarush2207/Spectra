class SuspiciousUrl {
  final String url;
  final String risk; 
  final String reason;

  const SuspiciousUrl({
    required this.url,
    required this.risk,
    required this.reason,
  });

  factory SuspiciousUrl.fromJson(Map<String, dynamic> json) => SuspiciousUrl(
        url: json['url'] as String? ?? '',
        risk: json['risk'] as String? ?? 'SUSPICIOUS',
        reason: json['reason'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'url': url,
        'risk': risk,
        'reason': reason,
      };
}
