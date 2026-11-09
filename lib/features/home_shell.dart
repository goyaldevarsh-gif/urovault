import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import '../data/providers.dart';
import 'add_patient_screen.dart';
import 'dashboard_screen.dart';
import 'followups_screen.dart';
import 'more_screen.dart';
import 'patients_screen.dart';

class HomeShell extends ConsumerWidget {
  const HomeShell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tab = ref.watch(shellTabProvider);
    return Scaffold(
      body: IndexedStack(index: tab, children: const [
        DashboardScreen(),
        PatientsScreen(),
        FollowUpsScreen(),
        MoreScreen(),
      ]),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: UvColors.border))),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 62,
            child: Row(children: [
              _Item(icon: Icons.home_outlined, active: Icons.home_rounded, label: 'Home', selected: tab == 0, onTap: () => ref.read(shellTabProvider.notifier).state = 0),
              _Item(icon: Icons.people_outline, active: Icons.people_alt, label: 'Patients', selected: tab == 1, onTap: () => ref.read(shellTabProvider.notifier).state = 1),
              Expanded(
                child: Center(
                  child: GestureDetector(
                    onTap: () => go(context, const AddPatientScreen()),
                    child: Container(
                      width: 50,
                      height: 50,
                      decoration: const BoxDecoration(
                        color: UvColors.teal,
                        shape: BoxShape.circle,
                        boxShadow: [BoxShadow(color: Color(0x590D9488), blurRadius: 12, offset: Offset(0, 4))],
                      ),
                      child: const Icon(Icons.add, color: Colors.white, size: 28),
                    ),
                  ),
                ),
              ),
              _Item(icon: Icons.event_available_outlined, active: Icons.event_available, label: 'Follow-ups', selected: tab == 2, onTap: () => ref.read(shellTabProvider.notifier).state = 2),
              _Item(icon: Icons.more_horiz, active: Icons.more_horiz, label: 'More', selected: tab == 3, onTap: () => ref.read(shellTabProvider.notifier).state = 3),
            ]),
          ),
        ),
      ),
    );
  }
}

class _Item extends StatelessWidget {
  final IconData icon;
  final IconData active;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _Item({required this.icon, required this.active, required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = selected ? UvColors.teal : UvColors.textSecondary;
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(selected ? active : icon, color: c, size: 24),
          const SizedBox(height: 3),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: selected ? FontWeight.w600 : FontWeight.w500, color: c)),
        ]),
      ),
    );
  }
}
