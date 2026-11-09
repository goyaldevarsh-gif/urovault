import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import 'login_screen.dart';

class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});

  static const _features = <(Widget, String, String)>[
    (UvIcon('renal', size: 22), 'Patient Management', 'Register by hospital UHID in seconds'),
    (Icon(Icons.biotech_outlined, color: UvColors.teal, size: 22), 'Diagnosis & Investigations', 'One-tap diagnosis, simple checklists'),
    (UvIcon('bladder', size: 22), 'Surgical Documentation', 'Procedure, operative notes and HPE'),
    (Icon(Icons.photo_camera_outlined, color: UvColors.teal, size: 22), 'Clinical Images', 'CT, MRI, endoscopy, pre- and post-op'),
    (Icon(Icons.event_available_outlined, color: UvColors.teal, size: 22), 'Follow-up Tracking', 'Due, upcoming and overdue at a glance'),
  ];

  Future<void> _start(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarded', true);
    if (!context.mounted) return;
    Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => const LoginScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ContentWidth(
          maxWidth: 520,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(children: [
              const Spacer(flex: 2),
              const UvLogo(size: 84),
              const SizedBox(height: 10),
              const Text('UroVault', style: TextStyle(fontFamily: 'Inter', fontSize: 30, fontWeight: FontWeight.w700, color: UvColors.navy)),
              const SizedBox(height: 22),
              const Text('Manage Your Urology\nPractice with Ease', textAlign: TextAlign.center, style: UvText.h1),
              const SizedBox(height: 8),
              const Text('A lightweight digital casebook that works offline.', textAlign: TextAlign.center, style: UvText.small),
              const Spacer(),
              for (final f in _features)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: UvCard(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    child: Row(children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(color: UvColors.lightTeal, borderRadius: BorderRadius.circular(12)),
                        alignment: Alignment.center,
                        child: f.$1,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(f.$2, style: UvText.bodyBold),
                          Text(f.$3, style: UvText.small),
                        ]),
                      ),
                    ]),
                  ),
                ),
              const Spacer(),
              PrimaryButton(label: 'Get Started', icon: Icons.arrow_forward, onPressed: () => _start(context)),
              const SizedBox(height: 20),
            ]),
          ),
        ),
      ),
    );
  }
}
