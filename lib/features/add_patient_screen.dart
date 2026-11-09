import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/constants.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'diagnosis_select_screen.dart';
import 'patient_profile_screen.dart';

/// Fast registration: UHID, Name, Age, Sex, Chief complaints. Also used to edit an existing patient.
class AddPatientScreen extends ConsumerStatefulWidget {
  final int? editId;
  final String? prefillUhid;
  const AddPatientScreen({super.key, this.editId, this.prefillUhid});
  @override
  ConsumerState<AddPatientScreen> createState() => _AddPatientScreenState();
}

class _AddPatientScreenState extends ConsumerState<AddPatientScreen> {
  static const _draftKey = 'draft_new_patient';

  final _uhid = TextEditingController();
  final _name = TextEditingController();
  final _age = TextEditingController();
  final _cc = TextEditingController();
  final _mobile = TextEditingController();
  String? _sex;
  Patient? _existing;
  bool _loading = true;
  bool _saving = false;
  bool _draftRestored = false;
  bool _submitted = false;
  int? _dupId;
  String? _dupName;
  Timer? _debounce;
  Timer? _draftTimer;

  bool get _editing => widget.editId != null;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    if (_editing) {
      final p = await ref.read(repoProvider).getPatient(widget.editId!);
      if (p != null) {
        _existing = p;
        _uhid.text = p.uhid;
        _name.text = p.name;
        _age.text = '${p.age}';
        _cc.text = p.chiefComplaints;
        _mobile.text = p.mobile ?? '';
        _sex = p.sex;
      }
    } else {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_draftKey);
      if (raw != null) {
        try {
          final m = jsonDecode(raw) as Map<String, dynamic>;
          _uhid.text = (m['uhid'] as String?) ?? '';
          _name.text = (m['name'] as String?) ?? '';
          _age.text = (m['age'] as String?) ?? '';
          _cc.text = (m['cc'] as String?) ?? '';
          _sex = m['sex'] as String?;
          _draftRestored = _uhid.text.isNotEmpty || _name.text.isNotEmpty || _cc.text.isNotEmpty;
        } catch (_) {}
      }
      if (widget.prefillUhid != null && widget.prefillUhid!.isNotEmpty) {
        _uhid.text = widget.prefillUhid!;
        _draftRestored = false;
      }
    }
    if (!mounted) return;
    setState(() => _loading = false);
    if (_uhid.text.trim().isNotEmpty) _checkDup();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _draftTimer?.cancel();
    _uhid.dispose();
    _name.dispose();
    _age.dispose();
    _cc.dispose();
    _mobile.dispose();
    super.dispose();
  }

  void _onChanged() {
    setState(() {});
    if (_editing) return;
    _draftTimer?.cancel();
    _draftTimer = Timer(const Duration(milliseconds: 500), _saveDraft);
  }

  Future<void> _saveDraft() async {
    final prefs = await SharedPreferences.getInstance();
    if (_uhid.text.isEmpty && _name.text.isEmpty && _age.text.isEmpty && _cc.text.isEmpty && _sex == null) {
      await prefs.remove(_draftKey);
      return;
    }
    await prefs.setString(_draftKey, jsonEncode({'uhid': _uhid.text, 'name': _name.text, 'age': _age.text, 'cc': _cc.text, 'sex': _sex}));
  }

  Future<void> _discardDraft() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_draftKey);
    setState(() {
      _uhid.clear();
      _name.clear();
      _age.clear();
      _cc.clear();
      _sex = null;
      _draftRestored = false;
      _dupId = null;
    });
  }

  void _onUhidChanged(String _) {
    _onChanged();
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), _checkDup);
  }

  Future<void> _checkDup() async {
    final u = _uhid.text.trim();
    if (u.isEmpty) {
      if (mounted) setState(() => _dupId = null);
      return;
    }
    final repo = ref.read(repoProvider);
    final id = await repo.patientIdByUhid(u);
    String? name;
    if (id != null && id != widget.editId) {
      name = (await repo.getPatient(id))?.name;
    }
    if (!mounted) return;
    setState(() {
      _dupId = (id != null && id != widget.editId) ? id : null;
      _dupName = name;
    });
  }

  String? get _uhidError {
    if (!_submitted) return null;
    if (_uhid.text.trim().isEmpty) return 'UHID is required';
    return null;
  }

  Future<void> _save() async {
    setState(() => _submitted = true);
    final ageNum = int.tryParse(_age.text.trim());
    final ok = _uhid.text.trim().isNotEmpty && _name.text.trim().isNotEmpty && ageNum != null && ageNum >= 0 && ageNum <= 120 && _sex != null && _cc.text.trim().isNotEmpty;
    if (!ok) return;
    await _checkDup();
    if (_dupId != null) return;

    setState(() => _saving = true);
    final repo = ref.read(repoProvider);
    try {
      final patient = Patient(
        id: widget.editId,
        uhid: _uhid.text.trim(),
        name: _name.text.trim(),
        age: ageNum!,
        sex: _sex!,
        chiefComplaints: _cc.text.trim(),
        mobile: _mobile.text.trim(),
        additionalDx: _existing?.additionalDx,
        isDemo: _existing?.isDemo ?? false,
      );
      if (_editing) {
        await repo.updatePatient(patient);
        if (mounted) Navigator.pop(context);
      } else {
        final id = await repo.createPatient(patient);
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove(_draftKey);
        if (!mounted) return;
        Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => DiagnosisSelectScreen(patientId: id, fromRegistration: true)));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        toast(context, 'Could not save: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dup = _dupId != null;
    final ageNum = int.tryParse(_age.text.trim());
    return Scaffold(
      appBar: AppBar(title: Text(_editing ? 'Edit Patient' : 'Add Patient')),
      bottomNavigationBar: BottomAction(child: PrimaryButton(label: _editing ? 'Save Changes' : 'Save Patient', onPressed: _loading ? null : _save, loading: _saving)),
      body: _loading
          ? loadingView()
          : ContentWidth(
              maxWidth: 560,
              child: ListView(
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
                children: [
                  if (_draftRestored)
                    Container(
                      margin: const EdgeInsets.only(bottom: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(color: UvColors.lightTeal, borderRadius: BorderRadius.circular(10)),
                      child: Row(children: [
                        const Icon(Icons.history, size: 18, color: UvColors.teal),
                        const SizedBox(width: 8),
                        const Expanded(child: Text('Unsaved draft restored', style: UvText.small)),
                        GestureDetector(onTap: _discardDraft, child: const Text('Discard', style: TextStyle(color: UvColors.teal, fontWeight: FontWeight.w600, fontSize: 13))),
                      ]),
                    ),
                  const FieldLabel('UHID', required: true),
                  TextField(
                    controller: _uhid,
                    onChanged: _onUhidChanged,
                    textCapitalization: TextCapitalization.characters,
                    textInputAction: TextInputAction.next,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: 0.8, color: UvColors.navy),
                    decoration: uvInput(hint: 'Hospital UHID (as on file)', error: _uhidError).copyWith(
                      fillColor: UvColors.lightTeal,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: dup ? UvColors.red : UvColors.teal, width: 1.4)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: dup ? UvColors.red : UvColors.teal, width: 2)),
                    ),
                  ),
                  if (dup)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: UvColors.redTint, borderRadius: BorderRadius.circular(10)),
                      child: Row(children: [
                        const Icon(Icons.error_outline, color: UvColors.red, size: 20),
                        const SizedBox(width: 8),
                        Expanded(child: Text('This UHID is already registered${_dupName == null ? '' : ' to $_dupName'}.', style: const TextStyle(color: UvColors.red, fontSize: 13, fontWeight: FontWeight.w500))),
                        TextButton(
                          onPressed: () => go(context, PatientProfileScreen(patientId: _dupId!)),
                          child: const Text('Open', style: TextStyle(color: UvColors.red, fontWeight: FontWeight.w700)),
                        ),
                      ]),
                    ),
                  const FieldLabel('Name', required: true),
                  TextField(
                    controller: _name,
                    onChanged: (_) => _onChanged(),
                    textCapitalization: TextCapitalization.words,
                    textInputAction: TextInputAction.next,
                    decoration: uvInput(hint: 'Full patient name', error: _submitted && _name.text.trim().isEmpty ? 'Name is required' : null),
                  ),
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Expanded(
                      flex: 2,
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const FieldLabel('Age', required: true),
                        TextField(
                          controller: _age,
                          onChanged: (_) => _onChanged(),
                          keyboardType: TextInputType.number,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(3)],
                          decoration: uvInput(hint: 'Years', error: _submitted && (ageNum == null || ageNum > 120) ? 'Enter age' : null),
                        ),
                      ]),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      flex: 5,
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const FieldLabel('Sex', required: true),
                        Row(children: [
                          for (final s in sexOptions)
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: GestureDetector(
                                  onTap: () {
                                    setState(() => _sex = s);
                                    _onChanged();
                                  },
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 150),
                                    height: 50,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: _sex == s ? UvColors.teal : Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: _sex == s ? UvColors.teal : (_submitted && _sex == null ? UvColors.red : UvColors.border)),
                                    ),
                                    child: Text(s, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: _sex == s ? Colors.white : UvColors.navy)),
                                  ),
                                ),
                              ),
                            ),
                        ]),
                      ]),
                    ),
                  ]),
                  const FieldLabel('Chief complaints', required: true),
                  TextField(
                    controller: _cc,
                    onChanged: (_) => _onChanged(),
                    minLines: 4,
                    maxLines: 8,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: uvInput(hint: 'e.g. Hematuria for 2 weeks', error: _submitted && _cc.text.trim().isEmpty ? 'Chief complaints are required' : null),
                  ),
                  if (_editing) ...[
                    const FieldLabel('Mobile (optional)'),
                    TextField(
                      controller: _mobile,
                      keyboardType: TextInputType.phone,
                      decoration: uvInput(hint: 'Enables the call button', prefix: const Icon(Icons.call_outlined, size: 20)),
                    ),
                  ],
                ],
              ),
            ),
    );
  }
}
