import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import '../data/providers.dart';
import '../services/export_service.dart';
import 'add_patient_screen.dart';
import 'common_tiles.dart';
import 'followup_tab.dart';
import 'investigations_tab.dart';
import 'media_tab.dart';
import 'overview_tab.dart';
import 'surgery_tab.dart';
import 'timeline_screen.dart';

const _tabNames = ['Overview', 'Media', 'Investigations', 'Surgery', 'Follow-up'];

/// Central screen: header + Overview / Media / Investigations / Surgery / Follow-up.
class PatientProfileScreen extends ConsumerStatefulWidget {
  final int patientId;
  final int initialTab;
  const PatientProfileScreen({super.key, required this.patientId, this.initialTab = 0});
  @override
  ConsumerState<PatientProfileScreen> createState() => _PatientProfileScreenState();
}

class _PatientProfileScreenState extends ConsumerState<PatientProfileScreen> {
  late int _tab = widget.initialTab;

  Future<void> _timeline() async {
    final t = await go<int>(context, TimelineScreen(patientId: widget.patientId));
    if (t != null && mounted) setState(() => _tab = t);
  }

  Future<void> _delete(String name) async {
    final ok = await confirm(
      context,
      title: 'Delete patient?',
      message: 'All records, images and follow-ups for $name will be permanently deleted. This cannot be undone.',
    );
    if (!ok) return;
    await ref.read(repoProvider).deletePatient(widget.patientId);
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(patientProvider(widget.patientId));
    return async.when(
      loading: () => Scaffold(appBar: AppBar(), body: loadingView()),
      error: (e, _) => Scaffold(appBar: AppBar(), body: errorView(e)),
      data: (p) {
        if (p == null) {
          return Scaffold(appBar: AppBar(), body: const EmptyState(title: 'Patient not found'));
        }
        final pid = p.id!;
        return Scaffold(
          appBar: AppBar(
            title: const Text('Patient'),
            actions: [
              IconButton(icon: const Icon(Icons.edit_outlined), onPressed: () => go(context, AddPatientScreen(editId: pid))),
              PopupMenuButton<String>(
                color: Colors.white,
                surfaceTintColor: Colors.white,
                onSelected: (v) async {
                  if (v == 'timeline') _timeline();
                  if (v == 'pdf') {
                    try {
                      await ExportService.exportPatientPdf(ref.read(repoProvider), pid);
                    } catch (e) {
                      if (mounted) toast(context, 'Export failed: $e');
                    }
                  }
                  if (v == 'delete') _delete(p.name);
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'timeline', child: Text('Case timeline')),
                  PopupMenuItem(value: 'pdf', child: Text('Export case summary (PDF)')),
                  PopupMenuItem(value: 'delete', child: Text('Delete patient', style: TextStyle(color: UvColors.red))),
                ],
              ),
            ],
          ),
          body: ContentWidth(
            child: Column(children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: UvCard(
                  padding: const EdgeInsets.all(14),
                  child: Row(children: [
                    Avatar(p.initials, size: 52),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(p.name, style: UvText.h2, maxLines: 1, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 2),
                        Text('${p.ageSex}  •  UHID: ${p.uhid}', style: UvText.small.copyWith(color: UvColors.navy, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        Wrap(spacing: 6, runSpacing: 4, children: [
                          if (p.primaryDx != null) Pill(p.primaryDx!) else const Pill('Diagnosis not recorded', color: UvColors.textSecondary, bg: Color(0xFFF1F5F9)),
                          if (p.dxNames.length > 1) Pill('+${p.dxNames.length - 1} more', color: UvColors.navy, bg: const Color(0xFFF1F5F9)),
                          if (p.isDemo) const Pill('SAMPLE', color: UvColors.amber, bg: UvColors.amberTint),
                        ]),
                      ]),
                    ),
                    if (p.mobile != null && p.mobile!.isNotEmpty)
                      Container(
                        decoration: const BoxDecoration(color: UvColors.lightTeal, shape: BoxShape.circle),
                        child: IconButton(icon: const Icon(Icons.call_outlined, color: UvColors.teal), onPressed: () => callNumber(context, p.mobile!)),
                      ),
                  ]),
                ),
              ),
              SizedBox(
                height: 44,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemCount: _tabNames.length,
                  itemBuilder: (_, i) => GestureDetector(
                    onTap: () => setState(() => _tab = i),
                    behavior: HitTestBehavior.opaque,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: _tab == i ? UvColors.teal : Colors.transparent, width: 2.5))),
                      child: Text(
                        _tabNames[i],
                        style: TextStyle(fontSize: 14, fontWeight: _tab == i ? FontWeight.w700 : FontWeight.w500, color: _tab == i ? UvColors.teal : UvColors.textSecondary),
                      ),
                    ),
                  ),
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: IndexedStack(index: _tab, children: [
                  OverviewTab(patientId: pid, onTab: (t) => setState(() => _tab = t), onTimeline: _timeline),
                  MediaTab(patientId: pid),
                  InvestigationsTab(patientId: pid),
                  SurgeryTab(patientId: pid),
                  FollowUpTab(patientId: pid),
                ]),
              ),
            ]),
          ),
        );
      },
    );
  }
}
