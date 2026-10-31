import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

class RiskGaugeWidget extends StatefulWidget {
  final double score; // 0.0 to 100.0
  final String statusText;
  final Color statusColor;

  const RiskGaugeWidget({
    super.key,
    required this.score,
    required this.statusText,
    required this.statusColor,
  });

  @override
  State<RiskGaugeWidget> createState() => _RiskGaugeWidgetState();
}

class _RiskGaugeWidgetState extends State<RiskGaugeWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    );
    _controller.forward();
  }

  @override
  void didUpdateWidget(RiskGaugeWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.score != widget.score) {
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        final animatedScore = widget.score * _animation.value;

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 220,
              height: 130,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CustomPaint(
                    size: const Size(220, 130),
                    painter: _RiskGaugePainter(
                      score: animatedScore,
                      accentColor: widget.statusColor,
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '${animatedScore.toInt()}%',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            color: widget.statusColor,
                            letterSpacing: -1,
                          ),
                        ),
                        const Text(
                          'THREAT RISK INDEX',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textMuted,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                color: widget.statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: widget.statusColor.withValues(alpha: 0.3),
                  width: 1.2,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: widget.statusColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    widget.statusText.toUpperCase(),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: widget.statusColor,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _RiskGaugePainter extends CustomPainter {
  final double score;
  final Color accentColor;

  _RiskGaugePainter({required this.score, required this.accentColor});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height - 10);
    final radius = size.width / 2 - 16;
    final rect = Rect.fromCircle(center: center, radius: radius);

    const startAngle = math.pi * 0.85;
    const sweepAngle = math.pi * 1.3;

    // Track
    final trackPaint = Paint()
      ..color = AppColors.border.withValues(alpha: 0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, startAngle, sweepAngle, false, trackPaint);

    // Active progress arc
    final progressFraction = (score / 100).clamp(0.0, 1.0);
    if (progressFraction > 0) {
      final activeSweep = sweepAngle * progressFraction;

      final gradient = SweepGradient(
        startAngle: startAngle,
        endAngle: startAngle + sweepAngle,
        colors: const [
          AppColors.success,
          AppColors.warning,
          AppColors.danger,
        ],
        stops: const [0.0, 0.5, 1.0],
      );

      final activePaint = Paint()
        ..shader = gradient.createShader(rect)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 14
        ..strokeCap = StrokeCap.round;

      canvas.drawArc(rect, startAngle, activeSweep, false, activePaint);

      // Indicator dot on current value
      final curAngle = startAngle + activeSweep;
      final dotX = center.dx + radius * math.cos(curAngle);
      final dotY = center.dy + radius * math.sin(curAngle);

      final dotShadowPaint = Paint()
        ..color = accentColor.withValues(alpha: 0.4)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5);
      canvas.drawCircle(Offset(dotX, dotY), 10, dotShadowPaint);

      final dotPaint = Paint()..color = Colors.white;
      canvas.drawCircle(Offset(dotX, dotY), 6.5, dotPaint);

      final innerDotPaint = Paint()..color = accentColor;
      canvas.drawCircle(Offset(dotX, dotY), 3.5, innerDotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _RiskGaugePainter oldDelegate) {
    return oldDelegate.score != score || oldDelegate.accentColor != accentColor;
  }
}
