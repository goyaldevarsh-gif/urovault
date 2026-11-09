import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'add_patient_screen.dart';
import 'common_tiles.dart';
import 'doctor_profile_screen.dart';
import 'patient_profile_screen.dart';
import 'surgeries_screen.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  void _openPatient(BuildContext c, int id, {int tab = 0}) => go(c, PatientProfileScreen(patientId: id, initialTab: tab));

  Future<void> _notifications(BuildContext context, WidgetRef ref) async {
    final due = (await ref.read(repoProvider).pendingFollowUps()).where((f) => !parseIso(f.date).isAfter(today())).toList();
    if (!context.mounted) return;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.7),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Notifications', style: UvText.h2),
              const SizedBox(height: 4),
              Text(due.isEmpty ? 'Nothing due. You are all caught up.' : '${due.length} follow-up${due.length == 1 ? '' : 's'} due or overdue', style: UvText.small),
              const SizedBox(height: 12),
              Flexible(
                child: ListView(shrinkWrap: true, children: [
                  for (final f in due)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: FollowUpTile(
                        f: f,
                        onTap: () {
                          Navigator.pop(ctx);
                          _openPatient(context, f.patientId, tab: 4);
                        },
                      ),
                    ),
                ]),
              ),
            ]),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final counts = ref.watch(countsProvider);
    final recent = ref.watch(recentPatientsProvider);
    final cases = ref.watch(recentSurgeriesProvider);
    final upcoming = ref.watch(upcomingFollowUpsProvider);
    final c = counts.asData?.value ?? const <String, int>{};

    Widget stat(String value, String label, IconData icon, VoidCallback onTap) => Expanded(
          child: UvCard(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
            onTap: onTap,
            child: Column(children: [
              Icon(icon, color: UvColors.teal, size: 22),
              const SizedBox(height: 6),
              Text(value, style: UvText.h1.copyWith(fontSize: 24)),
              Text(label, style: UvText.small, textAlign: TextAlign.center),
            ]),
          ),
        );

    Widget action(String label, IconData icon, VoidCallback onTap) => Expanded(
          child: UvCard(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
            onTap: onTap,
            child: Column(children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(color: UvColors.lightTeal, borderRadius: BorderRadius.circular(14)),
                child: Icon(icon, color: UvColors.teal, size: 24),
              ),
              const SizedBox(height: 8),
              Text(label, style: UvText.bodyBold.copyWith(fontSize: 13)),
            ]),
          ),
        );

    return ListView(padding: EdgeInsets.zero, children: [
      Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF0F2942), Color(0xFF0B4A55)]),
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
        ),
        child: SafeArea(
          bottom: false,
          child: ContentWidth(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 22),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  const UvLogo(size: 30, light: true),
                  const SizedBox(width: 8),
                  const Text('UroVault', style: TextStyle(fontFamily: 'Inter', fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
                  const Spacer(),
                  IconButton(icon: const Icon(Icons.notifications_none, color: Colors.white), onPressed: () => _notifications(context, ref)),
                  IconButton(icon: const Icon(Icons.account_circle_outlined, color: Colors.white), onPressed: () => go(context, const DoctorProfileScreen())),
                ]),
                const SizedBox(height: 8),
                Text('${greeting()},\nDoctor', style: UvText.h1.copyWith(color: Colors.white, fontSize: 26)),
                const SizedBox(height: 18),
                Row(children: [
                  stat('${c['patients'] ?? 0}', 'Total Patients', Icons.people_outline, () => ref.read(shellTabProvider.notifier).state = 1),
                  const SizedBox(width: 10),
                  stat('${c['surgeries'] ?? 0}', 'Total Surgeries', Icons.healing_outlined, () => go(context, const SurgeriesScreen())),
                  const SizedBox(width: 10),
                  stat('${c['due'] ?? 0}', 'Follow-ups Due', Icons.event_outlined, () => ref.read(shellTabProvider.notifier).state = 2),
                ]),
              ]),
            ),
          ),
        ),
      ),
      ContentWidth(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SectionTitle('Quick actions'),
            Row(children: [
              action('Patients', Icons.people_outline, () => ref.read(shellTabProvider.notifier).state = 1),
              const SizedBox(width: 10),
              action('New Case', Icons.note_add_outlined, () => go(context, const AddPatientScreen())),
              const SizedBox(width: 10),
              action('Follow-ups', Icons.event_available_outlined, () => ref.read(shellTabProvider.notifier).state = 2),
            ]),
            SectionTitle('Recent patients', action: 'View all', onAction: () => ref.read(shellTabProvider.notifier).state = 1),
            recent.when(
              loading: () => const SizedBox(height: 60, child: Center(child: CircularProgressIndicator(color: UvColors.teal))),
              error: (e, _) => errorView(e),
              data: (list) => list.isEmpty
                  ? UvCard(
                      onTap: () => go(context, const AddPatientScreen()),
                      child: Row(children: const [
                        Icon(Icons.person_add_alt_1_outlined, color: UvColors.teal),
                        SizedBox(width: 12),
                        Expanded(child: Text('No patients yet. Tap to register your first patient.', style: UvText.body)),
                      ]),
                    )
                  : Column(children: [
                      for (final p in list)
                        Padding(padding: const EdgeInsets.only(bottom: 8), child: PatientTile(patient: p, onTap: () => _openPatient(context, p.id!))),
                    ]),
            ),
            SectionTitle('Recent cases', action: 'All surgeries', onAction: () => go(context, const SurgeriesScreen())),
            cases.when(
              loading: () => const SizedBox(height: 40),
              error: (e, _) => errorView(e),
              data: (list) => list.isEmpty
                  ? const Text('No surgeries recorded yet.', style: UvText.small)
                  : Column(children: [for (final s in list) Padding(padding: const EdgeInsets.only(bottom: 8), child: _CaseTile(s: s, onTap: () => _openPatient(context, s.patientId, tab: 3)))]),
            ),
            SectionTitle('Upcoming follow-ups', action: 'View all', onAction: () => ref.read(shellTabProvider.notifier).state = 2),
            upcoming.when(
              loading: () => const SizedBox(height: 40),
              error: (e, _) => errorView(e),
              data: (list) => list.isEmpty
                  ? const Text('No follow-ups scheduled.', style: UvText.small)
                  : Column(children: [for (final f in list) Padding(padding: const EdgeInsets.only(bottom: 8), child: FollowUpTile(f: f, onTap: () => _openPatient(context, f.patientId, tab: 4)))]),
            ),
          ]),
        ),
      ),
    ]);
  }
}

class _CaseTile extends StatelessWidget {
  final Surgery s;
  final VoidCallback onTap;
  const _CaseTile({required this.s, required this.onTap});

  @override
  Widget build(BuildContext context) => UvCard(
        onTap: onTap,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(color: UvColors.lightTeal, borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.healing_outlined, color: UvColors.teal),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s.procedure, style: UvText.bodyBold, maxLines: 1, overflow: TextOverflow.ellipsis),
              Text('${s.patientName ?? ''}  •  ${fmtDate(s.date)}', style: UvText.small, maxLines: 1, overflow: TextOverflow.ellipsis),
            ]),
          ),
          const Icon(Icons.chevron_right, color: UvColors.textSecondary),
        ]),
      );
}
