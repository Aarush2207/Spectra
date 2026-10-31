import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/config/app_config.dart';
import '../../core/constants/app_strings.dart';
import '../../core/providers/scan_provider.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/spectra_logo.dart';

class TextScannerScreen extends ConsumerStatefulWidget {
  const TextScannerScreen({super.key});

  @override
  ConsumerState<TextScannerScreen> createState() => _TextScannerScreenState();
}

class _TextScannerScreenState extends ConsumerState<TextScannerScreen> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _pasteFromClipboard() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    if (data?.text != null) {
      _controller.text = data!.text!;
      setState(() => _error = null);
    }
  }

  void _clear() {
    _controller.clear();
    setState(() => _error = null);
  }

  Future<void> _analyze() async {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      setState(() => _error = AppStrings.errorEmpty);
      return;
    }
    if (text.length < AppConfig.minTextLength) {
      setState(() => _error =
          'Message too short. Please enter at least ${AppConfig.minTextLength} characters.');
      return;
    }
    setState(() => _error = null);
    ref.read(scanProvider.notifier).analyzeText(text);
    context.push('/analysis-loading');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: AppColors.primaryBg,
      appBar: AppBar(
        backgroundColor: AppColors.primaryBg,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded),
          onPressed: () => context.pop(),
        ),
        title: const SpectraLogoRow(iconSize: 28, fontSize: 16),
      ),
      body: GestureDetector(
        onTap: () => _focusNode.unfocus(),
        child: SafeArea(
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title
                Text(
                  'Text Scanner',
                  style: Theme.of(context).textTheme.displaySmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                ).animate().fadeIn(duration: 400.ms),
                const SizedBox(height: 4),
                const Text(
                  'Paste or type a suspicious message to analyze it.',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
                ).animate().fadeIn(delay: 100.ms, duration: 400.ms),
                const SizedBox(height: 20),

                // Input card
                GlassCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.message_rounded,
                              color: AppColors.primaryAccent, size: 18),
                          const SizedBox(width: 8),
                          const Text(
                            'Suspicious Message',
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const Spacer(),
                          // Paste button
                          GestureDetector(
                            onTap: _pasteFromClipboard,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color:
                                    AppColors.primaryAccent.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                    color: AppColors.primaryAccent
                                        .withValues(alpha: 0.25)),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.content_paste_rounded,
                                      color: AppColors.primaryAccent,
                                      size: 13),
                                  SizedBox(width: 4),
                                  Text(
                                    'Paste',
                                    style: TextStyle(
                                      color: AppColors.primaryAccent,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _controller,
                        focusNode: _focusNode,
                        maxLines: 8,
                        minLines: 5,
                        onChanged: (_) => setState(() {}),
                        decoration: InputDecoration(
                          hintText: AppStrings.pasteHint,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide:
                                const BorderSide(color: AppColors.border),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide:
                                const BorderSide(color: AppColors.border),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(
                                color: AppColors.primaryAccent, width: 1.5),
                          ),
                          filled: true,
                          fillColor: AppColors.secondaryBg,
                        ),
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 14,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Text(
                            '${_controller.text.length} characters',
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const Spacer(),
                          if (_controller.text.isNotEmpty)
                            GestureDetector(
                              onTap: _clear,
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.clear_rounded,
                                      color: AppColors.textMuted, size: 14),
                                  SizedBox(width: 4),
                                  Text(
                                    'Clear',
                                    style: TextStyle(
                                      color: AppColors.textMuted,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 200.ms, duration: 500.ms),

                // Error message
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(Icons.error_outline_rounded,
                          color: AppColors.danger, size: 15),
                      const SizedBox(width: 6),
                      Text(
                        _error!,
                        style: const TextStyle(
                            color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: 24),

                GradientButton(
                  label: AppStrings.analyzeMessage,
                  icon: Icons.search_rounded,
                  onPressed:
                      _controller.text.trim().isEmpty ? null : _analyze,
                ).animate().fadeIn(delay: 300.ms, duration: 400.ms),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
