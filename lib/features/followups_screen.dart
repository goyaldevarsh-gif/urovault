import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'common_tiles.dart';
import 'followup_form_screen.dart';
import 'patient_profile_screen.dart';
import 'patients_screen.dart';

const _filters = ['Due Today', 'Upcoming', 'Overdue', 'Completed'];

class FollowUpsScreen extends ConsumerStatefulWidget {
  const FollowUpsScreen({super.key});
  @override
  ConsumerState<FollowUpsScreen> createState() => _FollowUpsScreenState();
}

class _FollowUpsScreenState extends ConsumerState<FollowUpsScreen> {
  String _filter = 'Due Today';

  /// Schedules the next follow-up directly: pick patient, pick date.
  Future<void> _schedule() async {
    final p = await go<Patient>(context, const PatientsScreen(pickMode: true));
    if (p == null || !mounted) return;
    final d = await showDatePicker(
      context: context,
      helpText: 'Next follow-up for ${p.name}',
      initialDate: today().add(const Duration(days: 30)),
      firstDate: today(),
      lastDate: DateTime(today().year + 10),
    );
    if (d == null || !mounted) return;
    await ref.read(repoProvider).scheduleFollowUp(p.id!, isoDate(d));
    if (mounted) toast(context, 'Follow-up scheduled for ${fmtDate(isoDate(d))}');
  }

  @override
  Widget build(BuildContext context) {
    final counts = ref.watch(followUpCountsProvider).asData?.value ?? const <String, int>{};
    final list = ref.watch(followUpListProvider(_filter));
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Follow-ups'),
        actions: [IconButton(icon: const Icon(Icons.add_circle_outline), tooltip: 'Schedule follow-up', onPressed: _schedule)],
      ),
      body: ContentWidth(
        child: Column(children: [
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _filters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final f = _filters[i];
                return UvChip(label: f, count: '${counts[f] ?? 0}', selected: _filter == f, onTap: () => setState(() => _filter = f));
              },
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: list.when(
              loading: loadingView,
              error: (e, _) => errorView(e),
              data: (items) {
                if (items.isEmpty) {
                  return EmptyState(
                    icon: const Icon(Icons.event_available_outlined, color: UvColors.teal, size: 34),
                    title: 'Nothing ${_filter == 'Completed' ? 'completed yet' : _filter.toLowerCase()}',
                    subtitle: _filter == 'Completed' ? 'Recorded follow-up visits appear here.' : null,
                    actionLabel: 'Schedule follow-up',
                    onAction: _schedule,
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final f = items[i];
                    return FollowUpTile(
                      f: f,
                      onTap: () => go(context, PatientProfileScreen(patientId: f.patientId, initialTab: 4)),
                      onRecord: f.completed ? null : () => go(context, FollowUpFormScreen(patientId: f.patientId, edit: f)),
                    );
                  },
                );
              },
            ),
          ),
        ]),
      ),
    );
  }
}
