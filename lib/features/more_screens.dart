import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/providers.dart';
import '../services/auth_service.dart';
import '../services/export_service.dart';

Widget _page(String title, List<Widget> children, {Widget? bottom}) => Scaffold(
      appBar: AppBar(title: Text(title)),
      bottomNavigationBar: bottom,
      body: ContentWidth(maxWidth: 600, child: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 28), children: children)),
    );

Widget _note(IconData icon, String text) => Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 18, color: UvColors.teal),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: UvText.body)),
      ]),
    );

// ---------------------------------------------------------------- statistics

class StatisticsScreen extends ConsumerWidget {
  const StatisticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = ref.watch(countsProvider).asData?.value ?? const <String, int>{};
    final List<MapEntry<String, int>> dx = ref.watch(dxStatsProvider).asData?.value ?? <MapEntry<String, int>>[];
    final maxV = dx.isEmpty ? 1 : dx.first.value;

    Widget stat(String label, int? v) => Expanded(
          child: UvCard(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Column(children: [
              Text('${v ?? 0}', style: UvText.h1),
              const SizedBox(height: 2),
              Text(label, style: UvText.small, textAlign: TextAlign.center),
            ]),
          ),
        );

    return _page('Patient Statistics', [
      Row(children: [stat('Patients', c['patients']), const SizedBox(width: 10), stat('Surgeries', c['surgeries']), const SizedBox(width: 10), stat('Follow-ups seen', c['followups'])]),
      const SizedBox(height: 10),
      Row(children: [stat('Investigations', c['investigations']), const SizedBox(width: 10), stat('Images & reports', c['media']), const SizedBox(width: 10), stat('Due / overdue', c['due'])]),
      const SectionTitle('Patients by diagnosis'),
      if (dx.isEmpty)
        const Text('No diagnoses recorded yet.', style: UvText.small)
      else
        UvCard(
          child: Column(children: [
            for (final e in dx)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(children: [
                  SizedBox(width: 110, child: Text(e.key, style: UvText.body, maxLines: 1, overflow: TextOverflow.ellipsis)),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(value: e.value / maxV, minHeight: 10, backgroundColor: UvColors.lightTeal, color: UvColors.teal),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text('${e.value}', style: UvText.bodyBold),
                ]),
              ),
          ]),
        ),
    ]);
  }
}

// ------------------------------------------------------------------- reports

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});
  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  bool _busy = false;

  Future<void> _csv() async {
    setState(() => _busy = true);
    try {
      await ExportService.exportPatientsCsv(ref.read(repoProvider));
    } catch (e) {
      if (mounted) toast(context, 'Export failed: $e');
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return _page('Reports & Export', [
      _note(Icons.table_chart_outlined, 'Patient list (UHID, name, age, sex, complaints, diagnoses) as a CSV file you can open in Excel or Sheets.'),
      PrimaryButton(label: 'Export patients (CSV)', icon: Icons.ios_share, onPressed: _csv, loading: _busy),
      const SizedBox(height: 20),
      _note(Icons.picture_as_pdf_outlined, 'For a single patient, open the patient and use the menu at the top right: Export case summary (PDF).'),
      _note(Icons.warning_amber_outlined, 'Exported files are not encrypted. Share them only with people and apps you trust.'),
    ]);
  }
}

// -------------------------------------------------------------------- backup

class BackupScreen extends ConsumerStatefulWidget {
  const BackupScreen({super.key});
  @override
  ConsumerState<BackupScreen> createState() => _BackupScreenState();
}

class _BackupScreenState extends ConsumerState<BackupScreen> {
  bool _busy = false;

  Future<void> _backup() async {
    setState(() => _busy = true);
    try {
      await ExportService.createBackup();
    } catch (e) {
      if (mounted) toast(context, 'Backup failed: $e');
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _restore() async {
    final r = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['zip']);
    final path = r?.files.single.path;
    if (path == null || !mounted) return;
    final ok = await confirm(
      context,
      title: 'Restore this backup?',
      message: 'All current patients and images on this device will be REPLACED by the backup. This cannot be undone.',
      action: 'Restore',
    );
    if (!ok) return;
    setState(() => _busy = true);
    try {
      final done = await ExportService.restoreBackup(path);
      ref.read(dbTickProvider.notifier).state++;
      if (mounted) toast(context, done ? 'Backup restored' : 'That file is not a UroVault backup');
    } catch (e) {
      if (mounted) toast(context, 'Restore failed: $e');
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return _page('Backup & Restore', [
      _note(Icons.inventory_2_outlined, 'A backup is one .zip file with every patient record and all images. Save it to Drive, email it to yourself, or move it to a laptop.'),
      PrimaryButton(label: 'Create backup', icon: Icons.cloud_upload_outlined, onPressed: _backup, loading: _busy),
      const SizedBox(height: 12),
      OutlineBtn(label: 'Restore from backup', icon: Icons.settings_backup_restore, onPressed: _busy ? null : _restore),
      const SizedBox(height: 20),
      _note(Icons.warning_amber_outlined, 'Backups are not encrypted yet. Keep the file somewhere private.'),
    ]);
  }
}

// ------------------------------------------------------------------ settings

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _bio = false;
  bool _supported = false;
  bool _demo = false;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    _bio = await AuthService.biometricEnabled();
    _supported = await AuthService.deviceSupported();
    _demo = await ref.read(repoProvider).hasDemoData();
    if (mounted) setState(() => _loaded = true);
  }

  Future<void> _toggleBio(bool v) async {
    if (v) {
      final ok = await AuthService.authenticate('Confirm to enable biometric unlock');
      if (!ok) return;
    }
    await AuthService.setBiometricEnabled(v);
    setState(() => _bio = v);
  }

  Future<void> _changePassword() async {
    final cur = TextEditingController();
    final nw = TextEditingController();
    final proceed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        title: const Text('Change password', style: UvText.h2),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: cur, obscureText: true, decoration: uvInput(hint: 'Current password')),
          const SizedBox(height: 10),
          TextField(controller: nw, obscureText: true, decoration: uvInput(hint: 'New password (6+ characters)')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Change', style: TextStyle(color: UvColors.teal, fontWeight: FontWeight.w600))),
        ],
      ),
    );
    if (proceed != true || !mounted) return;
    final id = await AuthService.accountId();
    if (!await AuthService.verify(id, cur.text)) {
      if (mounted) toast(context, 'Current password is incorrect.');
      return;
    }
    if (nw.text.length < 6) {
      if (mounted) toast(context, 'New password must be at least 6 characters.');
      return;
    }
    await AuthService.setPassword(nw.text);
    if (mounted) toast(context, 'Password changed.');
  }

  Future<void> _loadDemo() async {
    await ref.read(repoProvider).loadDemoData();
    setState(() => _demo = true);
    if (mounted) toast(context, 'Sample patients added (UHID starts with DEMO/)');
  }

  Future<void> _removeDemo() async {
    final ok = await confirm(context, title: 'Remove sample data?', message: 'Only the sample patients (UHID DEMO/...) are removed. Real patients are untouched.', action: 'Remove');
    if (!ok) return;
    await ref.read(repoProvider).clearDemoData();
    setState(() => _demo = false);
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded) return _page('Settings', [SizedBox(height: 200, child: loadingView())]);
    return _page('Settings', [
      UvCard(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Column(children: [
          Row(children: [
            const Icon(Icons.fingerprint, color: UvColors.teal),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Biometric unlock', style: UvText.bodyBold),
              Text(_supported ? 'Fingerprint / face / device lock' : 'Not available on this device', style: UvText.small),
            ])),
            Switch(value: _bio, activeColor: UvColors.teal, onChanged: _supported ? _toggleBio : null),
          ]),
          const Divider(height: 1),
          InkWell(
            onTap: _changePassword,
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Row(children: [
                Icon(Icons.key_outlined, color: UvColors.teal),
                SizedBox(width: 12),
                Expanded(child: Text('Change password', style: UvText.bodyBold)),
                Icon(Icons.chevron_right, color: UvColors.textSecondary),
              ]),
            ),
          ),
        ]),
      ),
      const SectionTitle('Sample data'),
      UvCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Adds a few clearly-labelled sample patients (UHID starts with DEMO/) to try the app. They are tagged SAMPLE and can be removed any time without touching real records.', style: UvText.small),
          const SizedBox(height: 12),
          if (_demo) OutlineBtn(label: 'Remove sample data', icon: Icons.delete_outline, onPressed: _removeDemo) else OutlineBtn(label: 'Load sample data', icon: Icons.add, onPressed: _loadDemo),
        ]),
      ),
    ]);
  }
}

// ------------------------------------------------------------------- privacy

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return _page('Privacy & Security', [
      _note(Icons.phone_android_outlined, 'All patient data is stored only on this device. UroVault does not send anything to any server or AI service.'),
      _note(Icons.folder_special_outlined, 'Images and reports are kept in the app\'s private storage, not in your phone gallery.'),
      _note(Icons.key_outlined, 'Your password is salted, hashed and held in the device Keychain / Keystore. Biometric unlock is optional.'),
      _note(Icons.fact_check_outlined, 'Every create, edit and delete is recorded in an audit log (what and when, never clinical text).'),
      const SizedBox(height: 8),
      OutlineBtn(label: 'View audit log', icon: Icons.fact_check_outlined, onPressed: () => go(context, const AuditLogScreen())),
    ]);
  }
}

class AuditLogScreen extends ConsumerWidget {
  const AuditLogScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(auditProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Audit Log')),
      body: ContentWidth(
        child: async.when(
          loading: loadingView,
          error: (e, _) => errorView(e),
          data: (items) => items.isEmpty
              ? const EmptyState(title: 'No activity yet')
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final e = items[i];
                    return ListTile(
                      dense: true,
                      title: Text('${e.action} • ${e.entity}', style: UvText.bodyBold),
                      subtitle: Text('${fmtDateTime(e.ts)}${e.patientId == null ? '' : '  •  patient #${e.patientId}'}', style: UvText.small),
                    );
                  },
                ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------- help

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return _page('Help & Support', [
      const Text('Quick guide', style: UvText.h2),
      const SizedBox(height: 12),
      _note(Icons.person_add_alt_1_outlined, 'Tap + to register a patient: UHID, name, age, sex, chief complaints. Duplicate UHIDs are caught automatically.'),
      _note(Icons.touch_app_outlined, 'Pick the diagnosis with one tap. Paired organs can be marked Right / Left / Bilateral.'),
      _note(Icons.science_outlined, 'Investigations: tick the tests, set dates, attach reports or CT / MRI images.'),
      _note(Icons.photo_camera_outlined, 'Media: take photos or add from the gallery. Pinch to zoom in the viewer.'),
      _note(Icons.event_available_outlined, 'Follow-ups: record notes and photos, then choose the next review date. Due, upcoming and overdue appear in the Follow-ups tab.'),
      _note(Icons.cloud_upload_outlined, 'Back up regularly from More > Backup & Restore. Your data lives only on this device.'),
    ]);
  }
}
