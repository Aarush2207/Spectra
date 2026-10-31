import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Backgrounds — White & Light Blue Palette
  static const Color primaryBg = Color(0xFFF6F9FD);      // Crisp clean light background
  static const Color secondaryBg = Color(0xFFEDF4FC);    // Soft icy sky-blue surface
  static const Color cardBg = Color(0xFFFFFFFF);         // Pure crisp white card surface
  static const Color cardBgLight = Color(0xFFF8FAFD);    // Delicate elevated light surface
  static const Color lightBlueSurface = Color(0xFFE2EEFC); // Light blue tint

  // Accents — Vibrant Cyber Blue & Sky Blue
  static const Color primaryAccent = Color(0xFF1D6EE5);  // Vibrant high-contrast royal blue
  static const Color secondaryAccent = Color(0xFF0EA5E9);// Electric sky blue
  static const Color accentTint = Color(0xFFEBF3FF);     // Soft 8% light blue tint for badges

  // Status colors — Calibrated for high readability on light backgrounds
  static const Color success = Color(0xFF059669);        // Deep emerald green
  static const Color warning = Color(0xFFD97706);        // Deep amber/orange
  static const Color danger = Color(0xFFDC2626);         // Crimson red

  // Text — Rich dark navy & slate for optimal contrast
  static const Color textPrimary = Color(0xFF0F172A);    // Deep slate navy
  static const Color textSecondary = Color(0xFF475569);  // Medium cool slate
  static const Color textMuted = Color(0xFF8294AA);      // Soft slate for secondary info

  // Borders / dividers — Delicate light sky borders
  static const Color border = Color(0xFFDFE9F5);         // Light sky blue border
  static const Color borderLight = Color(0xFFEDF3FA);    // Ultra-light divider

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primaryAccent, secondaryAccent],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient bgGradient = LinearGradient(
    colors: [Color(0xFFEBF3FD), Color(0xFFF6F9FD)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient dangerGradient = LinearGradient(
    colors: [Color(0xFFDC2626), Color(0xFFF87171)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient warningGradient = LinearGradient(
    colors: [Color(0xFFD97706), Color(0xFFFBBF24)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient successGradient = LinearGradient(
    colors: [Color(0xFF059669), Color(0xFF34D399)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Glass & subtle overlays
  static const Color glassOverlay = Color(0x0F1D6EE5);
  static const Color glassBorder = Color(0x261D6EE5);
}
