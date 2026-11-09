import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'attachment_widgets.dart';

class _Entry {
  DateTime date = today();
  final TextEditingController notes = TextEditingController();
  final TextEditingController custom = TextEditingController();
  List<String> files = [];
}

/// Add: tick any number of investigations, each with its own date, notes and attachments.
/// Edit: change date / notes / attachments of one investigation.
class InvestigationFormScreen extends ConsumerStatefulWidget {
  final int patientId;
  final Investigation? edit;
  const InvestigationFormScreen({super.key, required this.patientId, this.edit});
  @override
  ConsumerState<InvestigationFormScreen> createState() => _InvestigationFormScreenState();
}

class _InvestigationFormScreenState extends ConsumerState<InvestigationFormScreen> {
  final Map<String, _Entry> _sel = {};
  bool _saving = false;

  bool get _editing => widget.edit != null;

  @override
  void initState() {
    super.initState();
    if (_editing) {
      final e = _Entry()
        ..date = parseIso(widget.edit!.date)
        ..notes.text = widget.edit!.notes ?? '';
      _sel[widget.edit!.name] = e;
    }
  }

  @override
  void dispose() {
    for (final e in _sel.values) {
      e.notes.dispose();
      e.custom.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (_sel.isEmpty) {
      toast(context, 'Select at least one investigation.');
      return;
    }
    setState(() => _saving = true);
    final repo = ref.read(repoProvider);
    try {
      if (_editing) {
        final name = widget.edit!.name;
        final e = _sel[name]!;
        await repo.updateInvestigation(widget.edit!.id!, isoDate(e.date), e.notes.text);
        await _saveFiles(widget.edit!.id!, name, e);
      } else {
        for (final entry in _sel.entries) {
          var name = entry.key;
          if (name == 'Other' && entry.value.custom.text.trim().isNotEmpty) name = entry.value.custom.text.trim();
          final id = await repo.addInvestigation(widget.patientId, name, isoDate(entry.value.date), entry.value.notes.text);
          await _saveFiles(id, name, entry.value);
        }
      }
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        toast(context, 'Could not save: $e');
      }
    }
  }

  Future<void> _saveFiles(int invId, String name, _Entry e) async {
    final repo = ref.read(repoProvider);
    for (final path in e.files) {
      await repo.addMedia(
        patientId: widget.patientId,
        srcPath: path,
        category: investigationCategory(name),
        caption: name,
        takenAt: isoDate(e.date),
        refType: 'investigation',
        refId: invId,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_editing ? widget.edit!.name : 'Add Investigations')),
      bottomNavigationBar: BottomAction(child: PrimaryButton(label: 'Save', onPressed: _save, loading: _saving)),
      body: ContentWidth(
        maxWidth: 600,
        child: ListView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
          children: [
            if (!_editing) const Padding(padding: EdgeInsets.fromLTRB(4, 0, 4, 12), child: Text('Tick the investigations. Each can have its own date, notes and reports.', style: UvText.small)),
            if (_editing)
              _tile(InvestigationOption(widget.edit!.name, investigationIcon(widget.edit!.name), investigationCategory(widget.edit!.name)))
            else
              for (final o in investigationOptions) _tile(o),
            if (_editing) ...[
              const FieldLabel('Saved attachments'),
              SavedAttachments(patientId: widget.patientId, refType: 'investigation', refId: widget.edit!.id!, allowDelete: true),
            ],
          ],
        ),
      ),
    );
  }

  Widget _tile(InvestigationOption o) {
    final on = _sel.containsKey(o.name);
    final e = _sel[o.name];
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: UvCard(
        padding: EdgeInsets.zero,
        color: on ? UvColors.lightTeal : Colors.white,
        child: Column(children: [
          InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: _editing
                ? null
                : () => setState(() {
                      if (on) {
                        _sel.remove(o.name);
                      } else {
                        _sel[o.name] = _Entry();
                      }
                    }),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(children: [
                Icon(o.icon, color: UvColors.teal, size: 22),
                const SizedBox(width: 14),
                Expanded(child: Text(o.name, style: UvText.bodyBold.copyWith(fontSize: 15))),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: on ? UvColors.teal : Colors.transparent,
                    borderRadius: BorderRadius.circular(7),
                    border: Border.all(color: on ? UvColors.teal : const Color(0xFFCBD5E1), width: 1.6),
                  ),
                  child: on ? const Icon(Icons.check, size: 16, color: Colors.white) : null,
                ),
              ]),
            ),
          ),
          if (on && e != null)
            Container(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (o.name == 'Other' && !_editing) ...[
                  const FieldLabel('Specify test'),
                  TextField(controller: e.custom, decoration: uvInput(hint: 'Name of investigation')),
                ],
                UvDateField(label: 'Date', value: e.date, onChanged: (d) => setState(() => e.date = d)),
                const FieldLabel('Notes (optional)'),
                TextField(controller: e.notes, minLines: 1, maxLines: 4, textCapitalization: TextCapitalization.sentences, decoration: uvInput(hint: 'Result summary or remarks')),
                const FieldLabel('Reports / images'),
                PendingAttachments(paths: e.files, onChanged: (v) => setState(() => e.files = v)),
              ]),
            ),
        ]),
      ),
    );
  }
}
