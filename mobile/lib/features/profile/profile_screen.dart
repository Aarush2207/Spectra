import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/history_provider.dart';
import '../../core/providers/settings_provider.dart';
import '../../data/repositories/scan_repository.dart';
import '../../data/supabase/supabase_service.dart';
import '../../models/scan_history_item.dart';
import '../../models/scan_result.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/spectra_logo.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  String? _customDisplayName;

  @override
  void initState() {
    super.initState();
    _loadProfileData();
  }

  Future<void> _loadProfileData() async {
    final profile = await SupabaseService.fetchProfile();
    if (profile != null && profile['display_name'] != null && mounted) {
      setState(() {
        _customDisplayName = profile['display_name'] as String?;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final history = ref.watch(historyProvider);
    final settings = ref.watch(settingsProvider);
    final isAuthenticated = authState.status == AuthStatus.authenticated;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: AppColors.primaryBg,
      body: CustomScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        slivers: [
          // Header & User Avatar
          SliverToBoxAdapter(
            child: _ProfileHeroHeader(
              authState: authState,
              displayName: _customDisplayName,
              onEditName: () => _showEditNameSheet(context),
            ),
          ),

          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Scan Stats Counter
                _ScanStatsGrid(history: history)
                    .animate()
                    .fadeIn(duration: 400.ms)
                    .slideY(begin: 0.05, duration: 400.ms),
                const SizedBox(height: 16),

                // Guest banner (if not logged in)
                if (!isAuthenticated) ...[
                  _GuestPromoCard()
                      .animate()
                      .fadeIn(delay: 150.ms, duration: 400.ms),
                  const SizedBox(height: 16),
                ],

                // Security & App Preferences
                _SettingsSection(
                  settings: settings,
                  ref: ref,
                ).animate().fadeIn(delay: 200.ms, duration: 400.ms),
                const SizedBox(height: 16),

                // Cloud Services & AI Engine Status
                const _CloudEngineSection()
                    .animate()
                    .fadeIn(delay: 250.ms, duration: 400.ms),
                const SizedBox(height: 16),

                // Data & Privacy Management
                _DataPrivacySection(ref: ref)
                    .animate()
                    .fadeIn(delay: 300.ms, duration: 400.ms),
                const SizedBox(height: 16),

                // About & App Information
                _AboutSpectraSection()
                    .animate()
                    .fadeIn(delay: 350.ms, duration: 400.ms),
                const SizedBox(height: 24),

                // Logout Button (when authenticated)
                if (isAuthenticated)
                  _LogoutButton(onLogout: () => _confirmSignOut(context))
                      .animate()
                      .fadeIn(delay: 400.ms, duration: 400.ms),

                // Login / Create Account Button (when guest / not authenticated)
                if (!isAuthenticated)
                  _LoginButton(onLogin: () => context.push('/auth'))
                      .animate()
                      .fadeIn(delay: 400.ms, duration: 400.ms),

                const SizedBox(height: 16),
                // Footer
                Center(
                  child: Text(
                    'Spectra v${AppStrings.version} • Built with Pride',
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showEditNameSheet(BuildContext ctx) async {
    final controller = TextEditingController(text: _customDisplayName ?? '');
    await showModalBottomSheet<void>(
      context: ctx,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: AppColors.cardBg,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.edit_rounded,
                        color: AppColors.primaryAccent, size: 20),
                    const SizedBox(width: 8),
                    const Text(
                      'Edit Display Name',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.close_rounded,
                          color: AppColors.textMuted),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: controller,
                  autofocus: true,
                  style: const TextStyle(color: AppColors.textPrimary),
                  decoration: const InputDecoration(
                    labelText: 'Full Name / Display Name',
                    hintText: 'e.g. Aarush',
                    prefixIcon: Icon(Icons.person_outline_rounded,
                        color: AppColors.textMuted),
                  ),
                ),
                const SizedBox(height: 20),
                GradientButton(
                  label: 'Save Changes',
                  icon: Icons.check_rounded,
                  onPressed: () async {
                    final newName = controller.text.trim();
                    if (newName.isNotEmpty) {
                      await SupabaseService.updateDisplayName(newName);
                      if (mounted) {
                        setState(() => _customDisplayName = newName);
                      }
                    }
                    if (context.mounted) Navigator.pop(context);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _confirmSignOut(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: AppColors.cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: AppColors.danger, size: 22),
            SizedBox(width: 10),
            Text(
              'Sign Out?',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
        content: const Text(
          'Are you sure you want to sign out? Your saved history will remain safe in the cloud.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Cancel',
                style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(c, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Log Out'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await ref.read(authProvider.notifier).signOut();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle_outline_rounded,
                    color: Colors.white, size: 18),
                SizedBox(width: 8),
                Text('You have been signed out successfully.'),
              ],
            ),
            backgroundColor: Color(0xFF0F172A),
          ),
        );
      }
    }
  }
}

// ─── Profile Hero Header ───────────────────────────────────────────────────────
class _ProfileHeroHeader extends StatelessWidget {
  final AuthState authState;
  final String? displayName;
  final VoidCallback onEditName;

  const _ProfileHeroHeader({
    required this.authState,
    this.displayName,
    required this.onEditName,
  });

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = authState.status == AuthStatus.authenticated;
    final user = authState.user;
    final email = user?.email ?? 'guest@spectra.local';
    final name = displayName ??
        user?.userMetadata?['display_name'] as String? ??
        (isAuthenticated ? 'Spectra Member' : 'Guest User');

    final initial = name.isNotEmpty
        ? name.substring(0, 1).toUpperCase()
        : (email.isNotEmpty ? email.substring(0, 1).toUpperCase() : 'S');

    return Container(
      padding: EdgeInsets.fromLTRB(
          20, MediaQuery.of(context).padding.top + 16, 20, 24),
      decoration: const BoxDecoration(
        color: AppColors.secondaryBg,
        border: Border(
          bottom: BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Avatar
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: AppColors.primaryGradient,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryAccent.withValues(alpha: 0.25),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    initial,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              // User Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            name,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isAuthenticated) ...[
                          const SizedBox(width: 6),
                          GestureDetector(
                            onTap: onEditName,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: AppColors.primaryAccent
                                    .withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.edit_rounded,
                                  size: 13, color: AppColors.primaryAccent),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      isAuthenticated ? email : 'Local Guest Account',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: (isAuthenticated
                                    ? AppColors.success
                                    : AppColors.warning)
                                .withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: (isAuthenticated
                                      ? AppColors.success
                                      : AppColors.warning)
                                  .withValues(alpha: 0.3),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isAuthenticated
                                    ? Icons.verified_rounded
                                    : Icons.info_outline_rounded,
                                size: 11,
                                color: isAuthenticated
                                    ? AppColors.success
                                    : AppColors.warning,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                isAuthenticated
                                    ? 'Verified Cloud Sync'
                                    : 'Guest — Scans Saved Locally',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: isAuthenticated
                                      ? AppColors.success
                                      : AppColors.warning,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (!isAuthenticated) ...[
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () => context.push('/auth'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 9, vertical: 3),
                              decoration: BoxDecoration(
                                gradient: AppColors.primaryGradient,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.login_rounded,
                                      size: 11, color: Colors.white),
                                  SizedBox(width: 4),
                                  Text(
                                    'Log In',
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Scan Stats Quick Grid ────────────────────────────────────────────────────
class _ScanStatsGrid extends StatelessWidget {
  final List<ScanHistoryItem> history;

  const _ScanStatsGrid({required this.history});

  @override
  Widget build(BuildContext context) {
    final total = history.length;
    final threats = history.where((i) => i.riskLevel == RiskLevel.high).length;
    final safe = history.where((i) => i.riskLevel == RiskLevel.low).length;

    return Row(
      children: [
        Expanded(
          child: _StatCard(
            label: 'Total Scans',
            value: total.toString(),
            icon: Icons.qr_code_scanner_rounded,
            color: AppColors.primaryAccent,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            label: 'Threats Blocked',
            value: threats.toString(),
            icon: Icons.shield_rounded,
            color: AppColors.danger,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            label: 'Safe Verified',
            value: safe.toString(),
            icon: Icons.check_circle_rounded,
            color: AppColors.success,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Guest Promo Card ─────────────────────────────────────────────────────────
class _GuestPromoCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      borderColor: AppColors.primaryAccent.withValues(alpha: 0.3),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primaryAccent.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.cloud_sync_rounded,
                color: AppColors.primaryAccent, size: 24),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Sign In to Sync Scans',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Access your history on any device with Supabase cloud backup.',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: () => context.push('/auth'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              backgroundColor: AppColors.primaryAccent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Log In', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

// ─── Settings & Preferences ───────────────────────────────────────────────────
class _SettingsSection extends StatelessWidget {
  final AppSettings settings;
  final WidgetRef ref;

  const _SettingsSection({required this.settings, required this.ref});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.tune_rounded,
                  color: AppColors.primaryAccent, size: 18),
              const SizedBox(width: 8),
              Text(
                'Security & Preferences',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _ToggleRow(
            icon: Icons.fingerprint_rounded,
            title: 'Biometric App Lock',
            subtitle: 'Require biometric security to open Spectra',
            value: settings.biometricLock,
            onChanged: (val) =>
                ref.read(settingsProvider.notifier).toggleBiometricLock(val),
          ),
          const Divider(height: 20, color: AppColors.border),
          _ToggleRow(
            icon: Icons.notifications_active_rounded,
            title: 'Threat Detection Alerts',
            subtitle: 'Immediate warnings when high-risk content is spotted',
            value: settings.realTimeNotifications,
            onChanged: (val) =>
                ref.read(settingsProvider.notifier).toggleNotifications(val),
          ),
          const Divider(height: 20, color: AppColors.border),
          _ToggleRow(
            icon: Icons.content_paste_search_rounded,
            title: 'Auto-Check Copied Links',
            subtitle: 'Proactively suggest inspecting links copied to clipboard',
            value: settings.autoCheckClipboard,
            onChanged: (val) =>
                ref.read(settingsProvider.notifier).toggleAutoClipboard(val),
          ),
        ],
      ),
    );
  }
}

class _ToggleRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _ToggleRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppColors.secondaryBg,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: AppColors.primaryAccent, size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        Switch.adaptive(
          value: value,
          activeColor: AppColors.primaryAccent,
          onChanged: onChanged,
        ),
      ],
    );
  }
}

// ─── Cloud & AI Engine Status ─────────────────────────────────────────────────
class _CloudEngineSection extends StatefulWidget {
  const _CloudEngineSection();

  @override
  State<_CloudEngineSection> createState() => _CloudEngineSectionState();
}

class _CloudEngineSectionState extends State<_CloudEngineSection> {
  bool _testing = false;
  String? _testResult;
  bool _isSuccess = false;

  Future<void> _verifyServices() async {
    setState(() {
      _testing = true;
      _testResult = null;
    });

    try {
      final repo = ScanRepository();
      final isHealthy = await repo.healthCheck();

      setState(() {
        _testing = false;
        _isSuccess = isHealthy;
        _testResult = isHealthy
            ? 'OpenRouter AI & Cloud Security Services are active and responsive!'
            : 'Service returned degraded status.';
      });
    } catch (e) {
      setState(() {
        _testing = false;
        _isSuccess = false;
        _testResult = 'Connection check failed: ${e.toString()}';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.cloud_done_rounded,
                  color: AppColors.primaryAccent, size: 18),
              const SizedBox(width: 8),
              Text(
                'AI & Cloud Intelligence',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _ServiceTile(
            icon: Icons.auto_awesome_rounded,
            title: 'OpenRouter Multimodal Vision AI',
            subtitle: 'Neural reasoning & image OCR active',
            color: AppColors.primaryAccent,
          ),
          const SizedBox(height: 8),
          _ServiceTile(
            icon: Icons.bolt_rounded,
            title: 'Supabase Cloud Database',
            subtitle: 'Row Level Security (RLS) encrypted sync',
            color: AppColors.success,
          ),
          const SizedBox(height: 8),
          _ServiceTile(
            icon: Icons.shield_rounded,
            title: 'Passive URL Inspection Engine',
            subtitle: 'Zero external navigation static analysis',
            color: AppColors.secondaryAccent,
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: _testing ? null : _verifyServices,
            icon: _testing
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.check_circle_outline_rounded, size: 16),
            label: Text(_testing ? 'Verifying...' : 'Verify Cloud AI Services'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 42),
              foregroundColor: AppColors.primaryAccent,
              side: BorderSide(
                  color: AppColors.primaryAccent.withValues(alpha: 0.3)),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
          ),
          if (_testResult != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: (_isSuccess ? AppColors.success : AppColors.danger)
                    .withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: (_isSuccess ? AppColors.success : AppColors.danger)
                      .withValues(alpha: 0.25),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    _isSuccess
                        ? Icons.check_circle_rounded
                        : Icons.error_outline_rounded,
                    color: _isSuccess ? AppColors.success : AppColors.danger,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _testResult!,
                      style: TextStyle(
                        color:
                            _isSuccess ? AppColors.success : AppColors.danger,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ServiceTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;

  const _ServiceTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.secondaryBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
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
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: AppColors.success,
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Data & Privacy Management ────────────────────────────────────────────────
class _DataPrivacySection extends StatelessWidget {
  final WidgetRef ref;

  const _DataPrivacySection({required this.ref});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.privacy_tip_rounded,
                  color: AppColors.primaryAccent, size: 18),
              const SizedBox(width: 8),
              Text(
                'Data & Privacy',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'Spectra processes messages and screenshots strictly on-demand. '
            'No raw message contents or screenshots are ever sold or permanently archived.',
            style: TextStyle(
              fontSize: 12.5,
              color: AppColors.textSecondary,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: () => _confirmClearHistory(context),
            icon: const Icon(Icons.delete_sweep_rounded,
                color: AppColors.danger, size: 16),
            label: const Text('Clear All Scan History',
                style: TextStyle(color: AppColors.danger)),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 42),
              side: BorderSide(color: AppColors.danger.withValues(alpha: 0.3)),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmClearHistory(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: AppColors.cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Clear Scan History?'),
        content: const Text(
          'This will permanently delete your stored scan results and findings.',
          style: TextStyle(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Cancel',
                style: TextStyle(color: AppColors.textSecondary)),
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
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Scan history cleared.'),
            backgroundColor: Color(0xFF0F172A),
          ),
        );
      }
    }
  }
}

// ─── About Section ────────────────────────────────────────────────────────────
class _AboutSpectraSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.info_outline_rounded,
                  color: AppColors.primaryAccent, size: 18),
              const SizedBox(width: 8),
              Text(
                'About Spectra',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            AppStrings.aboutDescription,
            style: TextStyle(
              fontSize: 12.5,
              color: AppColors.textSecondary,
              height: 1.55,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.secondaryBg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: const Row(
              children: [
                Icon(Icons.shield_outlined,
                    color: AppColors.primaryAccent, size: 18),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Built for the Cybersecurity AI Hackathon by Team Spectra.',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
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

// ─── Logout Button ────────────────────────────────────────────────────────────
class _LogoutButton extends StatelessWidget {
  final VoidCallback onLogout;

  const _LogoutButton({required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onLogout,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.danger.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.logout_rounded, color: AppColors.danger, size: 18),
            SizedBox(width: 8),
            Text(
              'Sign Out of Spectra',
              style: TextStyle(
                color: AppColors.danger,
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Login Button (Guest mode) ────────────────────────────────────────────────
class _LoginButton extends StatelessWidget {
  final VoidCallback onLogin;

  const _LoginButton({required this.onLogin});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onLogin,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          gradient: AppColors.primaryGradient,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryAccent.withValues(alpha: 0.25),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.login_rounded, color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text(
              'Log In / Create Account',
              style: TextStyle(
                color: Colors.white,
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
