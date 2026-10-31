import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

class ScanningAnimation extends StatefulWidget {
  final double size;

  const ScanningAnimation({super.key, this.size = 200});

  @override
  State<ScanningAnimation> createState() => _ScanningAnimationState();
}

class _ScanningAnimationState extends State<ScanningAnimation>
    with TickerProviderStateMixin {
  late final AnimationController _ring1;
  late final AnimationController _ring2;
  late final AnimationController _ring3;
  late final AnimationController _scan;

  @override
  void initState() {
    super.initState();
    _ring1 = AnimationController(
        vsync: this, duration: const Duration(seconds: 2))
      ..repeat();
    _ring2 = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 2600))
      ..repeat();
    _ring3 = AnimationController(
        vsync: this, duration: const Duration(seconds: 3))
      ..repeat();
    _scan = AnimationController(
        vsync: this, duration: const Duration(seconds: 2))
      ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ring1.dispose();
    _ring2.dispose();
    _ring3.dispose();
    _scan.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.size;
    return SizedBox(
      width: s,
      height: s,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Outer ring
          AnimatedBuilder(
            animation: _ring3,
            builder: (_, __) => Opacity(
              opacity: 1 - _ring3.value,
              child: Transform.scale(
                scale: 0.6 + _ring3.value * 0.5,
                child: Container(
                  width: s,
                  height: s,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.primaryAccent.withValues(alpha: 0.25),
                      width: 1.5,
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Middle ring
          AnimatedBuilder(
            animation: _ring2,
            builder: (_, __) => Opacity(
              opacity: 1 - _ring2.value,
              child: Transform.scale(
                scale: 0.4 + _ring2.value * 0.5,
                child: Container(
                  width: s * 0.8,
                  height: s * 0.8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.secondaryAccent.withValues(alpha: 0.35),
                      width: 1,
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Inner ring
          AnimatedBuilder(
            animation: _ring1,
            builder: (_, __) => Transform.rotate(
              angle: _ring1.value * 6.28,
              child: Container(
                width: s * 0.6,
                height: s * 0.6,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: SweepGradient(
                    colors: [
                      Colors.transparent,
                      AppColors.primaryAccent.withValues(alpha: 0.4),
                    ],
                  ),
                ),
              ),
            ),
          ),
          // Scan line
          AnimatedBuilder(
            animation: _scan,
            builder: (_, __) => Transform.translate(
              offset: Offset(0, (_scan.value - 0.5) * s * 0.5),
              child: Container(
                width: s * 0.5,
                height: 2.5,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [
                      Colors.transparent,
                      AppColors.secondaryAccent,
                      Colors.transparent,
                    ],
                  ),
                  borderRadius: BorderRadius.circular(2),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.secondaryAccent.withValues(alpha: 0.6),
                      blurRadius: 8,
                    ),
                  ],
                ),
              ),
            ),
          ),
          // Center logo glow
          Container(
            width: s * 0.3,
            height: s * 0.3,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: AppColors.primaryAccent.withValues(alpha: 0.15),
                  blurRadius: 16,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Center(
              child: Icon(
                Icons.shield_rounded,
                color: AppColors.primaryAccent,
                size: s * 0.18,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
