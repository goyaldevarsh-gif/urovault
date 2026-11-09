import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

class AppDb {
  static Database? _db;
  static const fileName = 'urovault.db';

  static Future<String> dbPath() async => p.join(await getDatabasesPath(), fileName);

  static Future<Database> open() async {
    final existing = _db;
    if (existing != null && existing.isOpen) return existing;
    final path = await dbPath();
    _db = await openDatabase(
      path,
      version: 1,
      onConfigure: (db) async {
        await db.execute('PRAGMA foreign_keys = ON');
      },
      onCreate: _create,
    );
    return _db!;
  }

  static Future<void> close() async {
    final d = _db;
    if (d != null && d.isOpen) await d.close();
    _db = null;
  }

  static Future<void> _create(Database db, int version) async {
    await db.execute('''
      CREATE TABLE patients(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uhid TEXT NOT NULL COLLATE NOCASE UNIQUE,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        sex TEXT NOT NULL,
        chief_complaints TEXT NOT NULL,
        mobile TEXT,
        additional_dx TEXT,
        is_demo INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )''');
    await db.execute('''
      CREATE TABLE patient_diagnoses(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        laterality TEXT,
        detail TEXT,
        is_primary INTEGER NOT NULL DEFAULT 0
      )''');
    await db.execute('''
      CREATE TABLE investigations(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        inv_date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL
      )''');
    await db.execute('''
      CREATE TABLE media(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        path TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'image',
        category TEXT NOT NULL DEFAULT 'Other',
        caption TEXT,
        taken_at TEXT NOT NULL,
        ref_type TEXT,
        ref_id INTEGER,
        created_at TEXT NOT NULL
      )''');
    await db.execute('''
      CREATE TABLE surgeries(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        procedure_name TEXT NOT NULL,
        surgery_date TEXT NOT NULL,
        indication TEXT,
        operative_notes TEXT,
        findings TEXT,
        hpe TEXT,
        postop_instructions TEXT,
        created_at TEXT NOT NULL
      )''');
    await db.execute('''
      CREATE TABLE follow_ups(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        fu_date TEXT NOT NULL,
        notes TEXT,
        status TEXT,
        completed INTEGER NOT NULL DEFAULT 0,
        next_date TEXT,
        created_at TEXT NOT NULL
      )''');
    await db.execute('''
      CREATE TABLE management_notes(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        note TEXT NOT NULL,
        created_at TEXT NOT NULL
      )''');
    await db.execute('''
      CREATE TABLE audit_log(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id INTEGER,
        patient_id INTEGER
      )''');
    await db.execute('CREATE INDEX idx_dx_patient ON patient_diagnoses(patient_id)');
    await db.execute('CREATE INDEX idx_inv_patient ON investigations(patient_id)');
    await db.execute('CREATE INDEX idx_media_patient ON media(patient_id)');
    await db.execute('CREATE INDEX idx_surg_patient ON surgeries(patient_id)');
    await db.execute('CREATE INDEX idx_fu_patient ON follow_ups(patient_id)');
    await db.execute('CREATE INDEX idx_fu_date ON follow_ups(fu_date)');
  }
}
