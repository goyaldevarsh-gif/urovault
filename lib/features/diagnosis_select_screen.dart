import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'patient_profile_screen.dart';

class _Sel {
  final String name;
  String? lat;
  String detail;
  _Sel(this.name, {this.lat, this.detail = ''});
}

/// One-tap diagnosis selection. Multiple diagnoses allowed; the first selected is the primary one.
class DiagnosisSelectScreen extends ConsumerStatefulWidget {
  final int patientId;
  final bool fromRegistration;
  const DiagnosisSelectScreen({super.key, required this.patientId, this.fromRegistration = false});
  @override
  ConsumerState<DiagnosisSelectScreen> createState() => _DiagnosisSelectScreenState();
}

class _DiagnosisSelectScreenState extends ConsumerState<DiagnosisSelectScreen> {
  final List<_Sel> _sel = [];
  final _additional = TextEditingController();
  final Map<String, TextEditingController> _detailCtl = {};
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final repo = ref.read(repoProvider);
    final dx = await repo.getDiagnoses(widget.patientId);
    final p = await repo.getPatient(widget.patientId);
    for (final d in dx) {
      _sel.add(_Sel(d.name, lat: d.laterality, detail: d.detail ?? ''));
    }
    _additional.text = p?.additionalDx ?? '';
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  void dispose() {
    _additional.dispose();
    for (final c in _detailCtl.values) {
      c.dispose();
    }
    super.dispose();
  }

  int _indexOf(String name) => _sel.indexWhere((s) => s.name == name);

  void _toggle(String name) {
    setState(() {
      final i = _indexOf(name);
      if (i >= 0) {
        _sel.removeAt(i);
      } else {
        _sel.add(_Sel(name));
      }
    });
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final list = _sel
        .map((s) => PatientDx(name: s.name, laterality: s.lat, detail: s.name == 'Other' && s.detail.trim().isNotEmpty ? s.detail.trim() : null))
        .toList();
    await ref.read(repoProvider).setDiagnoses(widget.patientId, list, _additional.text);
    if (!mounted) return;
    if (widget.fromRegistration) {
      Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => PatientProfileScreen(patientId: widget.patientId)));
    } else {
      Navigator.pop(context);
    }
  }

  void _skip() {
    Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => PatientProfileScreen(patientId: widget.patientId)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Diagnosis'),
        actions: [
          if (widget.fromRegistration) TextButton(onPressed: _skip, child: const Text('Skip', style: TextStyle(color: UvColors.textSecondary, fontWeight: FontWeight.w600))),
        ],
      ),
      bottomNavigationBar: BottomAction(
        child: PrimaryButton(label: widget.fromRegistration ? 'Continue' : 'Save Diagnosis', onPressed: _loading ? null : _save, loading: _saving),
      ),
      body: _loading
          ? loadingView()
          : ContentWidth(
              maxWidth: 560,
              child: ListView(
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                children: [
                  const Padding(
                    padding: EdgeInsets.fromLTRB(4, 0, 4, 12),
                    child: Text('Tap to select. You can choose more than one; the first is the primary diagnosis.', style: UvText.small),
                  ),
                  for (final o in diagnosisOptions) _optionCard(o),
                  const FieldLabel('Additional diagnosis (optional)'),
                  TextField(
                    controller: _additional,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: uvInput(hint: 'Anything not covered above'),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _optionCard(DxOption o) {
    final i = _indexOf(o.name);
    final selected = i >= 0;
    final sel = selected ? _sel[i] : null;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: UvCard(
        padding: const EdgeInsets.all(0),
        onTap: () => _toggle(o.name),
        color: selected ? UvColors.lightTeal : Colors.white,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(color: selected ? Colors.white : UvColors.lightTeal, borderRadius: BorderRadius.circular(12)),
                alignment: Alignment.center,
                child: dxIcon(o.name, size: 26),
              ),
              const SizedBox(width: 14),
              Expanded(child: Text(o.name, style: UvText.bodyBold.copyWith(fontSize: 15))),
              if (selected && i == 0 && _sel.length > 1) const Padding(padding: EdgeInsets.only(right: 10), child: Pill('Primary')),
              if (selected && i > 0)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () => setState(() {
                      final s = _sel.removeAt(i);
                      _sel.insert(0, s);
                    }),
                    child: const Text('Make primary', style: TextStyle(color: UvColors.teal, fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                ),
              AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selected ? UvColors.teal : Colors.transparent,
                  border: Border.all(color: selected ? UvColors.teal : const Color(0xFFCBD5E1), width: 1.6),
                ),
                child: selected ? const Icon(Icons.check, size: 16, color: Colors.white) : null,
              ),
            ]),
            if (selected && o.paired) ...[
              const SizedBox(height: 10),
              Row(children: [
                const Text('Side', style: UvText.small),
                const SizedBox(width: 10),
                for (final l in lateralities)
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: UvChip(label: l, selected: sel!.lat == l, onTap: () => setState(() => sel!.lat = sel!.lat == l ? null : l)),
                  ),
              ]),
            ],
            if (selected && o.name == 'Other') ...[
              const SizedBox(height: 10),
              TextField(
                controller: _detailCtl.putIfAbsent(o.name, () => TextEditingController(text: sel!.detail)),
                onChanged: (v) => sel!.detail = v,
                decoration: uvInput(hint: 'Specify diagnosis'),
              ),
            ],
          ]),
        ),
      ),
    );
  }
}
