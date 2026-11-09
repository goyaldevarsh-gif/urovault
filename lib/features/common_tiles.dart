import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/models.dart';

Future<void> callNumber(BuildContext context, String number) async {
  final ok = await launchUrl(Uri(scheme: 'tel', path: number));
  if (!ok && context.mounted) toast(context, 'Could not open the dialer.');
}

class PatientTile extends StatelessWidget {
  final Patient patient;
  final VoidCallback onTap;
  final bool showDemoTag;
  const PatientTile({super.key, required this.patient, required this.onTap, this.showDemoTag = true});

  @override
  Widget build(BuildContext context) {
    final p = patient;
    return UvCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      onTap: onTap,
      child: Row(children: [
        Avatar(p.initials),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Flexible(child: Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: UvText.bodyBold)),
              if (p.isDemo && showDemoTag) ...[const SizedBox(width: 6), const Pill('SAMPLE', color: UvColors.amber, bg: UvColors.amberTint)],
            ]),
            const SizedBox(height: 2),
            Text('${p.ageSex}  •  UHID: ${p.uhid}', maxLines: 1, overflow: TextOverflow.ellipsis, style: UvText.small),
            if (p.primaryDx != null) ...[
              const SizedBox(height: 6),
              Pill(p.dxNames.length > 1 ? '${p.primaryDx}  +${p.dxNames.length - 1}' : p.primaryDx!),
            ],
          ]),
        ),
        if (p.mobile != null && p.mobile!.isNotEmpty)
          IconButton(
            icon: const Icon(Icons.call_outlined, color: UvColors.teal),
            onPressed: () => callNumber(context, p.mobile!),
          )
        else
          const Icon(Icons.chevron_right, color: UvColors.textSecondary),
      ]),
    );
  }
}

class FollowUpTile extends StatelessWidget {
  final FollowUp f;
  final VoidCallback onTap;
  final VoidCallback? onRecord;
  const FollowUpTile({super.key, required this.f, required this.onTap, this.onRecord});

  @override
  Widget build(BuildContext context) {
    final overdue = !f.completed && parseIso(f.date).isBefore(today());
    final dueToday = !f.completed && parseIso(f.date) == today();
    final Color c = f.completed ? UvColors.green : (overdue ? UvColors.red : (dueToday ? UvColors.amber : UvColors.teal));
    final Color bg = f.completed ? UvColors.greenTint : (overdue ? UvColors.redTint : (dueToday ? UvColors.amberTint : UvColors.lightTeal));
    return UvCard(
      padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
      onTap: onTap,
      child: Row(children: [
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
          alignment: Alignment.center,
          child: Icon(f.completed ? Icons.check_circle_outline : Icons.event_outlined, color: c),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(f.patientName ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: UvText.bodyBold),
            const SizedBox(height: 2),
            Text('UHID: ${f.uhid ?? ''}${f.dx == null ? '' : '  •  ${f.dx}'}', maxLines: 1, overflow: TextOverflow.ellipsis, style: UvText.small),
            const SizedBox(height: 4),
            Text(
              f.completed ? 'Seen ${fmtDate(f.date)}' : '${fmtDate(f.date)}  •  ${relativeDays(f.date)}',
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: c),
            ),
          ]),
        ),
        if (onRecord != null)
          TextButton(onPressed: onRecord, child: const Text('Record', style: TextStyle(color: UvColors.teal, fontWeight: FontWeight.w600)))
        else
          const Icon(Icons.chevron_right, color: UvColors.textSecondary),
      ]),
    );
  }
}
