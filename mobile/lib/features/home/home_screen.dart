import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/providers/history_provider.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/risk_badge.dart';
import '../../core/widgets/spectra_logo.dart';
import '../../models/scan_history_item.dart';
import '../../core/providers/scan_provider.dart';
import '../../data/supabase/supabase_service.dart';
import 'main_shell.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(historyProvider);
    final recentItems = history.take(3).toList();

    return Scaffold(
      backgroundColor: AppColors.primaryBg,
      body: CustomScrollView(
        slivers: [
          // ─── Header ───────────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: _HomeHeader(),
          ),
          // ─── Analyze card ─────────────────────────────────────────────────
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            sliver: SliverToBoxAdapter(
              child: _AnalyzeCard()
                  .animate()
                  .fadeIn(delay: 200.ms, duration: 500.ms)
                  .slideY(begin: 0.08, duration: 500.ms),
            ),
          ),
          // ─── Feature cards ────────────────────────────────────────────────
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            sliver: SliverToBoxAdapter(
              child: _FeatureSection()
                  .animate()
                  .fadeIn(delay: 400.ms, duration: 500.ms),
            ),
          ),
          // ─── Analytics shortcut card ──────────────────────────────────────
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            sliver: SliverToBoxAdapter(
              child: _AnalyticsShortcutCard()
                  .animate()
                  .fadeIn(delay: 500.ms, duration: 500.ms),
            ),
          ),
          // ─── Recent scans ─────────────────────────────────────────────────
          if (recentItems.isNotEmpty)
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
              sliver: SliverToBoxAdapter(
                child: _RecentScans(items: recentItems)
                    .animate()
                    .fadeIn(delay: 600.ms, duration: 500.ms),
              ),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: 20)),
        ],
      ),
    );
  }
}

// ─── Header ──────────────────────────────────────────────────────────────────
class _HomeHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 56, 20, 24),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.secondaryBg,
            AppColors.primaryBg,
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const SpectraLogoRow(iconSize: 36, fontSize: 18),
              const Spacer(),
              // Security status indicator
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: AppColors.success.withValues(alpha: 0.3), width: 1),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.security_rounded,
                        color: AppColors.success, size: 13),
                    SizedBox(width: 5),
                    Text(
                      'Protected',
                      style: TextStyle(
                        color: AppColors.success,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          )
              .animate()
              .fadeIn(duration: 500.ms)
              .slideY(begin: -0.1, duration: 500.ms),
          const SizedBox(height: 20),
          Text(
            AppStrings.greeting,
            style: Theme.of(context).textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  height: 1.2,
                ),
          )
              .animate()
              .fadeIn(delay: 150.ms, duration: 500.ms)
              .slideX(begin: -0.05, duration: 500.ms),
          const SizedBox(height: 4),
          Text(
            AppStrings.taglineShort,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
          )
              .animate()
              .fadeIn(delay: 250.ms, duration: 500.ms),
        ],
      ),
    );
  }
}

// ─── Main analyze card ────────────────────────────────────────────────────────
class _AnalyzeCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(18),
      borderColor: AppColors.primaryAccent.withValues(alpha: 0.25),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryAccent.withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(Icons.search_rounded,
                    color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Text(
                AppStrings.analyzeCard,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _AnalyzeOption(
                  icon: Icons.edit_note_rounded,
                  label: 'Paste\nMessage',
                  color: AppColors.primaryAccent,
                  onTap: () => context.push('/text-scanner'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _AnalyzeOption(
                  icon: Icons.image_search_rounded,
                  label: 'Upload\nScreenshot',
                  color: AppColors.secondaryAccent,
                  onTap: () => context.push('/image-scanner'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _AnalyzeOption(
                  icon: Icons.travel_explore_rounded,
                  label: 'Check\nURL',
                  color: AppColors.warning,
                  onTap: () => context.push('/url-scanner'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AnalyzeOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _AnalyzeOption({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.22), width: 1.2),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 26),
            ),
            const SizedBox(height: 10),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: color,
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                height: 1.35,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Feature section ──────────────────────────────────────────────────────────
class _FeatureSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final features = [
      _FeatureItem(
        icon: Icons.psychology_rounded,
        title: 'AI-Powered Detection',
        subtitle: 'Neural AI analyses context and intent',
        color: AppColors.primaryAccent,
      ),
      _FeatureItem(
        icon: Icons.document_scanner_rounded,
        title: 'Smart OCR Analysis',
        subtitle: 'Extract text from any screenshot',
        color: AppColors.secondaryAccent,
      ),
      _FeatureItem(
        icon: Icons.link_off_rounded,
        title: 'Safe URL Inspection',
        subtitle: 'URLs are checked, never opened',
        color: AppColors.success,
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          AppStrings.howProtects,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
        ),
        const SizedBox(height: 12),
        ...features.map(
          (f) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _FeatureCard(item: f),
          ),
        ),
      ],
    );
  }
}

class _FeatureItem {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;

  const _FeatureItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
  });
}

class _FeatureCard extends StatelessWidget {
  final _FeatureItem item;

  const _FeatureCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: item.color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(item.icon, color: item.color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  item.subtitle,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded,
              color: AppColors.textMuted, size: 20),
        ],
      ),
    );
  }
}

// ─── Recent scans ─────────────────────────────────────────────────────────────
class _RecentScans extends ConsumerWidget {
  final List<ScanHistoryItem> items;

  const _RecentScans({required this.items});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Recent Scans',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
            ),
            const Spacer(),
            TextButton(
              onPressed: () => ref.read(homeTabProvider.notifier).state = 2,
              child: const Text('View all'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...items.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _HistoryListTile(item: item),
            )),
      ],
    );
  }
}

class _HistoryListTile extends ConsumerWidget {
  final ScanHistoryItem item;

  const _HistoryListTile({required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () async {
        final detail = await SupabaseService.fetchScanDetail(item.id);
        if (detail != null && context.mounted) {
          ref.read(scanProvider.notifier).loadExistingResult(
                detail,
                item.scanType.name,
              );
          context.push('/results');
        }
      },
      child: GlassCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.secondaryBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
              ),
              child: Icon(
                item.scanType == ScanType.text
                    ? Icons.text_snippet_rounded
                    : item.scanType == ScanType.url
                        ? Icons.link_rounded
                        : Icons.image_rounded,
                color: AppColors.primaryAccent,
                size: 18,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.scanType == ScanType.text
                        ? 'Text Scan'
                        : item.scanType == ScanType.url
                            ? 'URL Scan'
                            : 'Screenshot Scan',
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _formatDate(item.timestamp),
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            RiskBadge(riskLevel: item.riskLevel),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

class _AnalyticsShortcutCard extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => ref.read(homeTabProvider.notifier).state = 1,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFEBF3FD), Color(0xFFF1F6FD)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.primaryAccent.withValues(alpha: 0.2),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.primaryAccent.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.insights_rounded,
                  color: AppColors.primaryAccent, size: 24),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Security Graphs & Analytics',
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'View risk distribution, modality breakdown & 7-day threat curves.',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded,
                size: 14, color: AppColors.primaryAccent),
          ],
        ),
      ),
    );
  }
}
