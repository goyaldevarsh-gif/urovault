class Patient {
  final int? id;
  final String uhid;
  final String name;
  final int age;
  final String sex;
  final String chiefComplaints;
  final String? mobile;
  final String? additionalDx;
  final bool isDemo;
  final String createdAt;
  final String updatedAt;
  final String? primaryDx;
  final List<String> dxNames;

  const Patient({
    this.id,
    required this.uhid,
    required this.name,
    required this.age,
    required this.sex,
    required this.chiefComplaints,
    this.mobile,
    this.additionalDx,
    this.isDemo = false,
    this.createdAt = '',
    this.updatedAt = '',
    this.primaryDx,
    this.dxNames = const [],
  });

  factory Patient.fromMap(Map<String, Object?> m) {
    final all = m['all_dx'] as String?;
    return Patient(
      id: m['id'] as int?,
      uhid: m['uhid'] as String,
      name: m['name'] as String,
      age: (m['age'] as int?) ?? 0,
      sex: (m['sex'] as String?) ?? '',
      chiefComplaints: (m['chief_complaints'] as String?) ?? '',
      mobile: m['mobile'] as String?,
      additionalDx: m['additional_dx'] as String?,
      isDemo: ((m['is_demo'] as int?) ?? 0) == 1,
      createdAt: (m['created_at'] as String?) ?? '',
      updatedAt: (m['updated_at'] as String?) ?? '',
      primaryDx: m['primary_dx'] as String?,
      dxNames: (all == null || all.isEmpty) ? const [] : all.split('|'),
    );
  }

  Map<String, Object?> toMap() => {
        'uhid': uhid.trim(),
        'name': name.trim(),
        'age': age,
        'sex': sex,
        'chief_complaints': chiefComplaints.trim(),
        'mobile': (mobile == null || mobile!.trim().isEmpty) ? null : mobile!.trim(),
        'additional_dx': (additionalDx == null || additionalDx!.trim().isEmpty) ? null : additionalDx!.trim(),
        'is_demo': isDemo ? 1 : 0,
      };

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1)).toUpperCase();
  }

  String get ageSex => '$age ${sex.isEmpty ? '' : sex.substring(0, 1)}';
}

class PatientDx {
  final int? id;
  final String name;
  final String? laterality; // Right / Left / Bilateral / null
  final String? detail; // free text (used for "Other")
  final bool isPrimary;
  const PatientDx({this.id, required this.name, this.laterality, this.detail, this.isPrimary = false});

  factory PatientDx.fromMap(Map<String, Object?> m) => PatientDx(
        id: m['id'] as int?,
        name: m['name'] as String,
        laterality: m['laterality'] as String?,
        detail: m['detail'] as String?,
        isPrimary: ((m['is_primary'] as int?) ?? 0) == 1,
      );

  String get label {
    final base = (name == 'Other' && detail != null && detail!.isNotEmpty) ? detail! : name;
    return laterality == null ? base : '$base ($laterality)';
  }
}

class Investigation {
  final int? id;
  final int patientId;
  final String name;
  final String date;
  final String? notes;
  const Investigation({this.id, required this.patientId, required this.name, required this.date, this.notes});

  factory Investigation.fromMap(Map<String, Object?> m) => Investigation(
        id: m['id'] as int?,
        patientId: m['patient_id'] as int,
        name: m['name'] as String,
        date: m['inv_date'] as String,
        notes: m['notes'] as String?,
      );
}

class MediaItem {
  final int? id;
  final int patientId;
  final String path; // relative path inside app documents dir
  final String kind; // image | file
  final String category;
  final String? caption;
  final String takenAt;
  final String? refType; // investigation | surgery | followup | null
  final int? refId;
  const MediaItem({
    this.id,
    required this.patientId,
    required this.path,
    required this.kind,
    required this.category,
    this.caption,
    required this.takenAt,
    this.refType,
    this.refId,
  });

  bool get isImage => kind == 'image';

  factory MediaItem.fromMap(Map<String, Object?> m) => MediaItem(
        id: m['id'] as int?,
        patientId: m['patient_id'] as int,
        path: m['path'] as String,
        kind: (m['kind'] as String?) ?? 'image',
        category: (m['category'] as String?) ?? 'Other',
        caption: m['caption'] as String?,
        takenAt: m['taken_at'] as String,
        refType: m['ref_type'] as String?,
        refId: m['ref_id'] as int?,
      );
}

class Surgery {
  final int? id;
  final int patientId;
  final String procedure;
  final String date;
  final String? indication;
  final String? operativeNotes;
  final String? findings;
  final String? hpe;
  final String? postopInstructions;
  // join fields
  final String? patientName;
  final String? uhid;

  const Surgery({
    this.id,
    required this.patientId,
    required this.procedure,
    required this.date,
    this.indication,
    this.operativeNotes,
    this.findings,
    this.hpe,
    this.postopInstructions,
    this.patientName,
    this.uhid,
  });

  factory Surgery.fromMap(Map<String, Object?> m) => Surgery(
        id: m['id'] as int?,
        patientId: m['patient_id'] as int,
        procedure: m['procedure_name'] as String,
        date: m['surgery_date'] as String,
        indication: m['indication'] as String?,
        operativeNotes: m['operative_notes'] as String?,
        findings: m['findings'] as String?,
        hpe: m['hpe'] as String?,
        postopInstructions: m['postop_instructions'] as String?,
        patientName: m['patient_name'] as String?,
        uhid: m['uhid'] as String?,
      );
}

class FollowUp {
  final int? id;
  final int patientId;
  final String date;
  final String? notes;
  final String? status;
  final bool completed;
  final String? nextDate;
  // join fields
  final String? patientName;
  final String? uhid;
  final String? dx;

  const FollowUp({
    this.id,
    required this.patientId,
    required this.date,
    this.notes,
    this.status,
    this.completed = false,
    this.nextDate,
    this.patientName,
    this.uhid,
    this.dx,
  });

  factory FollowUp.fromMap(Map<String, Object?> m) => FollowUp(
        id: m['id'] as int?,
        patientId: m['patient_id'] as int,
        date: m['fu_date'] as String,
        notes: m['notes'] as String?,
        status: m['status'] as String?,
        completed: ((m['completed'] as int?) ?? 0) == 1,
        nextDate: m['next_date'] as String?,
        patientName: m['patient_name'] as String?,
        uhid: m['uhid'] as String?,
        dx: m['primary_dx'] as String?,
      );
}

class MgmtNote {
  final int? id;
  final int patientId;
  final String note;
  final String createdAt;
  const MgmtNote({this.id, required this.patientId, required this.note, required this.createdAt});

  factory MgmtNote.fromMap(Map<String, Object?> m) => MgmtNote(
        id: m['id'] as int?,
        patientId: m['patient_id'] as int,
        note: m['note'] as String,
        createdAt: m['created_at'] as String,
      );
}

class TimelineEvent {
  final String date;
  final String title;
  final String subtitle;
  final String type; // visit | investigation | surgery | followup | scheduled
  final int tab; // profile tab to open
  const TimelineEvent({required this.date, required this.title, required this.subtitle, required this.type, required this.tab});
}

class AuditEntry {
  final String ts;
  final String action;
  final String entity;
  final int? patientId;
  const AuditEntry({required this.ts, required this.action, required this.entity, this.patientId});
}
