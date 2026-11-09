import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'attachment_widgets.dart';
import 'followup_form_screen.dart';

class FollowUpTab extends ConsumerWidget {
  final int patientId;
  const FollowUpTab({super.key, required this.patientId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(followUpsProvider(patientId));
    return Column(children: [
      Expanded(
        child: async.when(
          loading: loadingView,
          error: (e, _) => errorView(e),
          data: (items) {
            if (items.isEmpty) {
              return const EmptyState(
                icon: Icon(Icons.event_available_outlined, color: UvColors.teal, size: 34),
                title: 'No follow-ups yet',
                subtitle: 'Add notes and photographs at each visit and schedule the next review.',
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              itemCount: items.length,
              itemBuilder: (_, i) => _Entry(f: items[i], last: i == items.length - 1),
            );
          },
        ),
      ),
      BottomAction(child: PrimaryButton(label: 'Add Follow-up', icon: Icons.add, onPressed: () => go(context, FollowUpFormScreen(patientId: patientId)))),
    ]);
  }
}

class _Entry extends ConsumerWidget {
  final FollowUp f;
  final bool last;
  const _Entry({required this.f, required this.last});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overdue = !f.completed && parseIso(f.date).isBefore(today());
    final Color c = f.completed ? UvColors.green : (overdue ? UvColors.red : UvColors.teal);
    final String label = f.completed ? 'Seen' : (overdue ? 'Overdue' : 'Scheduled');
    return IntrinsicHeight(
      child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SizedBox(
          width: 24,
          child: Column(children: [
            const SizedBox(height: 6),
            Container(width: 12, height: 12, decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
            if (!last) Expanded(child: Container(width: 2, color: UvColors.border)),
          ]),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: UvCard(
              onTap: () => go(context, FollowUpFormScreen(patientId: f.patientId, edit: f)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(fmtDate(f.date), style: UvText.h3)),
                  Pill(label, color: c, bg: f.completed ? UvColors.greenTint : (overdue ? UvColors.redTint : UvColors.lightTeal)),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(Icons.delete_outline, size: 20, color: UvColors.textSecondary),
                    onPressed: () async {
                      final ok = await confirm(context, title: 'Delete entry?', message: 'This follow-up entry and its images will be removed.');
                      if (ok) await ref.read(repoProvider).deleteFollowUp(f.id!);
                    },
                  ),
                ]),
                if (f.status != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text('Status: ${f.status}', style: UvText.bodyBold)),
                if (f.notes != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(f.notes!, style: UvText.body)),
                if (!f.completed && f.notes == null) Padding(padding: const EdgeInsets.only(top: 6), child: Text('Tap to record this visit (${relativeDays(f.date)})', style: UvText.small)),
                SavedAttachments(patientId: f.patientId, refType: 'followup', refId: f.id!),
                if (f.nextDate != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text('Next follow-up: ${fmtDate(f.nextDate)}', style: UvText.small)),
              ]),
            ),
          ),
        ),
      ]),
    );
  }
}
