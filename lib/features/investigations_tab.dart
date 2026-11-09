import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'attachment_widgets.dart';
import 'investigation_form_screen.dart';

class InvestigationsTab extends ConsumerWidget {
  final int patientId;
  const InvestigationsTab({super.key, required this.patientId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(investigationsProvider(patientId));
    return Column(children: [
      Expanded(
        child: async.when(
          loading: loadingView,
          error: (e, _) => errorView(e),
          data: (items) {
            if (items.isEmpty) {
              return const EmptyState(
                icon: Icon(Icons.science_outlined, color: UvColors.teal, size: 34),
                title: 'No investigations yet',
                subtitle: 'Tick the tests ordered or done, then attach reports and images.',
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final Investigation inv = items[i];
                return UvCard(
                  onTap: () => go(context, InvestigationFormScreen(patientId: patientId, edit: inv)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(color: UvColors.lightTeal, borderRadius: BorderRadius.circular(12)),
                        child: Icon(investigationIcon(inv.name), color: UvColors.teal, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(inv.name, style: UvText.bodyBold),
                          Text(fmtDate(inv.date), style: UvText.small),
                        ]),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: UvColors.textSecondary, size: 22),
                        onPressed: () async {
                          final ok = await confirm(context, title: 'Delete ${inv.name}?', message: 'This investigation and its attachments will be removed.');
                          if (ok) await ref.read(repoProvider).deleteInvestigation(inv.id!);
                        },
                      ),
                    ]),
                    if (inv.notes != null) ...[const SizedBox(height: 8), Text(inv.notes!, style: UvText.body)],
                    SavedAttachments(patientId: patientId, refType: 'investigation', refId: inv.id!),
                  ]),
                );
              },
            );
          },
        ),
      ),
      BottomAction(child: PrimaryButton(label: 'Add Investigation / Report', icon: Icons.add, onPressed: () => go(context, InvestigationFormScreen(patientId: patientId)))),
    ]);
  }
}
