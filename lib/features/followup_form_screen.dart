import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'attachment_widgets.dart';

/// Records a visit (notes, status, images) and optionally schedules the next follow-up.
/// If [edit] is a scheduled (pending) entry, saving completes it.
class FollowUpFormScreen extends ConsumerStatefulWidget {
  final int patientId;
  final FollowUp? edit;
  const FollowUpFormScreen({super.key, required this.patientId, this.edit});
  @override
  ConsumerState<FollowUpFormScreen> createState() => _FollowUpFormScreenState();
}

class _FollowUpFormScreenState extends ConsumerState<FollowUpFormScreen> {
  final _notes = TextEditingController();
  DateTime _date = today();
  String? _status;
  String? _interval; // one of followUpIntervals, 'Custom' or null
  DateTime? _custom;
  List<String> _files = [];
  bool _saving = false;

  bool get _editingCompleted => widget.edit != null && widget.edit!.completed;

  @override
  void initState() {
    super.initState();
    final e = widget.edit;
    if (e != null) {
      _notes.text = e.notes ?? '';
      _status = e.status;
      if (e.completed) _date = parseIso(e.date);
    }
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  DateTime? get _next {
    if (_interval == null) return null;
    if (_interval == 'Custom') return _custom;
    return nextDateFor(_interval!, _date);
  }

  Future<void> _pickCustom() async {
    final d = await showDatePicker(context: context, initialDate: _custom ?? _date.add(const Duration(days: 30)), firstDate: today(), lastDate: DateTime(today().year + 10));
    if (d != null) setState(() {
      _custom = d;
      _interval = 'Custom';
    });
  }

  Future<void> _save() async {
    if (_interval == 'Custom' && _custom == null) {
      toast(context, 'Pick the next follow-up date.');
      return;
    }
    setState(() => _saving = true);
    final repo = ref.read(repoProvider);
    try {
      final id = await repo.saveVisit(
        existingId: widget.edit?.id,
        patientId: widget.patientId,
        date: isoDate(_date),
        notes: _notes.text,
        status: _status,
        nextDate: _editingCompleted ? widget.edit!.nextDate : (_next == null ? null : isoDate(_next!)),
      );
      for (final p in _files) {
        await repo.addMedia(patientId: widget.patientId, srcPath: p, category: 'Follow-up', takenAt: isoDate(_date), refType: 'followup', refId: id);
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
    final isPending = widget.edit != null && !widget.edit!.completed;
    final title = _editingCompleted ? 'Edit Follow-up' : (isPending ? 'Record Follow-up' : 'Add Follow-up');
    final next = _next;
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      bottomNavigationBar: BottomAction(child: PrimaryButton(label: 'Save Follow-up', onPressed: _save, loading: _saving)),
      body: ContentWidth(
        maxWidth: 600,
        child: ListView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
          children: [
            if (isPending)
              Container(
                margin: const EdgeInsets.only(bottom: 4),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: UvColors.lightTeal, borderRadius: BorderRadius.circular(10)),
                child: Text('Scheduled for ${fmtDate(widget.edit!.date)}. Saving records this visit.', style: UvText.small),
              ),
            UvDateField(label: 'Follow-up date', required: true, value: _date, last: today(), onChanged: (d) => setState(() => _date = d)),
            const FieldLabel('Clinical notes'),
            TextField(controller: _notes, minLines: 4, maxLines: 10, textCapitalization: TextCapitalization.sentences, decoration: uvInput(hint: 'Findings, plan, investigations reviewed...')),
            const FieldLabel('Current status (optional)'),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final s in followUpStatuses) UvChip(label: s, selected: _status == s, onTap: () => setState(() => _status = _status == s ? null : s)),
            ]),
            const FieldLabel('Images (optional)'),
            PendingAttachments(paths: _files, allowFiles: false, onChanged: (v) => setState(() => _files = v)),
            if (_editingCompleted) ...[
              const FieldLabel('Saved images'),
              SavedAttachments(patientId: widget.patientId, refType: 'followup', refId: widget.edit!.id!, allowDelete: true),
            ] else ...[
              const FieldLabel('Next follow-up'),
              Wrap(spacing: 8, runSpacing: 8, children: [
                UvChip(label: 'Not set', selected: _interval == null, onTap: () => setState(() => _interval = null)),
                for (final i in followUpIntervals) UvChip(label: i, selected: _interval == i, onTap: () => setState(() => _interval = i)),
                UvChip(label: _interval == 'Custom' && _custom != null ? fmtDate(isoDate(_custom!)) : 'Pick date', selected: _interval == 'Custom', onTap: _pickCustom),
              ]),
              if (next != null)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Row(children: [
                    const Icon(Icons.event_outlined, size: 18, color: UvColors.teal),
                    const SizedBox(width: 8),
                    Text('Next review: ${fmtDate(isoDate(next))}', style: UvText.bodyBold),
                  ]),
                )
              else
                const Padding(padding: EdgeInsets.only(top: 8), child: Text('No next follow-up will be scheduled.', style: UvText.small)),
            ],
          ],
        ),
      ),
    );
  }
}
