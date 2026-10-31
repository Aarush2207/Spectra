import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/providers/history_provider.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/spectra_logo.dart';
import '../../models/scan_history_item.dart';
import '../../models/scan_result.dart';
import 'widgets/bar_chart_widget.dart';
import 'widgets/donut_chart.dart';
import 'widgets/risk_gauge_widget.dart';
import 'widgets/trend_line_chart.dart';

class AnalyticsScreen extends ConsumerStatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  ConsumerState<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends ConsumerState<AnalyticsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _selectedTimeFilter = 0; // 0 = All Time, 1 = 30 Days, 2 = 7 Days

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    // Fetch latest real scans from backend database upon opening
    Future.microtask(() {
      ref.read(historyProvider.notifier).loadHistory();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rawHistory = ref.watch(historyProvider);
    final history = _filterHistory(rawHistory);

    return Scaffold(
      backgroundColor: AppColors.primaryBg,
      body: SafeArea(
        child: Column(
          children: [
            // ─── Header ─────────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const SpectraLogoRow(iconSize: 24, fontSize: 15),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primaryAccent.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'INSIGHTS',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primaryAccent,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Security Analytics',
                        style: Theme.of(context).textTheme.displaySmall?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                              fontSize: 22,
                            ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  // Refresh button to re-fetch backend scans
                  IconButton.filledTonal(
                    onPressed: () =>
                        ref.read(historyProvider.notifier).loadHistory(),
                    icon: const Icon(Icons.refresh_rounded, size: 20),
                    tooltip: 'Refresh Backend Data',
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.secondaryBg,
                      foregroundColor: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Quick scan action
                  IconButton.filledTonal(
                    onPressed: () => _showScanOptions(context),
                    icon: const Icon(Icons.add_rounded, size: 20),
                    tooltip: 'New Scan',
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.primaryAccent.withValues(alpha: 0.12),
                      foregroundColor: AppColors.primaryAccent,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // ─── Top 3 Navigation Screens TabBar ─────────────────────────────
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppColors.secondaryBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  color: AppColors.cardBg,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0F172A).withValues(alpha: 0.06),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                dividerColor: Colors.transparent,
                labelColor: AppColors.primaryAccent,
                unselectedLabelColor: AppColors.textMuted,
                labelStyle: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
                unselectedLabelStyle: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
                tabs: const [
                  Tab(
                    icon: Icon(Icons.pie_chart_outline_rounded, size: 18),
                    text: 'Risk Severity',
                  ),
                  Tab(
                    icon: Icon(Icons.bar_chart_rounded, size: 18),
                    text: 'Scan Types',
                  ),
                  Tab(
                    icon: Icon(Icons.show_chart_rounded, size: 18),
                    text: 'Trends',
                  ),
                ],
              ),
            ),

            // ─── Time Filter Chips (Overflow Free) ──────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 6),
              child: Align(
                alignment: Alignment.centerLeft,
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _filterChip(0, 'All Time'),
                      const SizedBox(width: 8),
                      _filterChip(1, 'Last 30 Days'),
                      const SizedBox(width: 8),
                      _filterChip(2, 'Last 7 Days'),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.secondaryBg,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Text(
                          '${history.length} Scans in Database',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // ─── 3 Navigation Screens TabBarView ─────────────────────────────
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // Screen 1: Risk Severity & Distribution
                  _RiskSeverityScreen(history: history),
                  // Screen 2: Scan Types / Modality Comparison
                  _ModalityScreen(history: history),
                  // Screen 3: Temporal Trends & Activity
                  _TimelineScreen(history: history),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(int index, String label) {
    final selected = _selectedTimeFilter == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedTimeFilter = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primaryAccent
              : AppColors.cardBg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected ? AppColors.primaryAccent : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }

  List<ScanHistoryItem> _filterHistory(List<ScanHistoryItem> raw) {
    if (_selectedTimeFilter == 0) return raw;
    final now = DateTime.now();
    final days = _selectedTimeFilter == 1 ? 30 : 7;
    final cutoff = now.subtract(Duration(days: days));
    return raw.where((i) => i.timestamp.isAfter(cutoff)).toList();
  }

  void _showScanOptions(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Start a New Security Scan',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.chat_bubble_outline_rounded,
                    color: AppColors.primaryAccent),
                title: const Text('Text Message / SMS Scanner'),
                subtitle: const Text('Inspect suspicious text & urgent claims'),
                onTap: () {
                  Navigator.pop(ctx);
                  context.push('/text-scanner');
                },
              ),
              ListTile(
                leading: const Icon(Icons.document_scanner_rounded,
                    color: AppColors.secondaryAccent),
                title: const Text('Screenshot Scanner'),
                subtitle: const Text('Extract and analyze image text with AI'),
                onTap: () {
                  Navigator.pop(ctx);
                  context.push('/image-scanner');
                },
              ),
              ListTile(
                leading: const Icon(Icons.link_rounded, color: AppColors.success),
                title: const Text('URL Inspector'),
                subtitle: const Text('Zero-navigation passive link evaluation'),
                onTap: () {
                  Navigator.pop(ctx);
                  context.push('/url-scanner');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. NAVIGATION SCREEN 1: RISK SEVERITY & DISTRIBUTION
// ═════════════════════════════════════════════════════════════════════════════
class _RiskSeverityScreen extends StatelessWidget {
  final List<ScanHistoryItem> history;

  const _RiskSeverityScreen({required this.history});

  @override
  Widget build(BuildContext context) {
    // Strictly computed from actual backend scans
    final int safeCount = history.where((i) => i.riskLevel == RiskLevel.low).length;
    final int suspCount =
        history.where((i) => i.riskLevel == RiskLevel.suspicious).length;
    final int threatCount =
        history.where((i) => i.riskLevel == RiskLevel.high).length;
    final int total = history.length;

    double threatScore = 0.0;
    if (total > 0) {
      double sum = 0;
      for (final item in history) {
        if (item.riskScore != null) {
          sum += item.riskScore!;
        } else if (item.riskLevel == RiskLevel.high) {
          sum += 85;
        } else if (item.riskLevel == RiskLevel.suspicious) {
          sum += 45;
        } else {
          sum += 10;
        }
      }
      threatScore = (sum / total).clamp(0.0, 100.0);
    }

    final String statusText = total == 0
        ? 'No Scans Recorded'
        : threatScore >= 60
            ? 'High Alert Level'
            : threatScore >= 30
                ? 'Moderate Alert'
                : 'Protected / Low Risk';

    final Color statusColor = total == 0
        ? AppColors.textMuted
        : threatScore >= 60
            ? AppColors.danger
            : threatScore >= 30
                ? AppColors.warning
                : AppColors.success;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 30),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (total == 0) ...[
            _EmptyTelemetryCard(
              title: 'No Backend Scans Yet',
              subtitle:
                  'Perform a text, screenshot, or URL scan to populate your real-time risk graphs directly from the backend database.',
              onScanTap: () => context.push('/text-scanner'),
            ),
            const SizedBox(height: 14),
          ],

          // Quick summary metric cards
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  title: 'Clean Rate',
                  value: total > 0
                      ? '${(safeCount / total * 100).toInt()}%'
                      : '0%',
                  icon: Icons.shield_rounded,
                  color: AppColors.success,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  title: 'Threats Stopped',
                  value: '$threatCount',
                  icon: Icons.dangerous_rounded,
                  color: AppColors.danger,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  title: 'Total Scans',
                  value: '$total',
                  icon: Icons.qr_code_scanner_rounded,
                  color: AppColors.primaryAccent,
                ),
              ),
            ],
          ).animate().fadeIn(duration: 400.ms),
          const SizedBox(height: 16),

          // Graphical Representation: Donut Chart
          GlassCard(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            child: Column(
              children: [
                const Row(
                  children: [
                    Icon(Icons.donut_small_rounded,
                        color: AppColors.primaryAccent, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Historical Risk Breakdown',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                DonutChartWidget(
                  segments: [
                    DonutSegment(
                      value: safeCount.toDouble(),
                      color: AppColors.success,
                      label: 'Safe',
                    ),
                    DonutSegment(
                      value: suspCount.toDouble(),
                      color: AppColors.warning,
                      label: 'Suspicious',
                    ),
                    DonutSegment(
                      value: threatCount.toDouble(),
                      color: AppColors.danger,
                      label: 'Threat',
                    ),
                  ],
                  centerTitle: '$total',
                  centerSubtitle: 'SCANS',
                ),
              ],
            ),
          ).animate().fadeIn(delay: 150.ms, duration: 500.ms),
          const SizedBox(height: 16),

          // Graphical Representation: Risk Gauge
          GlassCard(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            child: Column(
              children: [
                const Row(
                  children: [
                    Icon(Icons.speed_rounded,
                        color: AppColors.primaryAccent, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Aggregate Threat Meter',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                RiskGaugeWidget(
                  score: threatScore,
                  statusText: statusText,
                  statusColor: statusColor,
                ),
              ],
            ),
          ).animate().fadeIn(delay: 250.ms, duration: 500.ms),
          const SizedBox(height: 16),

          // Cybersecurity Insight Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.secondaryBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primaryAccent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.lightbulb_outline_rounded,
                      color: AppColors.primaryAccent, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Database Analysis Summary',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        total == 0
                            ? 'No scan records available in the database. Scan any text or screenshot to start logging your security telemetry.'
                            : threatCount == 0
                                ? 'All $total scans are within safe baseline parameters. Maintain vigilance on unsolicited credential requests.'
                                : '$threatCount threat${threatCount > 1 ? 's' : ''} out of $total total evaluations intercepted. Fraud indicators successfully logged in backend.',
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: AppColors.textSecondary,
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(delay: 350.ms, duration: 400.ms),
        ],
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. NAVIGATION SCREEN 2: SCAN TYPES / MODALITY COMPARISON
// ═════════════════════════════════════════════════════════════════════════════
class _ModalityScreen extends StatelessWidget {
  final List<ScanHistoryItem> history;

  const _ModalityScreen({required this.history});

  @override
  Widget build(BuildContext context) {
    // Strictly computed from actual backend scans
    final textItems =
        history.where((i) => i.scanType == ScanType.text).toList();
    final imgItems =
        history.where((i) => i.scanType == ScanType.screenshot).toList();
    final urlItems = history.where((i) => i.scanType == ScanType.url).toList();

    final textTotal = textItems.length;
    final textThreats =
        textItems.where((i) => i.riskLevel == RiskLevel.high).length;

    final imgTotal = imgItems.length;
    final imgThreats =
        imgItems.where((i) => i.riskLevel == RiskLevel.high).length;

    final urlTotal = urlItems.length;
    final urlThreats =
        urlItems.where((i) => i.riskLevel == RiskLevel.high).length;

    final barData = [
      ModalityBarData(
        label: 'Text SMS',
        icon: Icons.chat_bubble_outline_rounded,
        totalScans: textTotal,
        threatsDetected: textThreats,
        primaryColor: AppColors.primaryAccent,
      ),
      ModalityBarData(
        label: 'Screenshots',
        icon: Icons.image_outlined,
        totalScans: imgTotal,
        threatsDetected: imgThreats,
        primaryColor: AppColors.secondaryAccent,
      ),
      ModalityBarData(
        label: 'URLs / Links',
        icon: Icons.link_rounded,
        totalScans: urlTotal,
        threatsDetected: urlThreats,
        primaryColor: const Color(0xFF6366F1), // Indigo
      ),
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 30),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (history.isEmpty) ...[
            _EmptyTelemetryCard(
              title: 'No Channel Data Recorded',
              subtitle:
                  'Channel comparisons will dynamically display scan volumes and threat distributions once scans are executed.',
              onScanTap: () => context.push('/image-scanner'),
            ),
            const SizedBox(height: 14),
          ],

          // Graphical Representation: Comparative Multi-Bar Chart
          GlassCard(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.equalizer_rounded,
                        color: AppColors.primaryAccent, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Channel Threat Comparison',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Real scan volume vs intercepted scam incidents per channel from backend.',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
                const SizedBox(height: 24),
                BarChartWidget(data: barData, height: 210),
              ],
            ),
          ).animate().fadeIn(duration: 400.ms),
          const SizedBox(height: 16),

          // Modality Breakdown Cards
          const Text(
            'Vector Breakdown',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),

          _ModalityDetailCard(
            title: 'SMS & Text Scans',
            subtitle: 'Direct message parsing for fake job & OTP fraud',
            icon: Icons.chat_bubble_outline_rounded,
            color: AppColors.primaryAccent,
            totalScans: textTotal,
            threats: textThreats,
          ).animate().fadeIn(delay: 150.ms, duration: 400.ms),
          const SizedBox(height: 10),

          _ModalityDetailCard(
            title: 'Screenshot Scans',
            subtitle: 'Multimodal vision OCR on receipts & banking screens',
            icon: Icons.document_scanner_rounded,
            color: AppColors.secondaryAccent,
            totalScans: imgTotal,
            threats: imgThreats,
          ).animate().fadeIn(delay: 250.ms, duration: 400.ms),
          const SizedBox(height: 10),

          _ModalityDetailCard(
            title: 'URL Inspections',
            subtitle: 'Passive static lexical & homoglyph analysis',
            icon: Icons.link_rounded,
            color: const Color(0xFF6366F1),
            totalScans: urlTotal,
            threats: urlThreats,
          ).animate().fadeIn(delay: 350.ms, duration: 400.ms),
        ],
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. NAVIGATION SCREEN 3: TEMPORAL TRENDS & TIMELINE
// ═════════════════════════════════════════════════════════════════════════════
class _TimelineScreen extends StatelessWidget {
  final List<ScanHistoryItem> history;

  const _TimelineScreen({required this.history});

  @override
  Widget build(BuildContext context) {
    // Generate strictly from actual scans in database
    final trendPoints = _generate7DayPoints(history);
    final totalWeekScans =
        trendPoints.fold<int>(0, (sum, p) => sum + p.totalScans);
    final totalWeekThreats =
        trendPoints.fold<int>(0, (sum, p) => sum + p.threats);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 30),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (history.isEmpty) ...[
            _EmptyTelemetryCard(
              title: 'No Timeline Telemetry',
              subtitle:
                  '7-day temporal curves reflect actual dates of completed scans. Test the scanner to see real activity plotted.',
              onScanTap: () => context.push('/url-scanner'),
            ),
            const SizedBox(height: 14),
          ],

          // Quick 7-Day Stats
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  title: '7-Day Activity',
                  value: '$totalWeekScans Scans',
                  icon: Icons.calendar_today_rounded,
                  color: AppColors.primaryAccent,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  title: 'Recent Threats',
                  value: '$totalWeekThreats Caught',
                  icon: Icons.shield_rounded,
                  color: totalWeekThreats > 0
                      ? AppColors.danger
                      : AppColors.success,
                ),
              ),
            ],
          ).animate().fadeIn(duration: 400.ms),
          const SizedBox(height: 16),

          // Graphical Representation: Trend Line & Area Chart
          GlassCard(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.timeline_rounded,
                        color: AppColors.primaryAccent, size: 20),
                    SizedBox(width: 8),
                    Text(
                      '7-Day Threat Radar Curve',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Daily volume of security evaluations vs detected threats from backend database.',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
                const SizedBox(height: 22),
                TrendLineChart(points: trendPoints, height: 200),
              ],
            ),
          ).animate().fadeIn(delay: 150.ms, duration: 500.ms),
          const SizedBox(height: 16),

          // Day by Day Activity Log
          const Text(
            'Daily Activity Telemetry',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),

          ...trendPoints.reversed.map((p) => _DayActivityRow(point: p)),
        ],
      ),
    );
  }

  List<TrendPoint> _generate7DayPoints(List<ScanHistoryItem> items) {
    final now = DateTime.now();
    final dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final result = <TrendPoint>[];

    for (int i = 6; i >= 0; i--) {
      final date = now.subtract(Duration(days: i));
      final dayLabel = dayNames[date.weekday - 1];

      final matching = items.where((item) {
        return item.timestamp.year == date.year &&
            item.timestamp.month == date.month &&
            item.timestamp.day == date.day;
      }).toList();

      final threats =
          matching.where((m) => m.riskLevel == RiskLevel.high).length;
      result.add(TrendPoint(
        dayLabel: dayLabel,
        totalScans: matching.length,
        threats: threats,
      ));
    }

    return result;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPER REUSABLE WIDGETS
// ═════════════════════════════════════════════════════════════════════════════
class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: const TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w500,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _ModalityDetailCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final int totalScans;
  final int threats;

  const _ModalityDetailCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.totalScans,
    required this.threats,
  });

  @override
  Widget build(BuildContext context) {
    final cleanPct = totalScans > 0
        ? ((totalScans - threats) / totalScans * 100).toInt()
        : 100;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$totalScans Scans',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                totalScans == 0
                    ? 'No Scans'
                    : '$cleanPct% Safe',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: threats > 0 ? AppColors.danger : AppColors.success,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DayActivityRow extends StatelessWidget {
  final TrendPoint point;

  const _DayActivityRow({required this.point});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Text(
            point.dayLabel,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.primaryAccent.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              '${point.totalScans} scan${point.totalScans == 1 ? '' : 's'}',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.primaryAccent,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: (point.threats > 0 ? AppColors.danger : AppColors.success)
                  .withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              point.threats > 0
                  ? '${point.threats} threat${point.threats > 1 ? 's' : ''}'
                  : 'All Clear',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: point.threats > 0 ? AppColors.danger : AppColors.success,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyTelemetryCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final VoidCallback onScanTap;

  const _EmptyTelemetryCard({
    required this.title,
    required this.subtitle,
    required this.onScanTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.secondaryBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.primaryAccent.withValues(alpha: 0.25),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.primaryAccent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.cloud_done_rounded,
                    color: AppColors.primaryAccent, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: onScanTap,
            icon: const Icon(Icons.qr_code_scanner_rounded, size: 16),
            label: const Text('Start First Scan'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryAccent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
