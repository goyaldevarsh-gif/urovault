import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'patient_profile_screen.dart';
import 'patients_screen.dart';
import 'surgery_form_screen.dart';

/// All surgeries across patients. "+" selects an existing patient, then opens the surgery form.
class SurgeriesScreen extends ConsumerWidget {
  const SurgeriesScreen({super.key});

  Future<void> _add(BuildContext context) async {
    final p = await go<Patient>(context, const PatientsScreen(pickMode: true));
    if (p == null || !context.mounted) return;
    await go(context, SurgeryFormScreen(patientId: p.id!));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(allSurgeriesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Surgeries'), actions: [IconButton(icon: const Icon(Icons.add_circle_outline), onPressed: () => _add(context))]),
      body: ContentWidth(
        child: async.when(
          loading: loadingView,
          error: (e, _) => errorView(e),
          data: (items) => items.isEmpty
              ? EmptyState(
                  icon: const Icon(Icons.healing_outlined, color: UvColors.teal, size: 34),
                  title: 'No surgeries recorded',
                  subtitle: 'Select a patient and record the procedure.',
                  actionLabel: 'Add surgery',
                  onAction: () => _add(context),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final s = items[i];
                    return UvCard(
                      onTap: () => go(context, PatientProfileScreen(patientId: s.patientId, initialTab: 3)),
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
                            Text(s.procedure, style: UvText.bodyBold),
                            Text('${s.patientName ?? ''}  •  UHID: ${s.uhid ?? ''}', style: UvText.small, maxLines: 1, overflow: TextOverflow.ellipsis),
                            Text(fmtDate(s.date), style: UvText.small),
                          ]),
                        ),
                        const Icon(Icons.chevron_right, color: UvColors.textSecondary),
                      ]),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
