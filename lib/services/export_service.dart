import 'dart:io';

import 'package:archive/archive_io.dart';
import 'package:csv/csv.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';

import '../core/utils.dart';
import '../data/db.dart';
import '../data/file_store.dart';
import '../data/models.dart';
import '../data/repository.dart';

class ExportService {
  static String _stamp() {
    final n = DateTime.now();
    String two(int v) => v.toString().padLeft(2, '0');
    return '${n.year}${two(n.month)}${two(n.day)}_${two(n.hour)}${two(n.minute)}';
  }

  static Future<String> _tmp(String name) async {
    final d = await getTemporaryDirectory();
    return p.join(d.path, name);
  }

  /// CSV of all patients with diagnoses and counts. Shared through the system share sheet.
  static Future<void> exportPatientsCsv(Repo repo) async {
    final patients = await repo.listPatients();
    final rows = <List<dynamic>>[
      ['UHID', 'Name', 'Age', 'Sex', 'Mobile', 'Chief complaints', 'Diagnoses', 'Additional diagnosis', 'Registered'],
    ];
    for (final pt in patients) {
      final dx = await repo.getDiagnoses(pt.id!);
      rows.add([
        pt.uhid,
        pt.name,
        pt.age,
        pt.sex,
        pt.mobile ?? '',
        pt.chiefComplaints,
        dx.map((e) => e.label).join('; '),
        pt.additionalDx ?? '',
        pt.createdAt.isEmpty ? '' : pt.createdAt.substring(0, 10),
      ]);
    }
    final csv = const ListToCsvConverter().convert(rows);
    final path = await _tmp('urovault_patients_${_stamp()}.csv');
    await File(path).writeAsString(csv);
    await Share.shareXFiles([XFile(path)], text: 'UroVault patient list');
  }

  /// One-patient case summary as a simple PDF.
  static Future<void> exportPatientPdf(Repo repo, int pid) async {
    final pt = await repo.getPatient(pid);
    if (pt == null) return;
    final dx = await repo.getDiagnoses(pid);
    final inv = await repo.investigations(pid);
    final surg = await repo.surgeries(pid);
    final fus = await repo.followUpsFor(pid);
    final notes = await repo.notes(pid);

    pw.Widget h(String t) => pw.Padding(padding: const pw.EdgeInsets.only(top: 14, bottom: 4), child: pw.Text(t, style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold)));
    pw.Widget line(String t) => pw.Padding(padding: const pw.EdgeInsets.only(bottom: 3), child: pw.Text(t, style: const pw.TextStyle(fontSize: 10.5)));

    final doc = pw.Document();
    doc.addPage(
      pw.MultiPage(
        margin: const pw.EdgeInsets.all(36),
        build: (ctx) => [
          pw.Text('UroVault - Case Summary', style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 6),
          line('${pt.name}  |  ${pt.age} ${pt.sex}  |  UHID: ${pt.uhid}'),
          line('Generated: ${fmtDateTime(DateTime.now().toIso8601String())}'),
          h('Chief complaints'),
          line(pt.chiefComplaints),
          h('Diagnosis'),
          line(dx.isEmpty ? 'Not recorded' : dx.map((e) => e.label).join(', ')),
          if (pt.additionalDx != null) line('Additional: ${pt.additionalDx}'),
          h('Investigations'),
          if (inv.isEmpty) line('None recorded'),
          for (final i in inv) line('${fmtDate(i.date)}  -  ${i.name}${i.notes == null ? '' : '  (${i.notes})'}'),
          h('Surgery'),
          if (surg.isEmpty) line('None recorded'),
          for (final s in surg) ...[
            line('${fmtDate(s.date)}  -  ${s.procedure}'),
            if (s.indication != null) line('   Indication: ${s.indication}'),
            if (s.operativeNotes != null) line('   Operative notes: ${s.operativeNotes}'),
            if (s.findings != null) line('   Findings: ${s.findings}'),
            if (s.hpe != null) line('   HPE: ${s.hpe}'),
            if (s.postopInstructions != null) line('   Post-op: ${s.postopInstructions}'),
          ],
          h('Management notes'),
          if (notes.isEmpty) line('None recorded'),
          for (final n in notes) line('${fmtDate(n.createdAt)}  -  ${n.note}'),
          h('Follow-up'),
          if (fus.isEmpty) line('None recorded'),
          for (final f in fus)
            line('${fmtDate(f.date)}  -  ${f.completed ? 'Seen' : 'Scheduled'}${f.status == null ? '' : ' (${f.status})'}${f.notes == null ? '' : ': ${f.notes}'}'),
        ],
      ),
    );
    final bytes = await doc.save();
    final safe = pt.uhid.replaceAll(RegExp(r'[^A-Za-z0-9]+'), '_');
    final path = await _tmp('urovault_${safe}_${_stamp()}.pdf');
    await File(path).writeAsBytes(bytes);
    await Share.shareXFiles([XFile(path)], text: 'UroVault case summary');
  }

  // ----------------------------------------------------------------- backup

  /// Zips the database and all private media into one file and opens the share sheet.
  /// NOTE: this zip is not encrypted - store it somewhere safe.
  static Future<void> createBackup() async {
    await AppDb.open(); // make sure the file exists
    final dbFile = File(await AppDb.dbPath());
    final out = await _tmp('urovault_backup_${_stamp()}.zip');
    final enc = ZipFileEncoder();
    enc.create(out);
    await enc.addFile(dbFile, AppDb.fileName);
    final media = Directory(p.join(FileStore.docsPath, 'media'));
    if (await media.exists()) {
      await for (final e in media.list(recursive: true, followLinks: false)) {
        if (e is File) {
          final rel = p.relative(e.path, from: FileStore.docsPath).replaceAll('\\', '/');
          await enc.addFile(e, rel);
        }
      }
    }
    enc.close();
    await Share.shareXFiles([XFile(out)], text: 'UroVault backup');
  }

  /// Restores a backup zip, replacing current data. Returns false if the zip is not a UroVault backup.
  static Future<bool> restoreBackup(String zipPath) async {
    final bytes = await File(zipPath).readAsBytes();
    final archive = ZipDecoder().decodeBytes(bytes);
    final hasDb = archive.files.any((f) => f.isFile && f.name == AppDb.fileName);
    if (!hasDb) return false;

    await AppDb.close();
    final dbPath = await AppDb.dbPath();
    final mediaDir = Directory(p.join(FileStore.docsPath, 'media'));
    if (await mediaDir.exists()) await mediaDir.delete(recursive: true);
    await mediaDir.create(recursive: true);

    for (final f in archive.files) {
      if (!f.isFile) continue;
      final name = f.name.replaceAll('\\', '/');
      final data = f.content as List<int>;
      if (name == AppDb.fileName) {
        final dbFile = File(dbPath);
        for (final suffix in ['-wal', '-shm', '-journal']) {
          final side = File('$dbPath$suffix');
          if (await side.exists()) await side.delete();
        }
        await dbFile.writeAsBytes(data, flush: true);
      } else if (name.startsWith('media/') && !name.contains('..')) {
        final dest = File(p.join(FileStore.docsPath, name));
        await dest.parent.create(recursive: true);
        await dest.writeAsBytes(data, flush: true);
      }
    }
    await AppDb.open();
    return true;
  }
}
