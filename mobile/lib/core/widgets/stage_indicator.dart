import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_strings.dart';

class StageIndicator extends StatelessWidget {
  final int currentStage;

  const StageIndicator({super.key, required this.currentStage});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(AppStrings.analysisStages.length, (i) {
        final done = i < currentStage;
        final active = i == currentStage;
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            children: [
              _StepIcon(done: done, active: active, index: i),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  AppStrings.analysisStages[i],
                  style: TextStyle(
                    color: done
                        ? AppColors.success
                        : active
                            ? AppColors.textPrimary
                            : AppColors.textMuted,
                    fontSize: 14,
                    fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ),
              if (done)
                const Icon(Icons.check_circle_rounded,
                    color: AppColors.success, size: 18),
              if (active)
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.primaryAccent,
                  ),
                ),
            ],
          ),
        );
      }),
    );
  }
}

class _StepIcon extends StatelessWidget {
  final bool done;
  final bool active;
  final int index;

  const _StepIcon({required this.done, required this.active, required this.index});

  @override
  Widget build(BuildContext context) {
    Color color;
    if (done) {
      color = AppColors.success;
    } else if (active) {
      color = AppColors.primaryAccent;
    } else {
      color = AppColors.border;
    }

    final textColor = done
        ? AppColors.success
        : active
            ? AppColors.primaryAccent
            : AppColors.textMuted;

    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: active
            ? AppColors.accentTint
            : done
                ? AppColors.success.withValues(alpha: 0.1)
                : AppColors.secondaryBg,
        border: Border.all(
          color: active
              ? AppColors.primaryAccent
              : done
                  ? AppColors.success
                  : AppColors.border,
          width: 1.5,
        ),
      ),
      child: Center(
        child: Text(
          '${index + 1}',
          style: TextStyle(
            color: textColor,
            fontSize: 11,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
