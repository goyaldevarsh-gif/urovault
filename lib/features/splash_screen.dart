import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/widgets.dart';
import 'login_screen.dart';
import 'onboarding_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))..forward();
  late final Animation<double> _fade = CurvedAnimation(parent: _c, curve: Curves.easeOut);
  late final Animation<double> _scale = Tween<double>(begin: 0.88, end: 1).animate(CurvedAnimation(parent: _c, curve: Curves.easeOutBack));

  @override
  void initState() {
    super.initState();
    _next();
  }

  Future<void> _next() async {
    await Future.delayed(const Duration(milliseconds: 2200));
    final prefs = await SharedPreferences.getInstance();
    final seen = prefs.getBool('onboarded') ?? false;
    if (!mounted) return;
    Navigator.of(context).pushReplacement(PageRouteBuilder<void>(
      transitionDuration: const Duration(milliseconds: 400),
      pageBuilder: (_, __, ___) => seen ? const LoginScreen() : const OnboardingScreen(),
      transitionsBuilder: (_, a, __, child) => FadeTransition(opacity: a, child: child),
    ));
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF0F2942), Color(0xFF0B3B4F)]),
        ),
        child: Stack(children: [
          Positioned.fill(child: CustomPaint(painter: _WavePainter())),
          Center(
            child: FadeTransition(
              opacity: _fade,
              child: ScaleTransition(
                scale: _scale,
                child: Column(mainAxisSize: MainAxisSize.min, children: const [
                  UvLogo(size: 112, light: true),
                  SizedBox(height: 18),
                  Text('UroVault', style: TextStyle(fontFamily: 'Inter', fontSize: 38, fontWeight: FontWeight.w700, color: Colors.white)),
                  SizedBox(height: 8),
                  Text('Your Urology Practice, Organised.', style: TextStyle(fontFamily: 'Inter', fontSize: 14, color: Color(0xCCFFFFFF))),
                ]),
              ),
            ),
          ),
        ]),
      ),
    );
  }
}

class _WavePainter extends CustomPainter {
  const _WavePainter();
  @override
  void paint(Canvas canvas, Size size) {
    for (var layer = 0; layer < 2; layer++) {
      final path = Path()..moveTo(0, size.height);
      final base = size.height * (0.80 + layer * 0.06);
      for (double x = 0; x <= size.width; x += 4) {
        final y = base + math.sin((x / size.width) * 2 * math.pi + layer * 1.3) * 18;
        path.lineTo(x, y);
      }
      path.lineTo(size.width, size.height);
      path.close();
      canvas.drawPath(path, Paint()..color = layer == 0 ? const Color(0x330D9488) : const Color(0x590D9488));
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
