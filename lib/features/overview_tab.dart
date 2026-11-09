import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/providers.dart';
import 'common_tiles.dart';
import 'diagnosis_select_screen.dart';
import 'followup_form_screen.dart';
import 'investigation_form_screen.dart';
import 'surgery_form_screen.dart';

class OverviewTab extends ConsumerWidget {
  final int patientId;
  final ValueChanged<int> onTab;
  final VoidCallback onTimeline;
  const OverviewTab({super.key, required this.patientId, required this.onTab, required this.onTimeline});

  Future<void> _addNote(BuildContext context, WidgetRef ref) async {
    final c = TextEditingController();
    final text = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 18, 20, 16 + MediaQuery.of(ctx).viewInsets.bottom),
        child: SafeArea(
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Management note', style: UvText.h2),
            const SizedBox(height: 12),
            TextField(controller: c, autofocus: true, minLines: 4, maxLines: 8, textCapitalization: TextCapitalization.sentences, decoration: uvInput(hint: 'Plan, advice, decisions...')),
            const SizedBox(height: 14),
            PrimaryButton(label: 'Save Note', onPressed: () => Navigator.pop(ctx, c.text)),
          ]),
        ),
      ),
    );
    if (text != null && text.trim().isNotEmpty) {
      await ref.read(repoProvider).addNote(patientId, text);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final patient = ref.watch(patientProvider(patientId)).asData?.value;
    final dx = ref.watch(dxProvider(patientId)).asData?.value ?? [];
    final inv = ref.watch(investigationsProvider(patientId)).asData?.value ?? [];
    final notes = ref.watch(notesProvider(patientId)).asData?.value ?? [];
    final fus = ref.watch(followUpsProvider(patientId)).asData?.value ?? [];
    if (patient == null) return loadingView();

    final seen = fus.where((f) => f.completed).toList();
    final pending = fus.where((f) => !f.completed).toList()..sort((a, b) => a.date.compareTo(b.date));
    final lastVisit = seen.isNotEmpty ? seen.first.date : (patient.createdAt.isEmpty ? null : patient.createdAt.substring(0, 10));
    final next = pending.isNotEmpty ? pending.first : null;

    Widget divider() => const Divider(height: 1, color: UvColors.border);

    return ListView(padding: const EdgeInsets.fromLTRB(16, 14, 16, 28), children: [
      UvCard(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Column(children: [
          InfoRow(leading: const Icon(Icons.badge_outlined, color: UvColors.teal, size: 22), label: 'UHID', value: patient.uhid),
          divider(),
          InfoRow(leading: const Icon(Icons.person_outline, color: UvColors.teal, size: 22), label: 'Patient information', value: '${patient.name}, ${patient.age} yrs, ${patient.sex}'),
          if (patient.mobile != null && patient.mobile!.isNotEmpty) ...[
            divider(),
            InfoRow(
              leading: const Icon(Icons.call_outlined, color: UvColors.teal, size: 22),
              label: 'Mobile',
              value: patient.mobile!,
              onTap: () => callNumber(context, patient.mobile!),
            ),
          ],
          divider(),
          InfoRow(leading: const Icon(Icons.assignment_outlined, color: UvColors.teal, size: 22), label: 'Chief complaints', value: patient.chiefComplaints),
        ]),
      ),
      const SizedBox(height: 12),
      UvCard(
        onTap: () => go(context, DiagnosisSelectScreen(patientId: patientId)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const UvIcon('renal', size: 22),
            const SizedBox(width: 12),
            const Expanded(child: Text('Diagnosis', style: UvText.small)),
            Text(dx.isEmpty ? 'Add' : 'Edit', style: const TextStyle(color: UvColors.teal, fontWeight: FontWeight.w600, fontSize: 13)),
          ]),
          const SizedBox(height: 8),
          if (dx.isEmpty && (patient.additionalDx == null))
            const Text('Not recorded', style: UvText.bodyBold)
          else
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final d in dx) Pill(d.label),
              if (patient.additionalDx != null) Pill(patient.additionalDx!, color: UvColors.navy, bg: const Color(0xFFF1F5F9)),
            ]),
        ]),
      ),
      const SizedBox(height: 12),
      UvCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.science_outlined, color: UvColors.teal, size: 22),
            const SizedBox(width: 12),
            const Expanded(child: Text('Latest investigations', style: UvText.small)),
            if (inv.isNotEmpty) GestureDetector(onTap: () => onTab(2), child: const Text('View all', style: TextStyle(color: UvColors.teal, fontWeight: FontWeight.w600, fontSize: 13))),
          ]),
          const SizedBox(height: 8),
          if (inv.isEmpty)
            const Text('None recorded', style: UvText.bodyBold)
          else
            for (final i in inv.take(3))
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(children: [
                  Icon(investigationIcon(i.name), size: 18, color: UvColors.textSecondary),
                  const SizedBox(width: 10),
                  Expanded(child: Text(i.name, style: UvText.bodyBold)),
                  Text(fmtDate(i.date), style: UvText.small),
                ]),
              ),
        ]),
      ),
      const SizedBox(height: 12),
      UvCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.notes_outlined, color: UvColors.teal, size: 22),
            const SizedBox(width: 12),
            const Expanded(child: Text('Management notes', style: UvText.small)),
            GestureDetector(onTap: () => _addNote(context, ref), child: const Text('Add', style: TextStyle(color: UvColors.teal, fontWeight: FontWeight.w600, fontSize: 13))),
          ]),
          const SizedBox(height: 8),
          if (notes.isEmpty)
            const Text('No notes yet', style: UvText.bodyBold)
          else
            for (final n in notes.take(4))
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(n.note, style: UvText.body),
                      const SizedBox(height: 2),
                      Text(fmtDate(n.createdAt), style: UvText.small),
                    ]),
                  ),
                  GestureDetector(
                    onTap: () async {
                      final ok = await confirm(context, title: 'Delete note?', message: 'This note will be removed.');
                      if (ok) await ref.read(repoProvider).deleteNote(n.id!);
                    },
                    child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.close, size: 16, color: UvColors.textSecondary)),
                  ),
                ]),
              ),
        ]),
      ),
      const SizedBox(height: 12),
      UvCard(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Column(children: [
          InfoRow(leading: const Icon(Icons.history, color: UvColors.teal, size: 22), label: 'Last visit', value: fmtDate(lastVisit)),
          divider(),
          InfoRow(
            leading: const Icon(Icons.event_outlined, color: UvColors.teal, size: 22),
            label: 'Next follow-up',
            value: next == null ? 'Not scheduled' : '${fmtDate(next.date)}  (${relativeDays(next.date)})',
            onTap: () => onTab(4),
          ),
        ]),
      ),
      const SizedBox(height: 16),
      Row(children: [
        Expanded(child: OutlineBtn(label: 'Add Note', icon: Icons.add, onPressed: () => _addNote(context, ref))),
        const SizedBox(width: 10),
        Expanded(child: OutlineBtn(label: 'Add Investigation', icon: Icons.add, onPressed: () => go(context, InvestigationFormScreen(patientId: patientId)))),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(child: OutlineBtn(label: 'Add Surgery', icon: Icons.add, onPressed: () => go(context, SurgeryFormScreen(patientId: patientId)))),
        const SizedBox(width: 10),
        Expanded(child: OutlineBtn(label: 'Add Follow-up', icon: Icons.add, onPressed: () => go(context, FollowUpFormScreen(patientId: patientId)))),
      ]),
      const SizedBox(height: 14),
      PrimaryButton(label: 'View Case Timeline', icon: Icons.timeline, onPressed: onTimeline),
    ]);
  }
}
