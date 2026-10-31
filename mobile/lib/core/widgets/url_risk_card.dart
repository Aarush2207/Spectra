import 'package:flutter/material.dart';
import '../../models/suspicious_url.dart';
import '../constants/app_colors.dart';

class UrlRiskCard extends StatelessWidget {
  final SuspiciousUrl urlData;

  const UrlRiskCard({super.key, required this.urlData});

  @override
  Widget build(BuildContext context) {
    final color = _riskColor(urlData.risk);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.link_rounded, color: color, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  urlData.url,
                  style: TextStyle(
                    color: color,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'monospace',
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              _RiskChip(risk: urlData.risk, color: color),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.warning_amber_rounded,
                  color: AppColors.textMuted, size: 15),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  urlData.reason,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12.5,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.secondaryBg,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.border),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.shield_outlined, color: AppColors.primaryAccent, size: 13),
                SizedBox(width: 6),
                Text(
                  'URL inspected safely (never opened)',
                  style: TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _riskColor(String risk) {
    switch (risk.toUpperCase()) {
      case 'HIGH':
        return AppColors.danger;
      case 'SUSPICIOUS':
      case 'MEDIUM':
        return AppColors.warning;
      default:
        return AppColors.success;
    }
  }
}

class _RiskChip extends StatelessWidget {
  final String risk;
  final Color color;

  const _RiskChip({required this.risk, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        risk,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
