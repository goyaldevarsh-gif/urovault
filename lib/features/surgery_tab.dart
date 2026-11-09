import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'attachment_widgets.dart';
import 'surgery_form_screen.dart';

class SurgeryTab extends ConsumerWidget {
  final int patientId;
  const SurgeryTab({super.key, required this.patientId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(surgeriesProvider(patientId));
    return Column(children: [
      Expanded(
        child: async.when(
          loading: loadingView,
          error: (e, _) => errorView(e),
          data: (items) {
            if (items.isEmpty) {
              return const EmptyState(
                icon: Icon(Icons.healing_outlined, color: UvColors.teal, size: 34),
                title: 'No surgery recorded',
                subtitle: 'Procedure, operative notes, HPE and photographs appear here.',
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => SurgeryCard(surgery: items[i]),
            );
          },
        ),
      ),
      BottomAction(child: PrimaryButton(label: 'Add Surgery', icon: Icons.add, onPressed: () => go(context, SurgeryFormScreen(patientId: patientId)))),
    ]);
  }
}

class SurgeryCard extends ConsumerWidget {
  final Surgery surgery;
  const SurgeryCard({super.key, required this.surgery});

  Widget _field(String label, String? value) {
    if (value == null || value.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label.toUpperCase(), style: UvText.label),
        const SizedBox(height: 3),
        Text(value, style: UvText.body),
      ]),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = surgery;
    return UvCard(
      onTap: () => go(context, SurgeryFormScreen(patientId: s.patientId, edit: s)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: UvColors.lightTeal, borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.healing_outlined, color: UvColors.teal),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s.procedure, style: UvText.h3),
              Text(fmtDate(s.date), style: UvText.small),
            ]),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: UvColors.textSecondary, size: 22),
            onPressed: () async {
              final ok = await confirm(context, title: 'Delete ${s.procedure}?', message: 'This surgical record and its attachments will be removed.');
              if (ok) await ref.read(repoProvider).deleteSurgery(s.id!);
            },
          ),
        ]),
        _field('Indication', s.indication),
        _field('Operative notes', s.operativeNotes),
        _field('Findings', s.findings),
        _field('HPE', s.hpe),
        _field('Post-op instructions', s.postopInstructions),
        SavedAttachments(patientId: s.patientId, refType: 'surgery', refId: s.id!),
      ]),
    );
  }
}
