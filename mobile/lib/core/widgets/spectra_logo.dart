import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../constants/app_colors.dart';

class SpectraLogo extends StatefulWidget {
  final double size;
  final bool animated;
  final double? borderRadius;

  const SpectraLogo({
    super.key,
    this.size = 64,
    this.animated = false,
    this.borderRadius,
  });

  @override
  State<SpectraLogo> createState() => _SpectraLogoState();
}

class _SpectraLogoState extends State<SpectraLogo>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );
    if (widget.animated) _pulse.repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.size;
    final radius = widget.borderRadius ?? (s * 0.22);

    Widget logo = Container(
      width: s,
      height: s,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.12),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Image.asset(
          'assets/icons/icon.jpeg',
          width: s,
          height: s,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => SizedBox(
            width: s,
            height: s,
            child: CustomPaint(
              painter: _LogoPainter(),
            ),
          ),
        ),
      ),
    );

    if (widget.animated) {
      logo = AnimatedBuilder(
        animation: _pulse,
        builder: (_, child) => Container(
          width: s + 24,
          height: s + 24,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: AppColors.primaryAccent
                    .withValues(alpha: 0.12 + _pulse.value * 0.18),
                blurRadius: 18 + _pulse.value * 14,
                spreadRadius: 2 + _pulse.value * 4,
              ),
            ],
          ),
          child: Center(child: child),
        ),
        child: logo,
      );
    }

    return logo;
  }
}

class _LogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // Gradient shield
    final shieldPaint = Paint()
      ..shader = const LinearGradient(
        colors: [AppColors.primaryAccent, AppColors.secondaryAccent],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    // Shield path
    final shield = Path();
    final w = size.width;
    final h = size.height;
    shield.moveTo(cx, h * 0.04);
    shield.lineTo(w * 0.9, h * 0.2);
    shield.quadraticBezierTo(w * 0.92, h * 0.55, cx, h * 0.96);
    shield.quadraticBezierTo(w * 0.08, h * 0.55, w * 0.1, h * 0.2);
    shield.close();

    canvas.drawPath(shield, shieldPaint);

    // Inner shield
    final innerShieldPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.25);
    final inner = Path();
    final iw = w * 0.72;
    final ih = h * 0.72;
    final ix = (w - iw) / 2;
    final iy = h * 0.16;
    inner.moveTo(cx, iy);
    inner.lineTo(ix + iw, iy + ih * 0.2);
    inner.quadraticBezierTo(ix + iw + 2, iy + ih * 0.6, cx, iy + ih);
    inner.quadraticBezierTo(ix - 2, iy + ih * 0.6, ix, iy + ih * 0.2);
    inner.close();
    canvas.drawPath(inner, innerShieldPaint);

    // Eye
    final eyePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    // Eye oval
    canvas.drawOval(
      Rect.fromCenter(
          center: Offset(cx, cy * 0.96), width: w * 0.38, height: h * 0.2),
      eyePaint,
    );

    // Iris
    final irisPaint = Paint()
      ..shader = const LinearGradient(
        colors: [AppColors.primaryAccent, AppColors.secondaryAccent],
      ).createShader(
          Rect.fromCircle(center: Offset(cx, cy * 0.96), radius: h * 0.07));
    canvas.drawCircle(Offset(cx, cy * 0.96), h * 0.072, irisPaint);

    // Pupil
    canvas.drawCircle(
        Offset(cx, cy * 0.96), h * 0.036, Paint()..color = const Color(0xFF0F172A));

    // Scan lines
    final scanPaint = Paint()
      ..color = AppColors.secondaryAccent.withValues(alpha: 0.5)
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke;
    for (int i = 0; i < 3; i++) {
      canvas.drawLine(
        Offset(cx - w * 0.15 - i * 3, cy * 0.96 - h * 0.01 + i * 6),
        Offset(cx + w * 0.15 + i * 3, cy * 0.96 - h * 0.01 + i * 6),
        scanPaint
          ..color =
              AppColors.secondaryAccent.withValues(alpha: 0.3 - i * 0.08),
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ─── Compact row logo for AppBar ──────────────────────────────────────────────
class SpectraLogoRow extends StatelessWidget {
  final double iconSize;
  final double fontSize;

  const SpectraLogoRow({super.key, this.iconSize = 32, this.fontSize = 20});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SpectraLogo(size: iconSize),
        const SizedBox(width: 10),
        Text(
          'SPECTRA',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontSize: fontSize,
                fontWeight: FontWeight.w800,
                letterSpacing: 2.5,
                foreground: Paint()
                  ..shader = const LinearGradient(
                    colors: [AppColors.primaryAccent, AppColors.secondaryAccent],
                  ).createShader(const Rect.fromLTWH(0, 0, 140, 30)),
              ),
        ),
      ],
    )
        .animate()
        .fadeIn(duration: 500.ms)
        .slideX(begin: -0.05, duration: 500.ms, curve: Curves.easeOut);
  }
}
