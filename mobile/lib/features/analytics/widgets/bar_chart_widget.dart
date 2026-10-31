import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

class ModalityBarData {
  final String label;
  final IconData icon;
  final int totalScans;
  final int threatsDetected;
  final Color primaryColor;

  const ModalityBarData({
    required this.label,
    required this.icon,
    required this.totalScans,
    required this.threatsDetected,
    required this.primaryColor,
  });
}

class BarChartWidget extends StatefulWidget {
  final List<ModalityBarData> data;
  final double height;

  const BarChartWidget({
    super.key,
    required this.data,
    this.height = 220,
  });

  @override
  State<BarChartWidget> createState() => _BarChartWidgetState();
}

class _BarChartWidgetState extends State<BarChartWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 950),
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    );
    _controller.forward();
  }

  @override
  void didUpdateWidget(BarChartWidget oldWidget) {
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
    final maxTotal = widget.data.fold<int>(
      1,
      (max, d) => math.max(max, d.totalScans),
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
                painter: _BarChartPainter(
                  data: widget.data,
                  maxTotal: maxTotal,
                  progress: _animation.value,
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 14),
        // Legend
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _legendItem(AppColors.primaryAccent, 'Total Scanned'),
            const SizedBox(width: 20),
            _legendItem(AppColors.danger, 'Threats Detected'),
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
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
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

class _BarChartPainter extends CustomPainter {
  final List<ModalityBarData> data;
  final int maxTotal;
  final double progress;

  _BarChartPainter({
    required this.data,
    required this.maxTotal,
    required this.progress,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final chartHeight = size.height - 35; // Leave 35 for labels
    final count = data.length;
    if (count == 0) return;

    final groupWidth = size.width / count;
    final barWidth = math.min(groupWidth * 0.28, 22.0);

    // Grid lines
    final gridPaint = Paint()
      ..color = AppColors.border.withValues(alpha: 0.5)
      ..strokeWidth = 1;

    for (int i = 0; i <= 4; i++) {
      final y = chartHeight * (i / 4);
      canvas.drawLine(Offset(10, y), Offset(size.width - 10, y), gridPaint);
    }

    final ceiling = math.max(maxTotal, 4);

    for (int i = 0; i < count; i++) {
      final item = data[i];
      final groupCenterX = (i * groupWidth) + (groupWidth / 2);

      // Total bar
      final totalFraction = (item.totalScans / ceiling).clamp(0.0, 1.0);
      final totalBarHeight = (totalFraction * chartHeight * progress);
      final totalLeft = groupCenterX - barWidth - 3;
      final totalTop = chartHeight - totalBarHeight;

      final totalRect = RRect.fromRectAndCorners(
        Rect.fromLTWH(totalLeft, totalTop, barWidth, totalBarHeight),
        topLeft: const Radius.circular(5),
        topRight: const Radius.circular(5),
      );

      final totalPaint = Paint()
        ..shader = LinearGradient(
          colors: [
            item.primaryColor,
            item.primaryColor.withValues(alpha: 0.75),
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ).createShader(Rect.fromLTWH(totalLeft, totalTop, barWidth, totalBarHeight));

      canvas.drawRRect(totalRect, totalPaint);

      // Threats bar
      final threatFraction = (item.threatsDetected / ceiling).clamp(0.0, 1.0);
      final threatBarHeight = (threatFraction * chartHeight * progress);
      final threatLeft = groupCenterX + 3;
      final threatTop = chartHeight - threatBarHeight;

      final threatRect = RRect.fromRectAndCorners(
        Rect.fromLTWH(threatLeft, threatTop, barWidth, threatBarHeight),
        topLeft: const Radius.circular(5),
        topRight: const Radius.circular(5),
      );

      final threatPaint = Paint()
        ..shader = const LinearGradient(
          colors: [
            AppColors.danger,
            Color(0xFFF87171),
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ).createShader(Rect.fromLTWH(threatLeft, threatTop, barWidth, threatBarHeight));

      canvas.drawRRect(threatRect, threatPaint);

      // Draw values on top of bars if progress finished
      if (progress > 0.8) {
        _drawText(
          canvas,
          '${item.totalScans}',
          Offset(totalLeft + barWidth / 2, totalTop - 14),
          item.primaryColor,
          10,
        );
        _drawText(
          canvas,
          '${item.threatsDetected}',
          Offset(threatLeft + barWidth / 2, threatTop - 14),
          AppColors.danger,
          10,
        );
      }

      // X-axis label
      _drawText(
        canvas,
        item.label,
        Offset(groupCenterX, size.height - 12),
        AppColors.textSecondary,
        11.5,
        fontWeight: FontWeight.w700,
      );
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
      style: TextStyle(
        color: color,
        fontSize: fontSize,
        fontWeight: fontWeight,
      ),
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
  bool shouldRepaint(covariant _BarChartPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.data != data;
  }
}
