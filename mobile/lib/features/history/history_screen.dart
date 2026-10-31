import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/history_provider.dart';
import '../../core/providers/scan_provider.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/risk_badge.dart';
import '../../data/supabase/supabase_service.dart';
import '../../models/scan_history_item.dart';
import '../home/main_shell.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  @override
  void initState() {
    super.initState();
    // Refresh history from Supabase when screen is shown
    Future.microtask(() {
      ref.read(historyProvider.notifier).loadHistory();
    });
  }

  @override
  Widget build(BuildContext context) {
    final history = ref.watch(historyProvider);
    final authState = ref.watch(authProvider);
    final isGuest = authState.status != AuthStatus.authenticated;

    return Scaffold(
      backgroundColor: AppColors.primaryBg,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Row(children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Scan History',
                      style: Theme.of(context).textTheme.displaySmall?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isGuest
                          ? 'Sign in to save scans'
                          : '${history.length} scan${history.length == 1 ? '' : 's'} recorded',
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => ref.read(homeTabProvider.notifier).state = 1,
                  icon: const Icon(Icons.insights_rounded,
                      color: AppColors.primaryAccent),
                  tooltip: 'View Graphical Analytics',
                ),
                if (history.isNotEmpty) ...[
                  const SizedBox(width: 4),
                  TextButton.icon(
                    onPressed: () => _confirmClear(context, ref),
                    icon: const Icon(Icons.delete_sweep_rounded,
                        color: AppColors.danger, size: 18),
                    label: const Text(
                      'Clear All',
                      style: TextStyle(
                          color: AppColors.danger, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ]),
            ).animate().fadeIn(duration: 400.ms),

            // Privacy note
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.secondaryBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Icon(
                      isGuest
                          ? Icons.person_outline_rounded
                          : Icons.privacy_tip_rounded,
                      color: isGuest ? AppColors.warning : AppColors.success,
                      size: 15,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        isGuest
                            ? 'Sign in to save and sync your scan history across devices.'
                            : 'Only risk levels and dates are stored. '
                                'No raw messages or screenshots.',
                        style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 11.5,
                            height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
            ).animate().fadeIn(delay: 100.ms, duration: 400.ms),

            const SizedBox(height: 16),

            // List
            Expanded(
              child: isGuest
                  ? const EmptyState(
                      icon: Icons.lock_outline_rounded,
                      title: 'Sign in required',
                      subtitle:
                          'Create an account to save your scan history securely.',
                    )
                  : history.isEmpty
                      ? const EmptyState(
                          icon: Icons.history_rounded,
                          title: 'No scans yet',
                          subtitle: AppStrings.historyEmpty,
                        )
                      : RefreshIndicator(
                          onRefresh: () =>
                              ref.read(historyProvider.notifier).loadHistory(),
                          color: AppColors.primaryAccent,
                          backgroundColor: AppColors.cardBg,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                            itemCount: history.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 10),
                            itemBuilder: (ctx, i) => _HistoryItem(
                              item: history[i],
                              onDelete: () => ref
                                  .read(historyProvider.notifier)
                                  .removeItem(history[i].id),
                            )
                                .animate()
                                .fadeIn(
                                    delay: Duration(milliseconds: 50 * i),
                                    duration: 300.ms)
                                .slideX(begin: 0.04, duration: 300.ms),
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmClear(BuildContext ctx, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: ctx,
      builder: (c) => AlertDialog(
        backgroundColor: AppColors.cardBg,
        title: const Text('Clear History?'),
        content: const Text(
          AppStrings.historyClearConfirm,
          style: TextStyle(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(c, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
            ),
            child: const Text('Clear All'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      ref.read(historyProvider.notifier).clearAll();
    }
  }
}

class _HistoryItem extends ConsumerWidget {
  final ScanHistoryItem item;
  final VoidCallback onDelete;

  const _HistoryItem({required this.item, required this.onDelete});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Dismissible(
      key: Key(item.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: AppColors.danger.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
        ),
        child: const Icon(Icons.delete_rounded, color: AppColors.danger),
      ),
      onDismissed: (_) => onDelete(),
      child: GestureDetector(
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
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              // Icon
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppColors.secondaryBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: Icon(
                  item.scanType == ScanType.text
                      ? Icons.text_snippet_rounded
                      : item.scanType == ScanType.url
                          ? Icons.link_rounded
                          : Icons.image_rounded,
                  color: AppColors.primaryAccent,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              // Info
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
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _formatDate(item.timestamp),
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 12),
                    ),
                    if (item.messagePreview != null) ...[
                      const SizedBox(height: 3),
                      Text(
                        item.messagePreview!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: AppColors.textSecondary, fontSize: 12),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  RiskBadge(riskLevel: item.riskLevel),
                  const SizedBox(height: 6),
                  const Icon(Icons.chevron_right_rounded,
                      color: AppColors.textMuted, size: 16),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year} • $h:$m';
  }
}
