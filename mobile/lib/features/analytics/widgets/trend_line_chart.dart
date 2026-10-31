import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

class TrendPoint {
  final String dayLabel;
  final int totalScans;
  final int threats;

  const TrendPoint({
    required this.dayLabel,
    required this.totalScans,
    required this.threats,
  });
}

class TrendLineChart extends StatefulWidget {
  final List<TrendPoint> points;
  final double height;

  const TrendLineChart({
    super.key,
    required this.points,
    this.height = 200,
  });

  @override
  State<TrendLineChart> createState() => _TrendLineChartState();
}

class _TrendLineChartState extends State<TrendLineChart>
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
  void didUpdateWidget(TrendLineChart oldWidget) {
    super.didUpdateWidget(oldWidget);
    _controller.forward(from: 0);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final maxVal = widget.points.fold<int>(
      1,
      (max, p) => math.max(max, p.totalScans),
    );

    return Column(
      children: [
        SizedBox(
          height: widget.height,
          child: AnimatedBuilder(
            animation: _animation,
            builder: (context, child) {
              return CustomPaint(
                size: Size(double.infinity, widget.height),
                painter: _TrendLinePainter(
                  points: widget.points,
                  maxValue: maxVal,
                  progress: _animation.value,
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _legendItem(AppColors.primaryAccent, 'Daily Scans Activity'),
            const SizedBox(width: 20),
            _legendItem(AppColors.danger, 'Threat Incidents'),
          ],
        ),
      ],
    );
  }

  Widget _legendItem(Color color, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16,
          height: 3,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          text,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _TrendLinePainter extends CustomPainter {
  final List<TrendPoint> points;
  final int maxValue;
  final double progress;

  _TrendLinePainter({
    required this.points,
    required this.maxValue,
    required this.progress,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final count = points.length;
    if (count < 2) return;

    final chartHeight = size.height - 30; // 30 for labels
    final ceiling = math.max(maxValue, 4);
    final dx = (size.width - 40) / (count - 1);

    // Subtle horizontal gridlines
    final gridPaint = Paint()
      ..color = AppColors.border.withValues(alpha: 0.5)
      ..strokeWidth = 1;

    for (int i = 0; i <= 3; i++) {
      final y = chartHeight * (i / 3);
      canvas.drawLine(Offset(20, y), Offset(size.width - 20, y), gridPaint);
    }

    // Compute coordinate points
    final totalOffsets = <Offset>[];
    final threatOffsets = <Offset>[];

    for (int i = 0; i < count; i++) {
      final x = 20 + (i * dx);
      final totalY = chartHeight - ((points[i].totalScans / ceiling) * chartHeight * progress);
      final threatY = chartHeight - ((points[i].threats / ceiling) * chartHeight * progress);

      totalOffsets.add(Offset(x, totalY));
      threatOffsets.add(Offset(x, threatY));

      // Draw Day label
      _drawText(
        canvas,
        points[i].dayLabel,
        Offset(x, size.height - 10),
        AppColors.textMuted,
        10.5,
        fontWeight: FontWeight.w600,
      );
    }

    // 1. Draw smooth gradient area under total line
    final areaPath = Path()..moveTo(totalOffsets.first.dx, chartHeight);
    areaPath.lineTo(totalOffsets.first.dx, totalOffsets.first.dy);

    for (int i = 0; i < count - 1; i++) {
      final p0 = totalOffsets[i];
      final p1 = totalOffsets[i + 1];
      final controlX = (p0.dx + p1.dx) / 2;
      areaPath.cubicTo(controlX, p0.dy, controlX, p1.dy, p1.dx, p1.dy);
    }

    areaPath.lineTo(totalOffsets.last.dx, chartHeight);
    areaPath.close();

    final areaPaint = Paint()
      ..shader = LinearGradient(
        colors: [
          AppColors.primaryAccent.withValues(alpha: 0.22),
          AppColors.primaryAccent.withValues(alpha: 0.0),
        ],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTWH(0, 0, size.width, chartHeight))
      ..style = PaintingStyle.fill;

    canvas.drawPath(areaPath, areaPaint);

    // 2. Draw Total Scans Line
    final linePath = Path()..moveTo(totalOffsets.first.dx, totalOffsets.first.dy);
    for (int i = 0; i < count - 1; i++) {
      final p0 = totalOffsets[i];
      final p1 = totalOffsets[i + 1];
      final controlX = (p0.dx + p1.dx) / 2;
      linePath.cubicTo(controlX, p0.dy, controlX, p1.dy, p1.dx, p1.dy);
    }

    final linePaint = Paint()
      ..color = AppColors.primaryAccent
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    canvas.drawPath(linePath, linePaint);

    // 3. Draw Threats Line
    final threatPath = Path()..moveTo(threatOffsets.first.dx, threatOffsets.first.dy);
    for (int i = 0; i < count - 1; i++) {
      final p0 = threatOffsets[i];
      final p1 = threatOffsets[i + 1];
      final controlX = (p0.dx + p1.dx) / 2;
      threatPath.cubicTo(controlX, p0.dy, controlX, p1.dy, p1.dx, p1.dy);
    }

    final threatLinePaint = Paint()
      ..color = AppColors.danger
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round;

    canvas.drawPath(threatPath, threatLinePaint);

    // 4. Draw points
    for (int i = 0; i < count; i++) {
      final p = totalOffsets[i];
      final t = threatOffsets[i];

      // Outer glow
      canvas.drawCircle(
        p,
        5,
        Paint()..color = AppColors.primaryAccent.withValues(alpha: 0.35),
      );
      canvas.drawCircle(p, 3.5, Paint()..color = Colors.white);
      canvas.drawCircle(p, 2.5, Paint()..color = AppColors.primaryAccent);

      if (points[i].threats > 0) {
        canvas.drawCircle(
          t,
          4.5,
          Paint()..color = AppColors.danger.withValues(alpha: 0.35),
        );
        canvas.drawCircle(t, 3, Paint()..color = Colors.white);
        canvas.drawCircle(t, 2, Paint()..color = AppColors.danger);
      }
    }
  }

  void _drawText(
    Canvas canvas,
    String text,
    Offset center,
    Color color,
    double fontSize, {
    FontWeight fontWeight = FontWeight.w600,
  }) {
    final textSpan = TextSpan(
      text: text,
      style: TextStyle(color: color, fontSize: fontSize, fontWeight: fontWeight),
    );
    final textPainter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(center.dx - (textPainter.width / 2), center.dy - (textPainter.height / 2)),
    );
  }

  @override
  bool shouldRepaint(covariant _TrendLinePainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.points != points;
  }
}
