import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'attachment_widgets.dart';

/// Simple free-text surgical record. Multiple surgeries per patient are allowed.
class SurgeryFormScreen extends ConsumerStatefulWidget {
  final int patientId;
  final Surgery? edit;
  const SurgeryFormScreen({super.key, required this.patientId, this.edit});
  @override
  ConsumerState<SurgeryFormScreen> createState() => _SurgeryFormScreenState();
}

class _SurgeryFormScreenState extends ConsumerState<SurgeryFormScreen> {
  final _procedure = TextEditingController();
  final _indication = TextEditingController();
  final _notes = TextEditingController();
  final _findings = TextEditingController();
  final _hpe = TextEditingController();
  final _postop = TextEditingController();
  DateTime? _date;
  List<String> _photos = [];
  List<String> _hpeFiles = [];
  String _photoCategory = 'Clinical';
  bool _submitted = false;
  bool _saving = false;

  bool get _editing => widget.edit != null;

  @override
  void initState() {
    super.initState();
    final s = widget.edit;
    if (s != null) {
      _procedure.text = s.procedure;
      _indication.text = s.indication ?? '';
      _notes.text = s.operativeNotes ?? '';
      _findings.text = s.findings ?? '';
      _hpe.text = s.hpe ?? '';
      _postop.text = s.postopInstructions ?? '';
      _date = parseIso(s.date);
    }
  }

  @override
  void dispose() {
    _procedure.dispose();
    _indication.dispose();
    _notes.dispose();
    _findings.dispose();
    _hpe.dispose();
    _postop.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _submitted = true);
    if (_procedure.text.trim().isEmpty || _date == null) return;
    setState(() => _saving = true);
    final repo = ref.read(repoProvider);
    try {
      final id = await repo.saveSurgery(Surgery(
        id: widget.edit?.id,
        patientId: widget.patientId,
        procedure: _procedure.text,
        date: isoDate(_date!),
        indication: _indication.text,
        operativeNotes: _notes.text,
        findings: _findings.text,
        hpe: _hpe.text,
        postopInstructions: _postop.text,
      ));
      for (final p in _photos) {
        await repo.addMedia(patientId: widget.patientId, srcPath: p, category: _photoCategory, caption: _procedure.text.trim(), takenAt: isoDate(_date!), refType: 'surgery', refId: id);
      }
      for (final p in _hpeFiles) {
        await repo.addMedia(patientId: widget.patientId, srcPath: p, category: 'Other', caption: 'HPE report', takenAt: isoDate(_date!), refType: 'surgery', refId: id);
      }
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        toast(context, 'Could not save: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dx = ref.watch(dxProvider(widget.patientId)).asData?.value ?? [];
    return Scaffold(
      appBar: AppBar(title: Text(_editing ? 'Edit Surgery' : 'Add Surgery')),
      bottomNavigationBar: BottomAction(child: PrimaryButton(label: 'Save Surgery', onPressed: _save, loading: _saving)),
      body: ContentWidth(
        maxWidth: 600,
        child: ListView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
          children: [
            const FieldLabel('Procedure', required: true),
            TextField(
              controller: _procedure,
              textCapitalization: TextCapitalization.words,
              decoration: uvInput(hint: 'e.g. TURBT', error: _submitted && _procedure.text.trim().isEmpty ? 'Procedure is required' : null),
            ),
            const SizedBox(height: 8),
            Wrap(spacing: 6, runSpacing: 6, children: [
              for (final c in commonProcedures) UvChip(label: c, selected: _procedure.text.trim() == c, onTap: () => setState(() => _procedure.text = c)),
            ]),
            UvDateField(label: 'Surgery date', required: true, value: _date, onChanged: (d) => setState(() => _date = d)),
            if (_submitted && _date == null) const Padding(padding: EdgeInsets.only(top: 4), child: Text('Date is required', style: TextStyle(color: UvColors.red, fontSize: 12))),
            const FieldLabel('Indication'),
            if (dx.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Wrap(spacing: 6, runSpacing: 6, children: [
                  for (final d in dx)
                    UvChip(
                      label: d.label,
                      onTap: () => setState(() {
                        final cur = _indication.text.trim();
                        _indication.text = cur.isEmpty ? d.label : '$cur, ${d.label}';
                      }),
                    ),
                ]),
              ),
            TextField(controller: _indication, textCapitalization: TextCapitalization.sentences, decoration: uvInput(hint: 'Diagnosis / reason for surgery')),
            const FieldLabel('Operative notes'),
            TextField(controller: _notes, minLines: 4, maxLines: 10, textCapitalization: TextCapitalization.sentences, decoration: uvInput(hint: 'Free text')),
            const FieldLabel('Relevant findings'),
            TextField(controller: _findings, minLines: 2, maxLines: 6, textCapitalization: TextCapitalization.sentences, decoration: uvInput(hint: 'Intra-operative findings')),
            const FieldLabel('HPE report'),
            TextField(controller: _hpe, minLines: 2, maxLines: 6, textCapitalization: TextCapitalization.sentences, decoration: uvInput(hint: 'Histopathology result, if applicable')),
            const SizedBox(height: 10),
            PendingAttachments(paths: _hpeFiles, onChanged: (v) => setState(() => _hpeFiles = v)),
            const FieldLabel('Operative photographs'),
            Wrap(spacing: 6, runSpacing: 6, children: [
              for (final c in const ['Clinical', 'Pre-op', 'Post-op']) UvChip(label: c, selected: _photoCategory == c, onTap: () => setState(() => _photoCategory = c)),
            ]),
            const SizedBox(height: 10),
            PendingAttachments(paths: _photos, allowFiles: false, onChanged: (v) => setState(() => _photos = v)),
            const FieldLabel('Postoperative instructions'),
            TextField(controller: _postop, minLines: 2, maxLines: 6, textCapitalization: TextCapitalization.sentences, decoration: uvInput(hint: 'Catheter, medications, review plan...')),
            if (_editing) ...[
              const FieldLabel('Saved attachments'),
              SavedAttachments(patientId: widget.patientId, refType: 'surgery', refId: widget.edit!.id!, allowDelete: true),
            ],
          ],
        ),
      ),
    );
  }
}
