import '../../models/suspicious_url.dart';

/// PASSIVE URL Inspector implemented in pure Dart.
/// CRITICAL SECURITY RULE:
/// Never makes outbound network connections, never pings, and never navigates to URLs.
/// Purely inspects lexical, syntactic, and structural indicators.
class UrlInspector {
  UrlInspector._();

  static final RegExp _urlRegex = RegExp(
    r'(?:(?:https?|ftp)://|www\.)[^\s/$.?#].[^\s]*',
    caseSensitive: false,
  );

  static final RegExp _ipRegex = RegExp(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$');

  static const Set<String> _suspiciousTlds = {
    'xyz', 'top', 'click', 'win', 'tk', 'ml', 'ga', 'cf', 'gq', 'buzz',
    'club', 'work', 'date', 'racing', 'download', 'review', 'country',
    'kim', 'cricket', 'science', 'party', 'gdn', 'mom', 'loan'
  };

  static const List<String> _popularBrands = [
    'paypal', 'google', 'apple', 'microsoft', 'netflix', 'amazon',
    'chase', 'wellsfargo', 'bankofamerica', 'citibank', 'facebook',
    'instagram', 'whatsapp', 'telegram', 'binance', 'coinbase', 'sbi',
    'hdfc', 'icici', 'axis', 'paytm'
  ];

  static const List<String> _sensitiveKeywords = [
    'verify', 'login', 'update', 'account', 'banking', 'secure', 'password', 'otp', 'claim'
  ];

  /// Extracts all URL candidates from a body of text.
  static List<String> extractUrls(String text) {
    final matches = _urlRegex.allMatches(text);
    final cleaned = <String>[];

    for (final m in matches) {
      var u = m.group(0) ?? '';
      // Strip trailing punctuation often caught at the end of URLs
      while (u.isNotEmpty &&
          const {'.', ',', ';', ':', '?', '!', '"', "'", ')', ']', '>'}
              .contains(u[u.length - 1])) {
        u = u.substring(0, u.length - 1);
      }
      if (!u.startsWith('http://') && !u.startsWith('https://') && !u.startsWith('ftp://')) {
        u = 'http://$u';
      }
      if (!cleaned.contains(u)) {
        cleaned.add(u);
      }
    }
    return cleaned;
  }

  /// Passively inspects a single URL and returns a [SuspiciousUrl] threat assessment.
  static SuspiciousUrl inspect(String rawUrl) {
    var url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('ftp://')) {
      url = 'http://$url';
    }

    final reasons = <String>[];
    String riskLevel = 'SAFE';

    Uri? parsed;
    try {
      parsed = Uri.parse(url);
    } catch (_) {
      return SuspiciousUrl(
        url: rawUrl,
        risk: 'HIGH',
        reason: 'Malformed or invalid URL syntax detected',
      );
    }

    final hostname = parsed.host.toLowerCase();

    // 1. Raw IP address check
    if (_ipRegex.hasMatch(hostname)) {
      reasons.add('Uses raw IP address instead of domain name');
      riskLevel = 'HIGH';
    }

    // 2. Unencrypted HTTP scheme check
    if (parsed.scheme == 'http') {
      reasons.add('Unencrypted connection (HTTP)');
      if (riskLevel != 'HIGH') riskLevel = 'SUSPICIOUS';
    }

    // 3. High-risk TLD check
    final hostParts = hostname.split('.');
    final tld = hostParts.isNotEmpty ? hostParts.last : '';
    if (_suspiciousTlds.contains(tld)) {
      reasons.add('Uses high-risk top-level domain (.$tld) commonly associated with scams');
      riskLevel = 'HIGH';
    }

    // 4. Brand spoofing / impersonation
    final subdomains = hostParts.length > 2 ? hostParts.sublist(0, hostParts.length - 2) : <String>[];
    final mainDomain = hostParts.length >= 2 ? hostParts[hostParts.length - 2] : hostname;

    for (final brand in _popularBrands) {
      if (hostname.contains(brand)) {
        final isOfficial = (mainDomain == brand);
        if (!isOfficial) {
          reasons.add("Possible brand spoofing/impersonation of '$brand'");
          riskLevel = 'HIGH';
        }
      }
    }

    // 5. Excessive subdomains (obfuscation)
    if (subdomains.length >= 3) {
      reasons.add('Excessive subdomain depth often used in phishing obfuscation');
      if (riskLevel != 'HIGH') riskLevel = 'SUSPICIOUS';
    }

    // 6. Sensitive keywords in path or query
    final pathQuery = '${parsed.path} ${parsed.query}'.toLowerCase();
    for (final kw in _sensitiveKeywords) {
      if (pathQuery.contains(kw)) {
        reasons.add("Path or query contains sensitive action keyword: '$kw'");
        if (riskLevel == 'SAFE') riskLevel = 'SUSPICIOUS';
        break;
      }
    }

    // 7. @ symbol in URL (credential injection redirect trick)
    if (rawUrl.contains('@')) {
      reasons.add("URL contains '@' symbol, which can redirect users unexpectedly");
      riskLevel = 'HIGH';
    }

    final reasonText = reasons.isNotEmpty
        ? reasons.join('; ')
        : 'No obvious domain anomalies detected passively.';

    return SuspiciousUrl(
      url: rawUrl,
      risk: riskLevel,
      reason: reasonText,
    );
  }
}
