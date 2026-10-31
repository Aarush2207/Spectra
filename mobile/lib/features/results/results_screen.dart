import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/history_provider.dart';
import '../../core/providers/scan_provider.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/evidence_card.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/risk_badge.dart';
import '../../core/widgets/url_risk_card.dart';
import '../../data/supabase/supabase_service.dart';
import '../../models/scan_history_item.dart';
import '../../models/scan_result.dart';

class ResultsScreen extends ConsumerStatefulWidget {
  const ResultsScreen({super.key});

  @override
  ConsumerState<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends ConsumerState<ResultsScreen> {
  bool _savedToHistory = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final scanState = ref.read(scanProvider);
      final result = scanState.result;
      if (result != null) {
        final scanType = scanState.scanType == 'screenshot'
            ? ScanType.screenshot
            : scanState.scanType == 'url'
                ? ScanType.url
                : ScanType.text;
        ref.read(historyProvider.notifier).addScan(
              riskLevel: result.riskLevel,
              scanType: scanType,
              messagePreview: result.summary,
              riskScore: result.riskScore,
            );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final scanState = ref.watch(scanProvider);
    final result = scanState.result;

    if (result == null) {
      return const Scaffold(
        backgroundColor: AppColors.primaryBg,
        body: EmptyState(
          icon: Icons.error_outline_rounded,
          title: 'No results found',
          subtitle: 'Please start a new scan.',
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.primaryBg,
      body: CustomScrollView(
        slivers: [
          // ─── Risk hero ─────────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: _RiskHero(result: result),
          ),

          // ─── Summary ────────────────────────────────────────────────────────
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
            sliver: SliverToBoxAdapter(
              child: _SummaryCard(result: result)
                  .animate()
                  .fadeIn(delay: 200.ms, duration: 500.ms),
            ),
          ),

          // ─── Evidence ───────────────────────────────────────────────────────
          if (result.evidence.isNotEmpty)
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              sliver: SliverToBoxAdapter(
                child: _EvidenceSection(result: result)
                    .animate()
                    .fadeIn(delay: 400.ms, duration: 500.ms),
              ),
            ),

          // ─── URLs ───────────────────────────────────────────────────────────
          if (result.urls.isNotEmpty)
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              sliver: SliverToBoxAdapter(
                child: _UrlSection(result: result)
                    .animate()
                    .fadeIn(delay: 500.ms, duration: 500.ms),
              ),
            ),

          // ─── Recommendations ────────────────────────────────────────────────
          if (result.recommendations.isNotEmpty)
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              sliver: SliverToBoxAdapter(
                child: _RecommendationsSection(result: result)
                    .animate()
                    .fadeIn(delay: 600.ms, duration: 500.ms),
              ),
            ),

          // ─── Actions ────────────────────────────────────────────────────────
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
            sliver: SliverToBoxAdapter(
              child: _Actions(
                result: result,
                savedToHistory: _savedToHistory,
                onSave: _saveToHistory,
                onScanAnother: _scanAnother,
              ).animate().fadeIn(delay: 700.ms, duration: 500.ms),
            ),
          ),
        ],
      ),
    );
  }

  void _scanAnother() {
    ref.read(scanProvider.notifier).reset();
    context.go('/home');
  }

  Future<void> _saveToHistory() async {
    final result = ref.read(scanProvider).result;
    if (result == null || _savedToHistory) return;

    final authState = ref.read(authProvider);
    if (authState.status != AuthStatus.authenticated) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sign in to save scans to your history.'),
          ),
        );
      }
      return;
    }

    try {
      await SupabaseService.saveScanResult(
        result: result,
        scanType: ref.read(scanProvider).scanType,
      );

      // Refresh history list
      await ref.read(historyProvider.notifier).loadHistory();

      setState(() => _savedToHistory = true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Scan saved to history.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save: ${e.toString()}')),
        );
      }
    }
  }
}

// ─── Risk hero ────────────────────────────────────────────────────────────────
class _RiskHero extends StatelessWidget {
  final ScanResult result;

  const _RiskHero({required this.result});

  @override
  Widget build(BuildContext context) {
    final color = _riskColor(result.riskLevel);

    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
          20, MediaQuery.of(context).padding.top + 16, 20, 26),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.secondaryBg,
            color.withValues(alpha: 0.05),
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        border: Border(
          bottom: BorderSide(color: color.withValues(alpha: 0.2), width: 1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Back button
          GestureDetector(
            onTap: () => context.pop(),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.arrow_back_ios_rounded,
                    color: AppColors.textSecondary, size: 14),
                SizedBox(width: 4),
                Text(
                  'Back',
                  style: TextStyle(
                      color: AppColors.textSecondary, fontSize: 14, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          Text(
            'Scan Complete',
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: AppColors.textMuted, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 4),

          Row(
            children: [
              Expanded(
                child: Text(
                  'Risk Assessment',
                  style: Theme.of(context).textTheme.displaySmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                ),
              ),
              RiskBadge(riskLevel: result.riskLevel, large: true),
            ],
          ),

          const SizedBox(height: 18),

          // Risk score + confidence + threats
          Row(
            children: [
              if (result.riskScore != null) ...[
                _StatBox(
                  label: 'Risk Score',
                  value: '${result.riskScore}/100',
                  color: color,
                ),
                const SizedBox(width: 10),
              ],
              _StatBox(
                label: 'Confidence',
                value: result.confidence,
                color: _confidenceColor(result.confidence),
              ),
              const SizedBox(width: 10),
              _StatBox(
                label: 'Threats Found',
                value: '${result.evidence.length}',
                color: result.evidence.isEmpty
                    ? AppColors.success
                    : AppColors.danger,
              ),
            ],
          ),

          if (result.riskScore != null) ...[
            const SizedBox(height: 16),
            // Risk bar
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Risk Level',
                        style: TextStyle(
                            color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w500)),
                    Text(
                      '${result.riskScore}%',
                      style: TextStyle(
                          color: color,
                          fontSize: 11,
                          fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: (result.riskScore ?? 0) / 100,
                    backgroundColor: AppColors.border,
                    color: color,
                    minHeight: 6,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 500.ms)
        .slideY(begin: -0.04, duration: 500.ms, curve: Curves.easeOut);
  }

  Color _riskColor(RiskLevel level) {
    switch (level) {
      case RiskLevel.low:
        return AppColors.success;
      case RiskLevel.suspicious:
        return AppColors.warning;
      case RiskLevel.high:
        return AppColors.danger;
      case RiskLevel.unknown:
        return AppColors.textMuted;
    }
  }

  Color _confidenceColor(String c) {
    switch (c.toUpperCase()) {
      case 'HIGH':
        return AppColors.success;
      case 'MEDIUM':
        return AppColors.warning;
      default:
        return AppColors.textMuted;
    }
  }
}

class _StatBox extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatBox(
      {required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.22)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: const TextStyle(
                    color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600)),
            const SizedBox(height: 3),
            Text(
              value,
              style: TextStyle(
                  color: color, fontSize: 14.5, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Summary card ─────────────────────────────────────────────────────────────
class _SummaryCard extends StatelessWidget {
  final ScanResult result;

  const _SummaryCard({required this.result});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.summarize_rounded,
                  color: AppColors.primaryAccent, size: 18),
              const SizedBox(width: 8),
              Text(
                'Summary',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            result.summary,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 14,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 14),
          // Disclaimer
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: AppColors.secondaryBg,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.border),
            ),
            child: const Row(
              children: [
                Icon(Icons.info_outline_rounded,
                    color: AppColors.textMuted, size: 14),
                SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Spectra does not guarantee detection of every threat.',
                    style:
                        TextStyle(color: AppColors.textMuted, fontSize: 11),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Evidence section ─────────────────────────────────────────────────────────
class _EvidenceSection extends StatelessWidget {
  final ScanResult result;

  const _EvidenceSection({required this.result});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(
          icon: Icons.warning_amber_rounded,
          title: 'Suspicious Phrases',
          count: result.evidence.length,
          color: AppColors.danger,
        ),
        const SizedBox(height: 12),
        ...result.evidence
            .map((e) => EvidenceCard(evidence: e)),
      ],
    );
  }
}

// ─── URL section ──────────────────────────────────────────────────────────────
class _UrlSection extends StatelessWidget {
  final ScanResult result;

  const _UrlSection({required this.result});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(
          icon: Icons.link_rounded,
          title: 'URL Inspection',
          count: result.urls.length,
          color: AppColors.warning,
        ),
        const SizedBox(height: 12),
        ...result.urls.map((u) => UrlRiskCard(urlData: u)),
      ],
    );
  }
}

// ─── Recommendations ──────────────────────────────────────────────────────────
class _RecommendationsSection extends StatelessWidget {
  final ScanResult result;

  const _RecommendationsSection({required this.result});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader(
          icon: Icons.tips_and_updates_rounded,
          title: 'Safety Recommendations',
          color: AppColors.success,
        ),
        const SizedBox(height: 12),
        GlassCard(
          child: Column(
            children: result.recommendations
                .asMap()
                .entries
                .map(
                  (e) => Padding(
                    padding: EdgeInsets.only(
                        bottom: e.key < result.recommendations.length - 1
                            ? 12
                            : 0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            color: AppColors.success.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                            border: Border.all(
                                color: AppColors.success.withValues(alpha: 0.35)),
                          ),
                          child: Center(
                            child: Text(
                              '${e.key + 1}',
                              style: const TextStyle(
                                  color: AppColors.success,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            e.value,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 13.5,
                              height: 1.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
        ),
      ],
    );
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────
class _Actions extends StatelessWidget {
  final ScanResult result;
  final bool savedToHistory;
  final VoidCallback onSave;
  final VoidCallback onScanAnother;

  const _Actions({
    required this.result,
    required this.savedToHistory,
    required this.onSave,
    required this.onScanAnother,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        GradientButton(
          label: 'Scan Another Message',
          icon: Icons.search_rounded,
          onPressed: onScanAnother,
        ),
        const SizedBox(height: 12),
        if (!savedToHistory)
          OutlinedButton.icon(
            onPressed: onSave,
            icon: const Icon(Icons.bookmark_add_outlined, size: 18),
            label: const Text('Save to History'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 52),
              foregroundColor: AppColors.primaryAccent,
              side: const BorderSide(color: AppColors.border),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          )
        else
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check_rounded, color: AppColors.success, size: 18),
                SizedBox(width: 8),
                Text('Saved to History',
                    style: TextStyle(
                        color: AppColors.success, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
      ],
    );
  }
}

// ─── Section header ───────────────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  final int? count;
  final Color color;

  const _SectionHeader({
    required this.icon,
    required this.title,
    this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 8),
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
        ),
        if (count != null) ...[
          const SizedBox(width: 8),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                  color: color, fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ],
    );
  }
}
