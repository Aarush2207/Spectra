import 'package:flutter/material.dart';
import '../../models/scan_result.dart';
import '../constants/app_colors.dart';

class RiskBadge extends StatelessWidget {
  final RiskLevel riskLevel;
  final bool large;

  const RiskBadge({super.key, required this.riskLevel, this.large = false});

  @override
  Widget build(BuildContext context) {
    final config = _config(riskLevel);
    final padding = large
        ? const EdgeInsets.symmetric(horizontal: 18, vertical: 8)
        : const EdgeInsets.symmetric(horizontal: 12, vertical: 5);
    final fontSize = large ? 15.0 : 11.5;

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.09),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(
          color: config.color.withValues(alpha: 0.35),
          width: 1.2,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(config.icon, color: config.color, size: large ? 18 : 13),
          const SizedBox(width: 6),
          Text(
            config.label,
            style: TextStyle(
              color: config.color,
              fontSize: fontSize,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }

  _RiskConfig _config(RiskLevel level) {
    switch (level) {
      case RiskLevel.low:
        return const _RiskConfig(
            AppColors.success, Icons.check_circle_rounded, 'LOW RISK');
      case RiskLevel.suspicious:
        return const _RiskConfig(
            AppColors.warning, Icons.warning_rounded, 'SUSPICIOUS');
      case RiskLevel.high:
        return const _RiskConfig(
            AppColors.danger, Icons.dangerous_rounded, 'HIGH RISK');
      case RiskLevel.unknown:
        return const _RiskConfig(
            AppColors.textMuted, Icons.help_rounded, 'INCONCLUSIVE');
    }
  }
}

class _RiskConfig {
  final Color color;
  final IconData icon;
  final String label;
  const _RiskConfig(this.color, this.icon, this.label);
}
