import 'package:flutter/material.dart';

class UvColors {
  static const navy = Color(0xFF0F2942);
  static const teal = Color(0xFF0D9488);
  static const lightTeal = Color(0xFFE6F7F5);
  static const bg = Color(0xFFF8FAFC);
  static const white = Color(0xFFFFFFFF);
  static const textSecondary = Color(0xFF64748B);
  static const red = Color(0xFFEF4444);
  static const green = Color(0xFF10B981);
  static const amber = Color(0xFFF59E0B);
  static const border = Color(0xFFE2E8F0);
  static const redTint = Color(0x1AEF4444);
  static const amberTint = Color(0x1FF59E0B);
  static const greenTint = Color(0x1A10B981);
  static const shadow = Color(0x0F0F2942);
}

class UvText {
  static const _f = 'Inter';
  static const h1 = TextStyle(fontFamily: _f, fontSize: 24, fontWeight: FontWeight.w700, color: UvColors.navy, height: 1.2);
  static const h2 = TextStyle(fontFamily: _f, fontSize: 18, fontWeight: FontWeight.w600, color: UvColors.navy);
  static const h3 = TextStyle(fontFamily: _f, fontSize: 15, fontWeight: FontWeight.w600, color: UvColors.navy);
  static const body = TextStyle(fontFamily: _f, fontSize: 14, color: UvColors.navy, height: 1.4);
  static const bodyBold = TextStyle(fontFamily: _f, fontSize: 14, fontWeight: FontWeight.w600, color: UvColors.navy);
  static const small = TextStyle(fontFamily: _f, fontSize: 12, color: UvColors.textSecondary, height: 1.3);
  static const label = TextStyle(fontFamily: _f, fontSize: 11, fontWeight: FontWeight.w600, color: UvColors.textSecondary, letterSpacing: 0.6);
}

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(seedColor: UvColors.teal, brightness: Brightness.light).copyWith(
    primary: UvColors.teal,
    onPrimary: Colors.white,
    secondary: UvColors.navy,
    error: UvColors.red,
    surface: Colors.white,
    onSurface: UvColors.navy,
  );
  return ThemeData(
    useMaterial3: true,
    fontFamily: 'Inter',
    colorScheme: scheme,
    scaffoldBackgroundColor: UvColors.bg,
    dividerColor: UvColors.border,
    appBarTheme: const AppBarTheme(
      backgroundColor: UvColors.bg,
      foregroundColor: UvColors.navy,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(fontFamily: 'Inter', fontSize: 17, fontWeight: FontWeight.w600, color: UvColors.navy),
    ),
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: UvColors.navy,
      contentTextStyle: TextStyle(fontFamily: 'Inter', color: Colors.white),
    ),
  );
}
