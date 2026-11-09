import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/models.dart';
import '../data/providers.dart';

IconData _iconFor(String type) {
  switch (type) {
    case 'investigation':
      return Icons.science_outlined;
    case 'surgery':
      return Icons.healing_outlined;
    case 'followup':
      return Icons.event_available_outlined;
    case 'scheduled':
      return Icons.event_outlined;
    default:
      return Icons.assignment_outlined;
  }
}

/// Complete case timeline, oldest first. Tapping an entry returns its tab index to the profile.
class TimelineScreen extends ConsumerWidget {
  final int patientId;
  const TimelineScreen({super.key, required this.patientId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(timelineProvider(patientId));
    return Scaffold(
      appBar: AppBar(title: const Text('Case Timeline')),
      body: ContentWidth(
        child: async.when(
          loading: loadingView,
          error: (e, _) => errorView(e),
          data: (events) => ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            itemCount: events.length,
            itemBuilder: (_, i) {
              final TimelineEvent e = events[i];
              final pending = e.type == 'scheduled';
              return IntrinsicHeight(
                child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  SizedBox(
                    width: 28,
                    child: Column(children: [
                      Container(width: 12, height: 12, margin: const EdgeInsets.only(top: 14), decoration: BoxDecoration(color: pending ? Colors.white : UvColors.teal, shape: BoxShape.circle, border: Border.all(color: UvColors.teal, width: 2))),
                      if (i != events.length - 1) Expanded(child: Container(width: 2, color: UvColors.border)),
                    ]),
                  ),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: UvCard(
                        padding: const EdgeInsets.all(12),
                        onTap: () => Navigator.pop(context, e.tab),
                        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(color: UvColors.lightTeal, borderRadius: BorderRadius.circular(10)),
                            child: Icon(_iconFor(e.type), color: UvColors.teal, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text('${fmtDate(e.date)}  –  ${e.title}', style: UvText.bodyBold),
                              if (e.subtitle.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 2), child: Text(e.subtitle, style: UvText.small, maxLines: 3, overflow: TextOverflow.ellipsis)),
                            ]),
                          ),
                        ]),
                      ),
                    ),
                  ),
                ]),
              );
            },
          ),
        ),
      ),
    );
  }
}
