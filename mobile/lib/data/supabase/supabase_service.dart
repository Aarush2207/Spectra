import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/scan_result.dart';
import '../../models/evidence.dart';
import '../../models/suspicious_url.dart';
import '../../models/scan_history_item.dart';

/// Service layer for all Supabase database operations.
/// Maps to the Spectra database schema (scans, scan_evidence, scan_urls, scan_recommendations).
class SupabaseService {
  SupabaseService._();

  static SupabaseClient get _client => Supabase.instance.client;

  // ─── Auth helpers ─────────────────────────────────────────────────────────
  static String? get currentUserId => _client.auth.currentUser?.id;

  static bool get isAuthenticated => currentUserId != null;

  // ─── Save a complete scan result ──────────────────────────────────────────
  /// Inserts a scan row plus its evidence, URLs, and recommendations
  /// in a single logical operation. Returns the scan UUID.
  static Future<String> saveScanResult({
    required ScanResult result,
    required String scanType,
    String? messagePreview,
  }) async {
    final userId = currentUserId;
    if (userId == null) throw Exception('Not authenticated');

    // 1. Normalize fields to conform strictly to SQL check constraints:
    // scan_type check: 'text', 'screenshot', 'url'
    final lowerScanType = scanType.toLowerCase();
    final normalizedScanType = (lowerScanType == 'screenshot')
        ? 'screenshot'
        : (lowerScanType == 'url')
            ? 'url'
            : 'text';

    // risk_level check (risk_level in ('LOW', 'SUSPICIOUS', 'HIGH', 'UNKNOWN'))
    final rawRisk = result.riskLevel.name.toUpperCase();
    final normalizedRisk = const {'LOW', 'SUSPICIOUS', 'HIGH', 'UNKNOWN'}.contains(rawRisk)
        ? rawRisk
        : 'UNKNOWN';

    // confidence check (confidence in ('HIGH', 'MEDIUM', 'LOW'))
    final rawConf = result.confidence.toUpperCase();
    final normalizedConfidence = const {'HIGH', 'MEDIUM', 'LOW'}.contains(rawConf)
        ? rawConf
        : 'MEDIUM';

    // 1. Insert the scan row
    final scanRow = await _client.from('scans').insert({
      'user_id': userId,
      'scan_type': normalizedScanType,
      'risk_level': normalizedRisk,
      'risk_score': result.riskScore?.clamp(0, 100),
      'confidence': normalizedConfidence,
      'summary': result.summary,
      'message_preview': messagePreview,
      'ocr_used': normalizedScanType == 'screenshot',
      'rule_analysis_used': true,
      'ai_analysis_used': true,
      'url_analysis_used': normalizedScanType == 'url' || result.urls.isNotEmpty,
    }).select('id').single();

    final scanId = scanRow['id'] as String;

    // 2. Insert evidence rows
    // severity check (severity in ('HIGH', 'MEDIUM', 'LOW'))
    if (result.evidence.isNotEmpty) {
      await _client.from('scan_evidence').insert(
        result.evidence.map((e) {
          final sev = e.severity.toUpperCase();
          final normalizedSev = const {'HIGH', 'MEDIUM', 'LOW'}.contains(sev) ? sev : 'MEDIUM';
          return {
            'scan_id': scanId,
            'phrase': e.phrase,
            'reason': e.reason,
            'severity': normalizedSev,
          };
        }).toList(),
      );
    }

    // 3. Insert URL rows
    // risk check (risk in ('SAFE', 'SUSPICIOUS', 'HIGH'))
    if (result.urls.isNotEmpty) {
      await _client.from('scan_urls').insert(
        result.urls.map((u) {
          final r = u.risk.toUpperCase();
          final normalizedUrlRisk = (r == 'HIGH')
              ? 'HIGH'
              : (r == 'SAFE' || r == 'LOW')
                  ? 'SAFE'
                  : 'SUSPICIOUS';
          return {
            'scan_id': scanId,
            'url': u.url,
            'risk': normalizedUrlRisk,
            'reason': u.reason,
          };
        }).toList(),
      );
    }

    // 4. Insert recommendation rows
    if (result.recommendations.isNotEmpty) {
      await _client.from('scan_recommendations').insert(
        result.recommendations
            .map((r) => {
                  'scan_id': scanId,
                  'recommendation': r,
                })
            .toList(),
      );
    }

    return scanId;
  }

  // ─── Fetch scan history (list view) ───────────────────────────────────────
  /// Returns lightweight scan items for the history list directly from backend Supabase table.
  static Future<List<ScanHistoryItem>> fetchScanHistory() async {
    final userId = currentUserId;

    try {
      List<dynamic> rows;
      if (userId != null) {
        rows = await _client
            .from('scans')
            .select('id, scan_type, risk_level, risk_score, message_preview, created_at')
            .eq('user_id', userId)
            .order('created_at', ascending: false)
            .limit(150);
      } else {
        // Query available scans in the backend database
        rows = await _client
            .from('scans')
            .select('id, scan_type, risk_level, risk_score, message_preview, created_at')
            .order('created_at', ascending: false)
            .limit(150);
      }

      return rows.map((row) {
        final map = row as Map<String, dynamic>;
        return ScanHistoryItem(
          id: map['id'] as String,
          timestamp: DateTime.parse(map['created_at'] as String),
          riskLevel: RiskLevel.values.firstWhere(
            (r) => r.name.toLowerCase() == (map['risk_level'] as String?)?.toLowerCase(),
            orElse: () => RiskLevel.unknown,
          ),
          scanType: (map['scan_type'] as String?) == 'screenshot'
              ? ScanType.screenshot
              : (map['scan_type'] as String?) == 'url'
                  ? ScanType.url
                  : ScanType.text,
          messagePreview: map['message_preview'] as String?,
          riskScore: map['risk_score'] as int?,
        );
      }).toList();
    } catch (_) {
      return [];
    }
  }

  // ─── Fetch full scan detail ───────────────────────────────────────────────
  /// Loads a complete scan with all evidence, URLs, and recommendations.
  static Future<ScanResult?> fetchScanDetail(String scanId) async {
    final scanRow = await _client
        .from('scans')
        .select()
        .eq('id', scanId)
        .maybeSingle();

    if (scanRow == null) return null;

    // Fetch related data in parallel
    final results = await Future.wait([
      _client.from('scan_evidence').select().eq('scan_id', scanId),
      _client.from('scan_urls').select().eq('scan_id', scanId),
      _client.from('scan_recommendations').select().eq('scan_id', scanId),
    ]);

    final evidenceRows = results[0] as List<dynamic>;
    final urlRows = results[1] as List<dynamic>;
    final recRows = results[2] as List<dynamic>;

    return ScanResult(
      riskLevel: RiskLevelExt.fromString(scanRow['risk_level'] as String? ?? 'UNKNOWN'),
      riskScore: scanRow['risk_score'] as int?,
      confidence: scanRow['confidence'] as String? ?? 'LOW',
      summary: scanRow['summary'] as String? ?? '',
      evidence: evidenceRows
          .map((e) => Evidence(
                phrase: (e as Map<String, dynamic>)['phrase'] as String? ?? '',
                reason: e['reason'] as String? ?? '',
                severity: e['severity'] as String? ?? 'MEDIUM',
              ))
          .toList(),
      urls: urlRows
          .map((u) => SuspiciousUrl(
                url: (u as Map<String, dynamic>)['url'] as String? ?? '',
                risk: u['risk'] as String? ?? 'SUSPICIOUS',
                reason: u['reason'] as String? ?? '',
              ))
          .toList(),
      recommendations: recRows
          .map((r) => (r as Map<String, dynamic>)['recommendation'] as String? ?? '')
          .toList(),
      timestamp: DateTime.parse(scanRow['created_at'] as String),
    );
  }

  // ─── Delete a scan ────────────────────────────────────────────────────────
  /// Cascade delete removes evidence, URLs, and recommendations automatically.
  static Future<void> deleteScan(String scanId) async {
    await _client.from('scans').delete().eq('id', scanId);
  }

  // ─── Clear all scans for current user ─────────────────────────────────────
  static Future<void> clearAllScans() async {
    final userId = currentUserId;
    if (userId == null) return;
    await _client.from('scans').delete().eq('user_id', userId);
  }

  // ─── Profile ──────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>?> fetchProfile() async {
    final userId = currentUserId;
    if (userId == null) return null;
    return await _client
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();
  }

  static Future<void> updateDisplayName(String name) async {
    final userId = currentUserId;
    if (userId == null) return;
    await _client.from('profiles').update({
      'display_name': name,
    }).eq('id', userId);
  }
}
