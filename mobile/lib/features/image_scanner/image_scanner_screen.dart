import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/config/app_config.dart';
import '../../core/providers/scan_provider.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/spectra_logo.dart';

class ImageScannerScreen extends ConsumerStatefulWidget {
  const ImageScannerScreen({super.key});

  @override
  ConsumerState<ImageScannerScreen> createState() =>
      _ImageScannerScreenState();
}

class _ImageScannerScreenState extends ConsumerState<ImageScannerScreen> {
  File? _selectedImage;
  String? _error;
  final _picker = ImagePicker();

  Future<void> _pickImage(ImageSource source) async {
    setState(() => _error = null);
    try {
      final picked = await _picker.pickImage(
        source: source,
        maxWidth: 1280,
        maxHeight: 1280,
        imageQuality: 80,
      );
      if (picked == null) return;

      final file = File(picked.path);
      final sizeBytes = await file.length();

      // Validate size
      if (sizeBytes > AppConfig.maxImageSizeBytes) {
        setState(() => _error = AppStrings.errorFileTooLarge);
        return;
      }

      // Validate extension
      final ext = picked.path.split('.').last.toLowerCase();
      if (!AppConfig.allowedImageExtensions.contains(ext)) {
        setState(() => _error = AppStrings.errorInvalidFile);
        return;
      }

      setState(() => _selectedImage = file);
    } catch (e) {
      setState(() => _error = 'Could not pick image. Please try again.');
    }
  }

  Future<void> _analyze() async {
    if (_selectedImage == null) {
      setState(() => _error = AppStrings.errorNoImage);
      return;
    }
    ref.read(scanProvider.notifier).analyzeImage(_selectedImage!);
    context.push('/analysis-loading');
  }

  void _remove() => setState(() {
        _selectedImage = null;
        _error = null;
      });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primaryBg,
      appBar: AppBar(
        backgroundColor: AppColors.primaryBg,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded),
          onPressed: () => context.pop(),
        ),
        title: const SpectraLogoRow(iconSize: 28, fontSize: 16),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Screenshot Scanner',
                style: Theme.of(context).textTheme.displaySmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
              ).animate().fadeIn(duration: 400.ms),
              const SizedBox(height: 4),
              const Text(
                'Upload a screenshot to detect scams and fraud.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
              ).animate().fadeIn(delay: 100.ms, duration: 400.ms),
              const SizedBox(height: 20),

              // Image area
              GlassCard(
                padding: EdgeInsets.zero,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: _selectedImage != null
                      ? _ImagePreview(
                          image: _selectedImage!,
                          onRemove: _remove,
                          onChange: () => _pickImage(ImageSource.gallery),
                        )
                      : _PickerPlaceholder(onPick: _pickImage),
                ),
              ).animate().fadeIn(delay: 200.ms, duration: 500.ms),

              // Error
              if (_error != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.error_outline_rounded,
                        color: AppColors.danger, size: 15),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _error!,
                        style: const TextStyle(
                            color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ],

              const SizedBox(height: 24),

              // Analyze Button directly below the image preview
              GradientButton(
                label: AppStrings.analyzeScreenshot,
                icon: Icons.document_scanner_rounded,
                onPressed: _selectedImage == null ? null : _analyze,
              ).animate().fadeIn(delay: 300.ms),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Image preview ────────────────────────────────────────────────────────────
class _ImagePreview extends StatelessWidget {
  final File image;
  final VoidCallback onRemove;
  final VoidCallback onChange;

  const _ImagePreview(
      {required this.image, required this.onRemove, required this.onChange});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Image.file(
          image,
          width: double.infinity,
          height: 280,
          fit: BoxFit.cover,
        ),
        Positioned(
          top: 10,
          right: 10,
          child: Row(
            children: [
              _IconButton(
                icon: Icons.swap_horiz_rounded,
                label: 'Change',
                onTap: onChange,
                color: Colors.white,
                bgColor: const Color(0xFF0F172A).withValues(alpha: 0.75),
              ),
              const SizedBox(width: 8),
              _IconButton(
                icon: Icons.delete_outline_rounded,
                label: 'Remove',
                onTap: onRemove,
                color: Colors.white,
                bgColor: AppColors.danger.withValues(alpha: 0.85),
              ),
            ],
          ),
        ),
        Positioned(
          bottom: 10,
          left: 10,
          child: Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A).withValues(alpha: 0.75),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check_circle_rounded,
                    color: AppColors.success, size: 14),
                SizedBox(width: 5),
                Text(
                  'Image ready for analysis',
                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _IconButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color color;
  final Color bgColor;

  const _IconButton({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.color,
    required this.bgColor,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 14),
            const SizedBox(width: 4),
            Text(label,
                style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

// ─── Picker placeholder ───────────────────────────────────────────────────────
class _PickerPlaceholder extends StatelessWidget {
  final Future<void> Function(ImageSource) onPick;

  const _PickerPlaceholder({required this.onPick});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 280,
      color: AppColors.secondaryBg,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 76,
            height: 76,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.cardBg,
              border: Border.all(
                  color: AppColors.primaryAccent.withValues(alpha: 0.3),
                  width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primaryAccent.withValues(alpha: 0.08),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Icon(
              Icons.add_photo_alternate_rounded,
              color: AppColors.primaryAccent,
              size: 34,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Select a screenshot to analyze',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 18),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _PickerButton(
                icon: Icons.photo_library_rounded,
                label: 'Gallery',
                onTap: () => onPick(ImageSource.gallery),
              ),
              const SizedBox(width: 12),
              _PickerButton(
                icon: Icons.camera_alt_rounded,
                label: 'Camera',
                onTap: () => onPick(ImageSource.camera),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PickerButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _PickerButton(
      {required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
        decoration: BoxDecoration(
          color: AppColors.cardBg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: AppColors.primaryAccent, size: 18),
            const SizedBox(width: 8),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
