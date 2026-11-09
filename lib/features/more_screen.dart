import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import 'doctor_profile_screen.dart';
import 'login_screen.dart';
import 'more_screens.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Widget tile(IconData icon, String title, String subtitle, Widget screen) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: UvCard(
            onTap: () => go(context, screen),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(color: UvColors.lightTeal, borderRadius: BorderRadius.circular(12)),
                child: Icon(icon, color: UvColors.teal, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: UvText.bodyBold),
                  Text(subtitle, style: UvText.small),
                ]),
              ),
              const Icon(Icons.chevron_right, color: UvColors.textSecondary),
            ]),
          ),
        );

    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: false, title: const Text('More')),
      body: ContentWidth(
        child: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 24), children: [
          tile(Icons.account_circle_outlined, 'Doctor Profile', 'Your name and account', const DoctorProfileScreen()),
          tile(Icons.bar_chart_outlined, 'Total Patient Statistics', 'Counts and diagnosis mix', const StatisticsScreen()),
          tile(Icons.ios_share_outlined, 'Reports & Export', 'CSV of all patients, PDF per patient', const ReportsScreen()),
          tile(Icons.cloud_upload_outlined, 'Backup & Restore', 'Save or restore all data and images', const BackupScreen()),
          tile(Icons.settings_outlined, 'Settings', 'Biometric unlock, password, sample data', const SettingsScreen()),
          tile(Icons.lock_outline, 'Privacy & Security', 'How your data is protected, audit log', const PrivacyScreen()),
          tile(Icons.help_outline, 'Help & Support', 'Quick guide', const HelpScreen()),
          const SizedBox(height: 8),
          OutlineBtn(
            label: 'Lock app',
            icon: Icons.lock_outline,
            onPressed: () => Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute<void>(builder: (_) => const LoginScreen()), (r) => false),
          ),
          const SizedBox(height: 18),
          const Center(child: Text('UroVault 0.1.0', style: UvText.small)),
        ]),
      ),
    );
  }
}
