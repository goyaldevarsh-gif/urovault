import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'add_patient_screen.dart';
import 'common_tiles.dart';
import 'patient_profile_screen.dart';

/// Patient database. With [pickMode] it becomes a patient selector that pops the chosen [Patient].
class PatientsScreen extends ConsumerStatefulWidget {
  final bool pickMode;
  const PatientsScreen({super.key, this.pickMode = false});
  @override
  ConsumerState<PatientsScreen> createState() => _PatientsScreenState();
}

class _PatientsScreenState extends ConsumerState<PatientsScreen> {
  final _search = TextEditingController();
  String _q = '';
  String _filter = 'All';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final list = ref.watch(patientListProvider((q: _q, filter: _filter)));
    final total = list.asData?.value.length;
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: widget.pickMode,
        title: Text(widget.pickMode ? 'Select patient' : (total == null ? 'Patients' : 'Patients ($total)')),
      ),
      body: ContentWidth(
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
            child: TextField(
              controller: _search,
              onChanged: (v) => setState(() => _q = v),
              textInputAction: TextInputAction.search,
              decoration: uvInput(
                hint: 'Search by UHID or name',
                prefix: const Icon(Icons.search, size: 22),
                suffix: _q.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close, size: 20),
                        onPressed: () {
                          _search.clear();
                          setState(() => _q = '');
                        },
                      ),
              ),
            ),
          ),
          SizedBox(
            height: 42,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: patientFilters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) => UvChip(label: patientFilters[i], selected: _filter == patientFilters[i], onTap: () => setState(() => _filter = patientFilters[i])),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: list.when(
              loading: loadingView,
              error: (e, _) => errorView(e),
              data: (items) {
                if (items.isEmpty) {
                  if (_q.trim().isNotEmpty && widget.pickMode == false) {
                    return EmptyState(
                      title: 'No match for "${_q.trim()}"',
                      subtitle: 'Register this UHID as a new patient?',
                      actionLabel: 'Add patient',
                      onAction: () => go(context, AddPatientScreen(prefillUhid: _q.trim())),
                    );
                  }
                  return EmptyState(
                    title: _filter == 'All' ? 'No patients yet' : 'No $_filter patients',
                    subtitle: _filter == 'All' ? 'Register your first patient using their hospital UHID.' : 'Patients appear here once a matching diagnosis is selected.',
                    actionLabel: widget.pickMode || _filter != 'All' ? null : 'Add patient',
                    onAction: () => go(context, const AddPatientScreen()),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final Patient p = items[i];
                    return PatientTile(
                      patient: p,
                      onTap: () {
                        if (widget.pickMode) {
                          Navigator.pop(context, p);
                        } else {
                          go(context, PatientProfileScreen(patientId: p.id!));
                        }
                      },
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
