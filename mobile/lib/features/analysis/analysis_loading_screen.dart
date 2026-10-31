import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/providers/scan_provider.dart';
import '../../core/widgets/scanning_animation.dart';
import '../../core/widgets/stage_indicator.dart';

class AnalysisLoadingScreen extends ConsumerStatefulWidget {
  const AnalysisLoadingScreen({super.key});

  @override
  ConsumerState<AnalysisLoadingScreen> createState() =>
      _AnalysisLoadingScreenState();
}

class _AnalysisLoadingScreenState
    extends ConsumerState<AnalysisLoadingScreen> {
  bool _navigated = false;

  @override
  Widget build(BuildContext context) {
    final scanState = ref.watch(scanProvider);

    // Navigate when done or error
    if (!_navigated) {
      if (scanState.status == ScanStatus.success) {
        _navigated = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (context.mounted) {
            context.pushReplacement('/results');
          }
        });
      } else if (scanState.status == ScanStatus.error) {
        _navigated = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (context.mounted) {
            final errMsg = (scanState.errorMessage ?? '').toLowerCase();
            final isNoText = errMsg.contains('no readable text') ||
                errMsg.contains('no text found') ||
                errMsg.contains('no text detected') ||
                errMsg.contains('no visible text') ||
                errMsg.contains('image contains no text') ||
                errMsg.contains('does not contain any text') ||
                errMsg.contains('no text in this screenshot') ||
                errMsg.contains('no text in this image');

            if (isNoText) {
              // Immediately show popup dialog and cancel analyzing
              showDialog<void>(
                context: context,
                barrierDismissible: false,
                builder: (dialogCtx) => AlertDialog(
                  backgroundColor: AppColors.cardBg,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  icon: Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.text_snippet_outlined,
                      color: AppColors.warning,
                      size: 28,
                    ),
                  ),
                  title: const Text(
                    'No Text Found',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 18,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  content: const Text(
                    'No readable text was detected in this screenshot. Please upload an image with visible text, messages, or URLs to analyze.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13.5,
                      color: AppColors.textSecondary,
                      height: 1.45,
                    ),
                  ),
                  actionsAlignment: MainAxisAlignment.center,
                  actions: [
                    ElevatedButton(
                      onPressed: () {
                        Navigator.pop(dialogCtx);
                        ref.read(scanProvider.notifier).reset();
                        if (context.mounted) {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go('/home');
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryAccent,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 28, vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const Text('OK',
                          style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              );
            } else {
              if (context.canPop()) {
                context.pop();
              } else {
                context.go('/home');
              }
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded,
                          color: Colors.white, size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          scanState.errorMessage ?? AppStrings.errorGeneric,
                          style: const TextStyle(color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  backgroundColor: AppColors.danger,
                ),
              );
            }
          }
        });
      }
    }

    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) {
          ref.read(scanProvider.notifier).reset();
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.primaryBg,
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Animation
                  const ScanningAnimation(size: 210)
                      .animate()
                      .fadeIn(duration: 600.ms)
                      .scale(
                          begin: const Offset(0.75, 0.75),
                          duration: 600.ms,
                          curve: Curves.easeOut),
                  const SizedBox(height: 36),

                  // Title
                  ShaderMask(
                    shaderCallback: (b) =>
                        AppColors.primaryGradient.createShader(b),
                    child: const Text(
                      'Analyzing...',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                  )
                      .animate()
                      .fadeIn(delay: 200.ms, duration: 500.ms),
                  const SizedBox(height: 8),

                  const Text(
                    'Please wait while Spectra examines your message',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 14),
                  )
                      .animate()
                      .fadeIn(delay: 300.ms, duration: 500.ms),
                  const SizedBox(height: 32),

                  // Stage indicator
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.cardBg,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F172A).withValues(alpha: 0.04),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: StageIndicator(
                        currentStage: scanState.currentStage),
                  )
                      .animate()
                      .fadeIn(delay: 400.ms, duration: 500.ms)
                      .slideY(begin: 0.08, duration: 500.ms),

                  const SizedBox(height: 24),

                  // Security notice
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.primaryAccent.withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: AppColors.primaryAccent.withValues(alpha: 0.18)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.lock_rounded,
                            color: AppColors.primaryAccent, size: 14),
                        SizedBox(width: 8),
                        Text(
                          'Your data is processed securely',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  )
                      .animate()
                      .fadeIn(delay: 500.ms, duration: 400.ms),

                  const SizedBox(height: 16),

                  // Cancel Button
                  TextButton.icon(
                    onPressed: () {
                      ref.read(scanProvider.notifier).reset();
                      if (context.canPop()) {
                        context.pop();
                      } else {
                        context.go('/home');
                      }
                    },
                    icon: const Icon(Icons.close_rounded,
                        size: 16, color: AppColors.textMuted),
                    label: const Text(
                      'Cancel Analysis',
                      style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ).animate().fadeIn(delay: 600.ms, duration: 300.ms),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
