import 'package:sqflite/sqflite.dart';

import '../core/constants.dart';
import '../core/utils.dart';
import 'db.dart';
import 'file_store.dart';
import 'models.dart';

/// All reads/writes go through here. Every write is audit-logged (IDs only, no clinical text).
class Repo {
  Repo(this._notify);
  final void Function() _notify;

  Future<Database> get _db => AppDb.open();

  static const _patientSelect = '''
    SELECT p.*,
      (SELECT name FROM patient_diagnoses d WHERE d.patient_id = p.id ORDER BY d.is_primary DESC, d.id LIMIT 1) AS primary_dx,
      (SELECT group_concat(name, '|') FROM patient_diagnoses d WHERE d.patient_id = p.id) AS all_dx
    FROM patients p''';

  String _now() => DateTime.now().toIso8601String();

  Future<void> _audit(DatabaseExecutor db, String action, String entity, {int? entityId, int? patientId}) async {
    await db.insert('audit_log', {
      'ts': _now(),
      'action': action,
      'entity': entity,
      'entity_id': entityId,
      'patient_id': patientId,
    });
  }

  Future<void> _touch(DatabaseExecutor db, int patientId) async {
    await db.update('patients', {'updated_at': _now()}, where: 'id = ?', whereArgs: [patientId]);
  }

  // ---------------------------------------------------------------- patients

  Future<bool> uhidExists(String uhid, {int? excludeId}) async {
    final db = await _db;
    final rows = await db.query(
      'patients',
      columns: ['id'],
      where: excludeId == null ? 'uhid = ? COLLATE NOCASE' : 'uhid = ? COLLATE NOCASE AND id != ?',
      whereArgs: excludeId == null ? [uhid.trim()] : [uhid.trim(), excludeId],
      limit: 1,
    );
    return rows.isNotEmpty;
  }

  Future<int?> patientIdByUhid(String uhid) async {
    final db = await _db;
    final rows = await db.query('patients', columns: ['id'], where: 'uhid = ? COLLATE NOCASE', whereArgs: [uhid.trim()], limit: 1);
    return rows.isEmpty ? null : rows.first['id'] as int;
  }

  Future<int> createPatient(Patient p) async {
    final db = await _db;
    final now = _now();
    final id = await db.insert('patients', {...p.toMap(), 'created_at': now, 'updated_at': now});
    await _audit(db, 'create', 'patient', entityId: id, patientId: id);
    _notify();
    return id;
  }

  Future<void> updatePatient(Patient p) async {
    final db = await _db;
    await db.update('patients', {...p.toMap(), 'updated_at': _now()}, where: 'id = ?', whereArgs: [p.id]);
    await _audit(db, 'update', 'patient', entityId: p.id, patientId: p.id);
    _notify();
  }

  Future<void> deletePatient(int id) async {
    final db = await _db;
    await FileStore.deletePatientFolder(id);
    await db.delete('patients', where: 'id = ?', whereArgs: [id]);
    await _audit(db, 'delete', 'patient', entityId: id);
    _notify();
  }

  Future<Patient?> getPatient(int id) async {
    final db = await _db;
    final rows = await db.rawQuery('$_patientSelect WHERE p.id = ?', [id]);
    return rows.isEmpty ? null : Patient.fromMap(rows.first);
  }

  Future<List<Patient>> listPatients({String query = '', String filter = 'All', int? limit}) async {
    final db = await _db;
    final q = query.trim();
    final where = q.isEmpty ? '' : 'WHERE p.uhid LIKE ? OR p.name LIKE ?';
    final args = q.isEmpty ? <Object?>[] : <Object?>['%$q%', '%$q%'];
    final rows = await db.rawQuery('$_patientSelect $where ORDER BY p.updated_at DESC', args);
    var list = rows.map(Patient.fromMap).toList();
    if (filter != 'All') {
      list = list.where((p) => matchesGroup(p.dxNames, filter)).toList();
    }
    if (limit != null && list.length > limit) list = list.sublist(0, limit);
    return list;
  }

  // -------------------------------------------------------------- diagnoses

  Future<List<PatientDx>> getDiagnoses(int pid) async {
    final db = await _db;
    final rows = await db.query('patient_diagnoses', where: 'patient_id = ?', whereArgs: [pid], orderBy: 'is_primary DESC, id');
    return rows.map(PatientDx.fromMap).toList();
  }

  /// First item in [list] becomes the primary diagnosis.
  Future<void> setDiagnoses(int pid, List<PatientDx> list, String? additional) async {
    final db = await _db;
    await db.transaction((txn) async {
      await txn.delete('patient_diagnoses', where: 'patient_id = ?', whereArgs: [pid]);
      for (var i = 0; i < list.length; i++) {
        await txn.insert('patient_diagnoses', {
          'patient_id': pid,
          'name': list[i].name,
          'laterality': list[i].laterality,
          'detail': list[i].detail,
          'is_primary': i == 0 ? 1 : 0,
        });
      }
      final add = (additional == null || additional.trim().isEmpty) ? null : additional.trim();
      await txn.update('patients', {'additional_dx': add, 'updated_at': _now()}, where: 'id = ?', whereArgs: [pid]);
      await _audit(txn, 'update', 'diagnosis', patientId: pid);
    });
    _notify();
  }

  // ---------------------------------------------------------- investigations

  Future<List<Investigation>> investigations(int pid) async {
    final db = await _db;
    final rows = await db.query('investigations', where: 'patient_id = ?', whereArgs: [pid], orderBy: 'inv_date DESC, id DESC');
    return rows.map(Investigation.fromMap).toList();
  }

  Future<int> addInvestigation(int pid, String name, String date, String? notes) async {
    final db = await _db;
    final id = await db.insert('investigations', {
      'patient_id': pid,
      'name': name,
      'inv_date': date,
      'notes': (notes == null || notes.trim().isEmpty) ? null : notes.trim(),
      'created_at': _now(),
    });
    await _touch(db, pid);
    await _audit(db, 'create', 'investigation', entityId: id, patientId: pid);
    _notify();
    return id;
  }

  Future<void> updateInvestigation(int id, String date, String? notes) async {
    final db = await _db;
    await db.update('investigations', {'inv_date': date, 'notes': (notes == null || notes.trim().isEmpty) ? null : notes.trim()}, where: 'id = ?', whereArgs: [id]);
    await _audit(db, 'update', 'investigation', entityId: id);
    _notify();
  }

  Future<void> deleteInvestigation(int id) async {
    final db = await _db;
    await _deleteMediaFor(db, 'investigation', id);
    await db.delete('investigations', where: 'id = ?', whereArgs: [id]);
    await _audit(db, 'delete', 'investigation', entityId: id);
    _notify();
  }

  // ------------------------------------------------------------------- media

  Future<List<MediaItem>> media(int pid) async {
    final db = await _db;
    final rows = await db.query('media', where: 'patient_id = ?', whereArgs: [pid], orderBy: 'taken_at DESC, id DESC');
    return rows.map(MediaItem.fromMap).toList();
  }

  Future<List<MediaItem>> mediaFor(String refType, int refId) async {
    final db = await _db;
    final rows = await db.query('media', where: 'ref_type = ? AND ref_id = ?', whereArgs: [refType, refId], orderBy: 'id');
    return rows.map(MediaItem.fromMap).toList();
  }

  Future<int> addMedia({
    required int patientId,
    required String srcPath,
    required String category,
    String? caption,
    String? takenAt,
    String? refType,
    int? refId,
  }) async {
    final db = await _db;
    final rel = await FileStore.save(patientId, srcPath);
    final id = await db.insert('media', {
      'patient_id': patientId,
      'path': rel,
      'kind': isImagePath(srcPath) ? 'image' : 'file',
      'category': category,
      'caption': (caption == null || caption.trim().isEmpty) ? null : caption.trim(),
      'taken_at': takenAt ?? isoDate(DateTime.now()),
      'ref_type': refType,
      'ref_id': refId,
      'created_at': _now(),
    });
    await _touch(db, patientId);
    await _audit(db, 'create', 'media', entityId: id, patientId: patientId);
    _notify();
    return id;
  }

  Future<void> updateMedia(int id, String category, String? caption) async {
    final db = await _db;
    await db.update('media', {'category': category, 'caption': (caption == null || caption.trim().isEmpty) ? null : caption.trim()}, where: 'id = ?', whereArgs: [id]);
    await _audit(db, 'update', 'media', entityId: id);
    _notify();
  }

  Future<void> deleteMedia(MediaItem m) async {
    final db = await _db;
    await FileStore.delete(m.path);
    await db.delete('media', where: 'id = ?', whereArgs: [m.id]);
    await _audit(db, 'delete', 'media', entityId: m.id, patientId: m.patientId);
    _notify();
  }

  Future<void> _deleteMediaFor(DatabaseExecutor db, String refType, int refId) async {
    final rows = await db.query('media', where: 'ref_type = ? AND ref_id = ?', whereArgs: [refType, refId]);
    for (final r in rows) {
      await FileStore.delete(r['path'] as String);
    }
    await db.delete('media', where: 'ref_type = ? AND ref_id = ?', whereArgs: [refType, refId]);
  }

  // --------------------------------------------------------------- surgeries

  static const _surgerySelect = '''
    SELECT s.*, p.name AS patient_name, p.uhid AS uhid
    FROM surgeries s JOIN patients p ON p.id = s.patient_id''';

  Future<List<Surgery>> surgeries(int pid) async {
    final db = await _db;
    final rows = await db.rawQuery('$_surgerySelect WHERE s.patient_id = ? ORDER BY s.surgery_date DESC, s.id DESC', [pid]);
    return rows.map(Surgery.fromMap).toList();
  }

  Future<List<Surgery>> allSurgeries({int? limit}) async {
    final db = await _db;
    final rows = await db.rawQuery('$_surgerySelect ORDER BY s.surgery_date DESC, s.id DESC ${limit == null ? '' : 'LIMIT $limit'}');
    return rows.map(Surgery.fromMap).toList();
  }

  Future<int> saveSurgery(Surgery s) async {
    final db = await _db;
    String? nn(String? v) => (v == null || v.trim().isEmpty) ? null : v.trim();
    final values = <String, Object?>{
      'patient_id': s.patientId,
      'procedure_name': s.procedure.trim(),
      'surgery_date': s.date,
      'indication': nn(s.indication),
      'operative_notes': nn(s.operativeNotes),
      'findings': nn(s.findings),
      'hpe': nn(s.hpe),
      'postop_instructions': nn(s.postopInstructions),
    };
    int id;
    if (s.id == null) {
      id = await db.insert('surgeries', {...values, 'created_at': _now()});
      await _audit(db, 'create', 'surgery', entityId: id, patientId: s.patientId);
    } else {
      id = s.id!;
      await db.update('surgeries', values, where: 'id = ?', whereArgs: [id]);
      await _audit(db, 'update', 'surgery', entityId: id, patientId: s.patientId);
    }
    await _touch(db, s.patientId);
    _notify();
    return id;
  }

  Future<void> deleteSurgery(int id) async {
    final db = await _db;
    await _deleteMediaFor(db, 'surgery', id);
    await db.delete('surgeries', where: 'id = ?', whereArgs: [id]);
    await _audit(db, 'delete', 'surgery', entityId: id);
    _notify();
  }

  // --------------------------------------------------------------- follow-ups

  static const _fuSelect = '''
    SELECT f.*, p.name AS patient_name, p.uhid AS uhid,
      (SELECT name FROM patient_diagnoses d WHERE d.patient_id = p.id ORDER BY d.is_primary DESC, d.id LIMIT 1) AS primary_dx
    FROM follow_ups f JOIN patients p ON p.id = f.patient_id''';

  Future<List<FollowUp>> followUpsFor(int pid) async {
    final db = await _db;
    final rows = await db.rawQuery('$_fuSelect WHERE f.patient_id = ? ORDER BY f.fu_date DESC, f.id DESC', [pid]);
    return rows.map(FollowUp.fromMap).toList();
  }

  /// filter: Due Today | Upcoming | Overdue | Completed
  Future<List<FollowUp>> followUpsByFilter(String filter) async {
    final db = await _db;
    final t = isoDate(today());
    String where;
    String order;
    switch (filter) {
      case 'Due Today':
        where = 'f.completed = 0 AND f.fu_date = ?';
        order = 'p.name';
        break;
      case 'Upcoming':
        where = 'f.completed = 0 AND f.fu_date > ?';
        order = 'f.fu_date ASC';
        break;
      case 'Overdue':
        where = 'f.completed = 0 AND f.fu_date < ?';
        order = 'f.fu_date ASC';
        break;
      default:
        where = 'f.completed = 1 AND ? IS NOT NULL';
        order = 'f.fu_date DESC, f.id DESC';
    }
    final rows = await db.rawQuery('$_fuSelect WHERE $where ORDER BY $order', [t]);
    return rows.map(FollowUp.fromMap).toList();
  }

  Future<Map<String, int>> followUpCounts() async {
    final db = await _db;
    final t = isoDate(today());
    Future<int> c(String where, List<Object?> a) async {
      final r = await db.rawQuery('SELECT COUNT(*) AS c FROM follow_ups f WHERE $where', a);
      return (r.first['c'] as int?) ?? 0;
    }

    return {
      'Due Today': await c('f.completed = 0 AND f.fu_date = ?', [t]),
      'Upcoming': await c('f.completed = 0 AND f.fu_date > ?', [t]),
      'Overdue': await c('f.completed = 0 AND f.fu_date < ?', [t]),
      'Completed': await c('f.completed = 1', []),
    };
  }

  Future<List<FollowUp>> pendingFollowUps({int? limit}) async {
    final db = await _db;
    final rows = await db.rawQuery('$_fuSelect WHERE f.completed = 0 ORDER BY f.fu_date ASC ${limit == null ? '' : 'LIMIT $limit'}');
    return rows.map(FollowUp.fromMap).toList();
  }

  /// Records a visit (completed follow-up). If [existingId] is a pending entry it is completed in place.
  /// A patient keeps a single active "next follow-up": saving a new visit replaces any pending one.
  Future<int> saveVisit({
    int? existingId,
    required int patientId,
    required String date,
    String? notes,
    String? status,
    String? nextDate,
  }) async {
    final db = await _db;
    String? nn(String? v) => (v == null || v.trim().isEmpty) ? null : v.trim();
    late int id;
    await db.transaction((txn) async {
      bool editingCompleted = false;
      if (existingId != null) {
        final r = await txn.query('follow_ups', columns: ['completed'], where: 'id = ?', whereArgs: [existingId]);
        editingCompleted = r.isNotEmpty && ((r.first['completed'] as int?) ?? 0) == 1;
      }
      if (existingId != null) {
        id = existingId;
        await txn.update(
          'follow_ups',
          {'fu_date': date, 'notes': nn(notes), 'status': status, 'completed': 1, 'next_date': nextDate},
          where: 'id = ?',
          whereArgs: [id],
        );
      } else {
        id = await txn.insert('follow_ups', {
          'patient_id': patientId,
          'fu_date': date,
          'notes': nn(notes),
          'status': status,
          'completed': 1,
          'next_date': nextDate,
          'created_at': _now(),
        });
      }
      if (!editingCompleted) {
        await txn.delete('follow_ups', where: 'patient_id = ? AND completed = 0 AND id != ?', whereArgs: [patientId, id]);
        if (nextDate != null) {
          await txn.insert('follow_ups', {
            'patient_id': patientId,
            'fu_date': nextDate,
            'completed': 0,
            'created_at': _now(),
          });
        }
      }
      await txn.update('patients', {'updated_at': _now()}, where: 'id = ?', whereArgs: [patientId]);
      await _audit(txn, existingId == null ? 'create' : 'update', 'followup', entityId: id, patientId: patientId);
    });
    _notify();
    return id;
  }

  /// Schedules the next follow-up directly (replaces any pending one).
  Future<void> scheduleFollowUp(int patientId, String date) async {
    final db = await _db;
    await db.transaction((txn) async {
      await txn.delete('follow_ups', where: 'patient_id = ? AND completed = 0', whereArgs: [patientId]);
      final id = await txn.insert('follow_ups', {'patient_id': patientId, 'fu_date': date, 'completed': 0, 'created_at': _now()});
      await _audit(txn, 'create', 'followup', entityId: id, patientId: patientId);
    });
    _notify();
  }

  Future<void> deleteFollowUp(int id) async {
    final db = await _db;
    await _deleteMediaFor(db, 'followup', id);
    await db.delete('follow_ups', where: 'id = ?', whereArgs: [id]);
    await _audit(db, 'delete', 'followup', entityId: id);
    _notify();
  }

  // ------------------------------------------------------------------- notes

  Future<List<MgmtNote>> notes(int pid) async {
    final db = await _db;
    final rows = await db.query('management_notes', where: 'patient_id = ?', whereArgs: [pid], orderBy: 'created_at DESC, id DESC');
    return rows.map(MgmtNote.fromMap).toList();
  }

  Future<void> addNote(int pid, String note) async {
    final db = await _db;
    final id = await db.insert('management_notes', {'patient_id': pid, 'note': note.trim(), 'created_at': _now()});
    await _touch(db, pid);
    await _audit(db, 'create', 'note', entityId: id, patientId: pid);
    _notify();
  }

  Future<void> deleteNote(int id) async {
    final db = await _db;
    await db.delete('management_notes', where: 'id = ?', whereArgs: [id]);
    await _audit(db, 'delete', 'note', entityId: id);
    _notify();
  }

  // ---------------------------------------------------------------- timeline

  Future<List<TimelineEvent>> timeline(int pid) async {
    final p = await getPatient(pid);
    if (p == null) return [];
    final events = <TimelineEvent>[];
    final created = p.createdAt.isEmpty ? isoDate(today()) : p.createdAt.substring(0, 10);
    events.add(TimelineEvent(date: created, title: 'Initial visit', subtitle: p.chiefComplaints, type: 'visit', tab: 0));
    for (final i in await investigations(pid)) {
      events.add(TimelineEvent(date: i.date, title: i.name, subtitle: i.notes ?? 'Investigation', type: 'investigation', tab: 2));
    }
    for (final s in await surgeries(pid)) {
      events.add(TimelineEvent(date: s.date, title: 'Surgery - ${s.procedure}', subtitle: s.indication ?? '', type: 'surgery', tab: 3));
    }
    for (final f in await followUpsFor(pid)) {
      if (f.completed) {
        events.add(TimelineEvent(date: f.date, title: 'Follow-up', subtitle: f.notes ?? (f.status ?? ''), type: 'followup', tab: 4));
      } else {
        events.add(TimelineEvent(date: f.date, title: 'Follow-up scheduled', subtitle: relativeDays(f.date), type: 'scheduled', tab: 4));
      }
    }
    events.sort((a, b) => a.date.compareTo(b.date));
    return events;
  }

  // ------------------------------------------------------------------- stats

  Future<Map<String, int>> counts() async {
    final db = await _db;
    Future<int> c(String sql, [List<Object?> a = const []]) async {
      final r = await db.rawQuery(sql, a);
      return (r.first['c'] as int?) ?? 0;
    }

    final t = isoDate(today());
    return {
      'patients': await c('SELECT COUNT(*) AS c FROM patients'),
      'surgeries': await c('SELECT COUNT(*) AS c FROM surgeries'),
      'investigations': await c('SELECT COUNT(*) AS c FROM investigations'),
      'media': await c('SELECT COUNT(*) AS c FROM media'),
      'followups': await c('SELECT COUNT(*) AS c FROM follow_ups WHERE completed = 1'),
      'due': await c('SELECT COUNT(*) AS c FROM follow_ups WHERE completed = 0 AND fu_date <= ?', [t]),
    };
  }

  Future<List<MapEntry<String, int>>> dxStats() async {
    final db = await _db;
    final rows = await db.rawQuery('SELECT name, COUNT(DISTINCT patient_id) AS c FROM patient_diagnoses GROUP BY name ORDER BY c DESC');
    return rows.map((r) => MapEntry(r['name'] as String, (r['c'] as int?) ?? 0)).toList();
  }

  Future<List<AuditEntry>> auditLog({int limit = 200}) async {
    final db = await _db;
    final rows = await db.query('audit_log', orderBy: 'id DESC', limit: limit);
    return rows
        .map((r) => AuditEntry(
              ts: r['ts'] as String,
              action: r['action'] as String,
              entity: r['entity'] as String,
              patientId: r['patient_id'] as int?,
            ))
        .toList();
  }

  // -------------------------------------------------------------- demo data

  Future<bool> hasDemoData() async {
    final db = await _db;
    final r = await db.rawQuery('SELECT COUNT(*) AS c FROM patients WHERE is_demo = 1');
    return ((r.first['c'] as int?) ?? 0) > 0;
  }

  /// Sample records, flagged is_demo = 1 and UHID-prefixed "DEMO/" so they are never mistaken for real patients.
  Future<void> loadDemoData() async {
    if (await hasDemoData()) return;
    final t = today();
    String d(int offsetDays) => isoDate(t.add(Duration(days: offsetDays)));

    Future<int> mk(String uhid, String name, int age, String sex, String cc, List<PatientDx> dx) async {
      final id = await createPatient(Patient(uhid: uhid, name: name, age: age, sex: sex, chiefComplaints: cc, isDemo: true));
      await setDiagnoses(id, dx, null);
      return id;
    }

    final a = await mk('DEMO/2026/001', 'Demo Patient A', 58, 'Male', 'Hematuria for 2 weeks', [const PatientDx(name: 'Ca Bladder')]);
    await addInvestigation(a, 'RFT', d(-20), null);
    await addInvestigation(a, 'CBC', d(-20), null);
    await addInvestigation(a, 'CT', d(-19), 'Sample entry');
    await saveSurgery(Surgery(patientId: a, procedure: 'TURBT', date: d(-14), indication: 'Ca bladder - diagnostic and therapeutic', operativeNotes: 'Sample operative note.', hpe: 'Sample HPE entry'));
    await saveVisit(patientId: a, date: d(-3), notes: 'Sample follow-up note.', status: 'Stable', nextDate: d(0));

    final b = await mk('DEMO/2026/002', 'Demo Patient B', 46, 'Male', 'Right flank pain for 1 month', [const PatientDx(name: 'Renal Stone', laterality: 'Right')]);
    await addInvestigation(b, 'Urine Analysis', d(-5), null);
    await scheduleFollowUp(b, d(6));

    final c = await mk('DEMO/2026/003', 'Demo Patient C', 62, 'Male', 'Poor stream, nocturia', [const PatientDx(name: 'Prostate CA')]);
    await addInvestigation(c, 'PSA', d(-8), null);
    await scheduleFollowUp(c, d(-4));

    final e = await mk('DEMO/2026/004', 'Demo Patient D', 34, 'Female', 'Left loin pain', [const PatientDx(name: 'PUJO', laterality: 'Left')]);
    await addInvestigation(e, 'DTPA', d(-2), null);
    await scheduleFollowUp(e, d(21));
  }

  Future<void> clearDemoData() async {
    final db = await _db;
    final rows = await db.query('patients', columns: ['id'], where: 'is_demo = 1');
    for (final r in rows) {
      await FileStore.deletePatientFolder(r['id'] as int);
    }
    await db.delete('patients', where: 'is_demo = 1');
    await _audit(db, 'delete', 'demo_data');
    _notify();
  }
}
